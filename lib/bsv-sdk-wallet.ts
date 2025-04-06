import { PrivateKey, Random, Transaction, P2PKH } from '@bsv/sdk'


interface NormalizedUtxo {
  satoshis: number;
  txid: string;
  vout: number;
}

const normalizeUTXOs = (utxos: any[]): any[] => {
    return utxos.map((utxo) => {
        return {
            satoshis: utxo?.value || utxo?.satoshis,
            txid: utxo?.txid || utxo.tx_hash,
            vout: utxo.vout === undefined ? utxo.tx_pos : utxo.vout
        }
    })
}

export const getWalletBalance = async(address = localStorage.walletAddress): Promise<number> => {
    const utxos = await btUTXOs(address);

    console.log(utxos)

    const balance = utxos.reduce(((t, e) => t + e.satoshis), 0)
    return balance; 
}

const btUTXOs = async (address: string) => {
    const utxos: NormalizedUtxo[] = []
    if (!utxos.length) {
        console.log(`Calling Bitails UTXOs endpoint...`);
        const r = await fetch(`https://api.bitails.io/address/${address}/unspent`);
        const { unspent } = await r.json();
        return normalizeUTXOs(unspent);
    } else { return utxos }
} 

export const getPaymentUTXOs = async(address: string, amount: number) => {
    const utxos = await btUTXOs(address);
    const script = new P2PKH().lock(address);
    let cache = [], satoshis = 0;
    for (let utxo of utxos) {
        if (utxo.satoshis > 1) {
            const foundUtxo = utxos.find(utxo => utxo.satoshis >= amount + 2);
            if (foundUtxo) {
                return [{ satoshis: foundUtxo.satoshis, vout: foundUtxo.vout, txid: foundUtxo.txid, script: script.toHex() }]
            }
            cache.push(utxo);
            if (amount) {
                satoshis = cache.reduce((a, curr) => { return a + curr.satoshis }, 0);
                if (satoshis >= amount) {
                    return cache.map(utxo => {
                        return { satoshis: utxo.satoshis, vout: utxo.vout, txid: utxo.txid, script: script.toHex() }
                    });
                }
            } else {
                return utxos.map(utxo => {
                    return { satoshis: utxo.satoshis, vout: utxo.vout, txid: utxo.txid, script: script.toHex() }
                });
            }
        }
    }
    return [];
}

const getRawtx = async (txid: string): Promise<string> => {
    const r = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`);
    return await r.text();
};

export const newPK = () => {
    const pk = new PrivateKey(Random(32));
    const pkWIF = pk.toWif();
    return pkWIF;
} 

export const restoreWallet = (oPK: string, pPk: string) => {
  // Create PrivateKey instances from the WIF strings
  const pk = PrivateKey.fromWif(pPk);
  const ownerPk = PrivateKey.fromWif(oPK);

  // Get the addresses associated with the private keys
  const address = pk.toAddress().toString(); // Use toString() for string representation
  const ownerAddress = ownerPk.toAddress().toString(); // Use toString()

  // Store the keys and addresses in localStorage
  localStorage.ownerKey = ownerPk.toWif();
  localStorage.ownerAddress = ownerAddress;
  localStorage.walletAddress = address;
  localStorage.walletKey = pk.toWif();

  // Get the owner's public key in hex format
  localStorage.ownerPublicKey = ownerPk.toPublicKey().toString();
}; 

// Constants used in payForRawTx, assuming they are applicable here too
const P2PKH_INPUT_SIZE_ESTIMATE = 148; // Rough estimate
const P2PKH_OUTPUT_SIZE_ESTIMATE = 34; // Rough estimate (for change)
const FEE_FACTOR = 0.05; // Example fee rate (sats/byte) - align with shuallet if possible

/**
 * Takes a raw transaction hex, adds inputs to fund it using the app's private key,
 * adds a change output, signs the new inputs, and returns the resulting transaction hex.
 * Uses @bsv/sdk for transaction construction and signing.
 * Replicates the funding logic of payForRawTx for the app's wallet.
 *
 * @param rawTxHex The hex string of the transaction to pay for.
 * @param appKeyWIF The WIF private key of the app wallet providing the funds.
 * @returns Promise<string> The hex string of the funded and signed transaction.
 * @throws Error if UTXOs cannot be found, are insufficient, or other API/SDK errors occur.
 */
export const appPayForRawTx = async (
    rawTxHex: string,
    appKeyWIF: string
): Promise<string> => {
    // 1. Deserialize the raw transaction
    const tx = Transaction.fromHex(rawTxHex);

    // 2. Get app's key objects and address
    const appPrivateKey = PrivateKey.fromWif(appKeyWIF);
    const appAddress = appPrivateKey.toAddress(); // Address object
    const appAddressString = appAddress.toString();
    // App pays change back to itself
    const changeAddressString = appAddressString;

    // 3. Calculate satoshis needed for existing outputs
    const existingOutputSatoshis = tx.outputs.reduce((sum, output) => sum + (output.satoshis ?? 0), 0); // Handle potentially undefined satoshis

    // --- Fee Estimation (Mirroring payForRawTx logic) ---
    const baseTxBytes = Buffer.from(rawTxHex, 'hex').length;
    // Estimate fee for *at least* one input and one change output initially
    let estimatedFee = Math.ceil((baseTxBytes + P2PKH_INPUT_SIZE_ESTIMATE + P2PKH_OUTPUT_SIZE_ESTIMATE) * FEE_FACTOR) + 1;
    let amountNeeded = existingOutputSatoshis + estimatedFee;

    console.log(`[AppPay] Need approx ${existingOutputSatoshis} (outputs) + ${estimatedFee} (estimated fee) = ${amountNeeded} satoshis`);

    // 4. Fetch and select UTXOs using getPaymentUTXOs
    console.log(`[AppPay] Calling getPaymentUTXOs for ${appAddressString} needing ${amountNeeded} sats...`);
    const utxosToSpend = await getPaymentUTXOs(appAddressString, amountNeeded);

    if (!utxosToSpend || utxosToSpend.length === 0) {
        throw new Error(`[AppPay] Insufficient funds or no UTXOs found for address ${appAddressString} to cover ${amountNeeded} satoshis.`);
    }
    console.log(`[AppPay] Selected ${utxosToSpend.length} UTXOs.`);

    // Calculate the total satoshis coming from the selected inputs
    const selectedInputSatoshis = utxosToSpend.reduce(((t, e) => t + e.satoshis), 0);

    // --- Re-estimate fee based on actual number of inputs selected ---
    estimatedFee = Math.ceil((baseTxBytes + (utxosToSpend.length * P2PKH_INPUT_SIZE_ESTIMATE) + P2PKH_OUTPUT_SIZE_ESTIMATE) * FEE_FACTOR) + 1;
    console.log(`[AppPay] Re-estimated fee with ${utxosToSpend.length} inputs: ${estimatedFee} satoshis`);

    // Basic check before proceeding
    if (selectedInputSatoshis < existingOutputSatoshis + estimatedFee) {
        console.warn(`[AppPay] Selected input satoshis (${selectedInputSatoshis}) might be less than outputs (${existingOutputSatoshis}) + re-estimated fee (${estimatedFee}). Final check pending.`);
        if (selectedInputSatoshis < existingOutputSatoshis) {
            throw new Error(`[AppPay] Catastrophic error: Selected input satoshis (${selectedInputSatoshis}) is less than output satoshis (${existingOutputSatoshis}).`);
        }
    }

    // 5. Fetch source transaction hex and add inputs
    console.log(`[AppPay] Fetching source transaction hex for ${utxosToSpend.length} selected UTXOs...`);
    for (const utxo of utxosToSpend) {
        try {
            console.log(`[AppPay] Fetching rawtx for ${utxo.txid}...`);
            const sourceTxHex = await getRawtx(utxo.txid);
             if (!sourceTxHex) {
                 throw new Error(`getRawtx returned empty for ${utxo.txid}`);
            }
            const sourceTx = Transaction.fromHex(sourceTxHex);

            tx.addInput({
                sourceTransaction: sourceTx,
                sourceOutputIndex: utxo.vout,
                unlockingScriptTemplate: new P2PKH().unlock(appPrivateKey) // Use app key to unlock
            });
            console.log(`[AppPay] Added input from ${utxo.txid}:${utxo.vout} (${utxo.satoshis} sats)`);
        } catch (error: any) { // Catch as any or unknown and check type
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[AppPay] Failed to process UTXO ${utxo.txid}:${utxo.vout}`, error);
            throw new Error(`[AppPay] Failed to fetch or process source transaction for UTXO ${utxo.txid}:${utxo.vout}. Error: ${errorMessage}`);
        }
    }

    // 6. Add a change output if necessary (tentative)
    const tentativeChangeAmount = selectedInputSatoshis - existingOutputSatoshis - estimatedFee;
    console.log(`[AppPay] Tentative change amount: ${selectedInputSatoshis} - ${existingOutputSatoshis} - ${estimatedFee} = ${tentativeChangeAmount}`);

    if (tentativeChangeAmount > 0) { // Use dust limit? 1 sat is fine for now
        tx.addOutput({
            lockingScript: new P2PKH().lock(changeAddressString), // Use app address for change
            change: true // Mark this output for fee adjustment
        });
        console.log(`[AppPay] Added placeholder change output to ${changeAddressString}. Amount will be set by tx.fee().`);
    } else {
        console.log("[AppPay] Calculated change is zero or negative based on estimate, not adding change output yet.");
    }

    // 7. Calculate the transaction fee accurately and adjust change
    console.log("[AppPay] Calculating final fee and adjusting change output...");
    await tx.fee(FEE_FACTOR); // Use the same fee rate

    const changeOutput = tx.outputs.find(o => o.change);
    if (changeOutput) {
         const changeSats = changeOutput.satoshis ?? -1; // Default to -1 if undefined to trigger error
         if (changeSats < 0) {
            throw new Error(`[AppPay] Insufficient funds after final fee calculation. Need ${-changeSats} more satoshis.`);
        } else if (changeSats === 0) {
            console.log("[AppPay] Change output became 0 after fee calculation.");
            // Optional: Remove the dust output if needed tx.outputs.pop();
        } else {
            const finalFee = selectedInputSatoshis - existingOutputSatoshis - changeSats;
            console.log(`[AppPay] Final calculated fee: ${finalFee} satoshis`);
            console.log(`[AppPay] Final change output amount: ${changeSats} satoshis`);
        }
    } else {
        const estimatedFinalFee = selectedInputSatoshis - existingOutputSatoshis;
         if (estimatedFinalFee < 0) {
             throw new Error(`[AppPay] Insufficient funds after final fee calculation (no change output). Need ${-estimatedFinalFee} more satoshis for fee.`);
         }
         console.log(`[AppPay] No change output added or needed. Estimated fee: ${estimatedFinalFee} satoshis.`);
    }

    // 8. Sign the transaction's new inputs
    console.log("[AppPay] Signing added inputs...");
    await tx.sign();

    // 9. Return the fully constructed and signed transaction hex
    const finalTxHex = tx.toHex();
    console.log("[AppPay] Transaction funded and signed successfully.");
    return finalTxHex;
};

/**
 * Takes a raw transaction hex, adds inputs to fund it using the user's private key
 * from localStorage, adds a change output, signs the new inputs, and returns the
 * resulting transaction hex. Uses @bsv/sdk for transaction construction and signing.
 *
 * @param rawTxHex The hex string of the transaction to pay for.
 * @returns Promise<string> The hex string of the funded and signed transaction.
 * @throws Error if wallet keys are not found, UTXOs cannot be found, are insufficient, or other API/SDK errors occur.
 */
export const payForRawTx = async (
    rawTxHex: string
): Promise<string> => {
    // 1. Get user's key objects and address from localStorage
    const userKeyWIF = localStorage.getItem('walletKey');
    const userAddressString = localStorage.getItem('walletAddress');

    if (!userKeyWIF || !userAddressString) {
        throw new Error("[WalletPay] User wallet key or address not found in localStorage.");
    }

    const userPrivateKey = PrivateKey.fromWif(userKeyWIF);
    // User pays change back to themselves
    const changeAddressString = userAddressString;

    // 2. Deserialize the raw transaction
    const tx = Transaction.fromHex(rawTxHex);

    // 3. Calculate satoshis needed for existing outputs
    const existingOutputSatoshis = tx.outputs.reduce((sum, output) => sum + (output.satoshis ?? 0), 0);

    // --- Fee Estimation (Mirroring appPayForRawTx logic) ---
    const baseTxBytes = Buffer.from(rawTxHex, 'hex').length;
    // Estimate fee for *at least* one input and one change output initially
    let estimatedFee = Math.ceil((baseTxBytes + P2PKH_INPUT_SIZE_ESTIMATE + P2PKH_OUTPUT_SIZE_ESTIMATE) * FEE_FACTOR) + 1;
    let amountNeeded = existingOutputSatoshis + estimatedFee;

    console.log(`[WalletPay] Need approx ${existingOutputSatoshis} (outputs) + ${estimatedFee} (estimated fee) = ${amountNeeded} satoshis for address ${userAddressString}`);

    // 4. Fetch and select UTXOs using getPaymentUTXOs
    console.log(`[WalletPay] Calling getPaymentUTXOs for ${userAddressString} needing ${amountNeeded} sats...`);
    const utxosToSpend = await getPaymentUTXOs(userAddressString, amountNeeded);

    if (!utxosToSpend || utxosToSpend.length === 0) {
        throw new Error(`[WalletPay] Insufficient funds or no UTXOs found for address ${userAddressString} to cover ${amountNeeded} satoshis.`);
    }
    console.log(`[WalletPay] Selected ${utxosToSpend.length} UTXOs.`);

    // Calculate the total satoshis coming from the selected inputs
    const selectedInputSatoshis = utxosToSpend.reduce(((t, e) => t + e.satoshis), 0);

    // --- Re-estimate fee based on actual number of inputs selected ---
    estimatedFee = Math.ceil((baseTxBytes + (utxosToSpend.length * P2PKH_INPUT_SIZE_ESTIMATE) + P2PKH_OUTPUT_SIZE_ESTIMATE) * FEE_FACTOR) + 1;
    console.log(`[WalletPay] Re-estimated fee with ${utxosToSpend.length} inputs: ${estimatedFee} satoshis`);

    // Basic check before proceeding
    if (selectedInputSatoshis < existingOutputSatoshis + estimatedFee) {
        console.warn(`[WalletPay] Selected input satoshis (${selectedInputSatoshis}) might be less than outputs (${existingOutputSatoshis}) + re-estimated fee (${estimatedFee}). Final check pending.`);
        if (selectedInputSatoshis < existingOutputSatoshis) {
            throw new Error(`[WalletPay] Catastrophic error: Selected input satoshis (${selectedInputSatoshis}) is less than output satoshis (${existingOutputSatoshis}).`);
        }
    }

    // 5. Fetch source transaction hex and add inputs
    console.log(`[WalletPay] Fetching source transaction hex for ${utxosToSpend.length} selected UTXOs...`);
    for (const utxo of utxosToSpend) {
        try {
            console.log(`[WalletPay] Fetching rawtx for ${utxo.txid}...`);
            const sourceTxHex = await getRawtx(utxo.txid);
             if (!sourceTxHex) {
                 throw new Error(`getRawtx returned empty for ${utxo.txid}`);
            }
            const sourceTx = Transaction.fromHex(sourceTxHex);

            tx.addInput({
                sourceTransaction: sourceTx,
                sourceOutputIndex: utxo.vout,
                unlockingScriptTemplate: new P2PKH().unlock(userPrivateKey) // Use user's key
            });
            console.log(`[WalletPay] Added input from ${utxo.txid}:${utxo.vout} (${utxo.satoshis} sats)`);
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[WalletPay] Failed to process UTXO ${utxo.txid}:${utxo.vout}`, error);
            throw new Error(`[WalletPay] Failed to fetch or process source transaction for UTXO ${utxo.txid}:${utxo.vout}. Error: ${errorMessage}`);
        }
    }

    // 6. Add a change output if necessary
    const tentativeChangeAmount = selectedInputSatoshis - existingOutputSatoshis - estimatedFee;
    console.log(`[WalletPay] Tentative change amount: ${selectedInputSatoshis} - ${existingOutputSatoshis} - ${estimatedFee} = ${tentativeChangeAmount}`);

    if (tentativeChangeAmount > 0) {
        tx.addOutput({
            lockingScript: new P2PKH().lock(changeAddressString), // Use user's address for change
            change: true
        });
        console.log(`[WalletPay] Added placeholder change output to ${changeAddressString}. Amount will be set by tx.fee().`);
    } else {
        console.log("[WalletPay] Calculated change is zero or negative based on estimate, not adding change output yet.");
    }

    // 7. Calculate the transaction fee accurately and adjust change
    console.log("[WalletPay] Calculating final fee and adjusting change output...");
    await tx.fee(FEE_FACTOR); // Use the same fee rate

    const minFee = 2; // Define the minimum fee
    const changeOutput = tx.outputs.find(o => o.change);

    if (changeOutput) {
         let changeSats = changeOutput.satoshis ?? -1;
         if (changeSats < 0) {
            // This means tx.fee() determined insufficient funds BEFORE our minFee check
            throw new Error(`[WalletPay] Insufficient funds after initial fee calculation by SDK. Need ${-changeSats} more satoshis.`);
        }

        const sdkCalculatedFee = selectedInputSatoshis - existingOutputSatoshis - changeSats;
        console.log(`[WalletPay] SDK calculated fee: ${sdkCalculatedFee} satoshis`);

        if (sdkCalculatedFee < minFee) {
            console.log(`[WalletPay] SDK calculated fee (${sdkCalculatedFee}) is less than minimum (${minFee}). Attempting to increase fee.`);
            const feeDeficit = minFee - sdkCalculatedFee;
            if (changeSats >= feeDeficit) {
                changeSats -= feeDeficit; // Reduce change to cover the fee deficit
                changeOutput.satoshis = changeSats; // Update the output
                console.log(`[WalletPay] Increased fee to ${minFee} satoshis. New change amount: ${changeSats} satoshis.`);
                if (changeSats === 0) {
                     console.log("[WalletPay] Change output became 0 after minimum fee adjustment.");
                     // Optional: Remove the dust output if sdk allows: tx.outputs.pop();
                }
            } else {
                // Not enough change to meet the minimum fee
                 throw new Error(`[WalletPay] Insufficient funds to meet the minimum fee of ${minFee}. Required additional ${feeDeficit} satoshis, but only ${changeSats} change available.`);
            }
        }

        // Log final state
        const finalFee = selectedInputSatoshis - existingOutputSatoshis - changeSats;
        console.log(`[WalletPay] Final calculated fee: ${finalFee} satoshis`);
        console.log(`[WalletPay] Final change output amount: ${changeSats} satoshis`);

    } else {
        // No change output was added, meaning inputs only cover outputs + estimated fee
        const estimatedFinalFee = selectedInputSatoshis - existingOutputSatoshis;
         if (estimatedFinalFee < 0) {
             // This case should ideally be caught earlier, but double-check
             throw new Error(`[WalletPay] Insufficient funds: Inputs (${selectedInputSatoshis}) less than outputs (${existingOutputSatoshis}).`);
         }
         console.log(`[WalletPay] No change output added. Estimated fee based on inputs/outputs: ${estimatedFinalFee} satoshis.`);
         if (estimatedFinalFee < minFee) {
              throw new Error(`[WalletPay] Insufficient funds to meet the minimum fee of ${minFee} (requires ${minFee}, available ${estimatedFinalFee}). No change output exists.`);
         }
    }

    // 8. Sign the transaction's new inputs
    console.log("[WalletPay] Signing added inputs...");
    await tx.sign();

    // 9. Return the fully constructed and signed transaction hex
    const finalTxHex = tx.toHex();
    console.log("[WalletPay] Transaction funded and signed successfully.");
    return finalTxHex;
};

export const sendBSV = async(satoshis: number, toAddress: string) => {
    try {
        if (!satoshis) { throw `Invalid amount` }
        const balance = await getWalletBalance();
        if (balance < satoshis) throw `Amount entered exceeds balance`;
        const sendMax = balance === satoshis;
        if (!toAddress) { throw `Invalid address` }
        
        if (toAddress) {
            const tx = new Transaction();
            const amountToSend = sendMax ? balance - 10 : satoshis; // Basic fee estimate, payForRawTx will refine
            if (amountToSend <= 0 && balance > 0) throw `Calculated amount is too low, likely due to fee estimation. Balance: ${balance}`;
            if (amountToSend <= 0) throw `Calculated amount is zero or less. Cannot send.`;

            console.log(`[SendBSV] Creating output to ${toAddress} for ${amountToSend} sats.`);
            tx.addOutput({
                lockingScript: new P2PKH().lock(toAddress),
                satoshis: amountToSend
            });

            // Call the new payForRawTx which uses localStorage key
            console.log(`[SendBSV] Calling payForRawTx to fund the transaction...`);
            const fundedSignedTxHex = await payForRawTx(tx.toHex());

            if (fundedSignedTxHex) {
                const t = await broadcast(fundedSignedTxHex);
                return t;
            } 
        }
    } catch(e) {
        console.log(e);
        throw e;
    }
}

export const broadcast = async (txhex: string) => {
    console.log('Broadcasting transaction:', txhex);

    try {
        const response = await fetch('/api/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ txhex })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Broadcast error:', error);
            throw new Error(`Broadcast failed: ${error.error}`);
        }

        const { txid } = await response.json();
        console.log('Transaction broadcasted successfully:', txid);

        return txid;
    } catch (error) {
        console.error('Failed to broadcast:', error);
        throw error;
    }
}

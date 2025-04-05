import { bsv } from 'scrypt-ts';

export const B_PROTOCOL_ADDRESS = '19HxigV4QyBv3tHpQVcUEQyq1pzZVdoAut';
const MAP_PROTOCOL_ADDRESS = '1PuQa7K62MiKCtssSLKy1kh56WWU7MtUR5';
export const AIP_PROTOCOL_ADDRESS = '15PciHG22SNLQJXMoSUaWVi7WSqc7hCfva';
const BAP_PROTOCOL_ADDRESS = '1BAPSuaPnfGnSBM3GLV9yhxUdYe4vGbdMT';
const BPP_PROTOCOL_ADDRESS = 'BPP';
const P2PKH_SIGSCRIPT_SIZE = 1 + 73 + 1 + 33;
const P2PKH_OUTPUT_SIZE = 8 + 1 + 1 + 1 + 1 + 20 + 1 + 1;
const P2PKH_INPUT_SIZE = 36 + 1 + P2PKH_SIGSCRIPT_SIZE + 4;
const PUB_KEY_SIZE = 66;
const FEE_PER_KB = 3;
const FEE_FACTOR = (FEE_PER_KB / 1000); // 2 satoshis per Kilobyte
const SIGHASH_ALL_FORKID = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;
const SIGHASH_SINGLE_ANYONECANPAY_FORKID = bsv.crypto.Signature.SIGHASH_SINGLE | bsv.crypto.Signature.SIGHASH_ANYONECANPAY | bsv.crypto.Signature.SIGHASH_FORKID;
const SIGHASH_ALL_ANYONECANPAY_FORKID = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_ANYONECANPAY | bsv.crypto.Signature.SIGHASH_FORKID;
const LOCKUP_PREFIX = `97dfd76851bf465e8f715593b217714858bbe9570ff3bd5e33840a34e20ff026 02ba79df5f8ae7604a9830f03c7933028186aede0675a16f025dc4f8be8eec0382 1008ce7480da41702918d1ec8e6849ba32b4d65b1e40dc669c31a1e6306b266c 0 0`;
const LOCKUP_SUFFIX = `OP_NOP 0 OP_PICK 0065cd1d OP_LESSTHAN OP_VERIFY 0 OP_PICK OP_4 OP_ROLL OP_DROP OP_3 OP_ROLL OP_3 OP_ROLL OP_3 OP_ROLL OP_1 OP_PICK OP_3 OP_ROLL OP_DROP OP_2 OP_ROLL OP_2 OP_ROLL OP_DROP OP_DROP OP_NOP OP_5 OP_PICK 41 OP_NOP OP_1 OP_PICK OP_7 OP_PICK OP_7 OP_PICK 0ac407f0e4bd44bfc207355a778b046225a7068fc59ee7eda43ad905aadbffc800 6c266b30e6a1319c66dc401e5bd6b432ba49688eecd118297041da8074ce0810 OP_9 OP_PICK OP_6 OP_PICK OP_NOP OP_6 OP_PICK OP_HASH256 0 OP_PICK OP_NOP 0 OP_PICK OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT 00 OP_CAT OP_BIN2NUM OP_1 OP_ROLL OP_DROP OP_NOP OP_7 OP_PICK OP_6 OP_PICK OP_6 OP_PICK OP_6 OP_PICK OP_6 OP_PICK OP_NOP OP_3 OP_PICK OP_6 OP_PICK OP_4 OP_PICK OP_7 OP_PICK OP_MUL OP_ADD OP_MUL 414136d08c5ed2bf3ba048afe6dcaebafeffffffffffffffffffffffffffffff00 OP_1 OP_PICK OP_1 OP_PICK OP_NOP OP_1 OP_PICK OP_1 OP_PICK OP_MOD 0 OP_PICK 0 OP_LESSTHAN OP_IF 0 OP_PICK OP_2 OP_PICK OP_ADD OP_ELSE 0 OP_PICK OP_ENDIF OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_2 OP_ROLL OP_DROP OP_1 OP_ROLL OP_1 OP_PICK OP_1 OP_PICK OP_2 OP_DIV OP_GREATERTHAN OP_IF 0 OP_PICK OP_2 OP_PICK OP_SUB OP_2 OP_ROLL OP_DROP OP_1 OP_ROLL OP_ENDIF OP_3 OP_PICK OP_SIZE OP_NIP OP_2 OP_PICK OP_SIZE OP_NIP OP_3 OP_PICK 20 OP_NUM2BIN OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_1 OP_SPLIT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT OP_SWAP OP_CAT 20 OP_2 OP_PICK OP_SUB OP_SPLIT OP_NIP OP_4 OP_3 OP_PICK OP_ADD OP_2 OP_PICK OP_ADD 30 OP_1 OP_PICK OP_CAT OP_2 OP_CAT OP_4 OP_PICK OP_CAT OP_8 OP_PICK OP_CAT OP_2 OP_CAT OP_3 OP_PICK OP_CAT OP_2 OP_PICK OP_CAT OP_7 OP_PICK OP_CAT 0 OP_PICK OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP 0 OP_PICK OP_7 OP_PICK OP_CHECKSIG OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_VERIFY OP_5 OP_PICK OP_NOP 0 OP_PICK OP_NOP 0 OP_PICK OP_SIZE OP_NIP OP_1 OP_PICK OP_1 OP_PICK OP_4 OP_SUB OP_SPLIT OP_DROP OP_1 OP_PICK OP_8 OP_SUB OP_SPLIT OP_NIP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_NOP 0 OP_PICK 00 OP_CAT OP_BIN2NUM OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_ROLL OP_DROP OP_NOP 0065cd1d OP_LESSTHAN OP_VERIFY OP_5 OP_PICK OP_NOP 0 OP_PICK OP_NOP 0 OP_PICK OP_SIZE OP_NIP OP_1 OP_PICK OP_1 OP_PICK 28 OP_SUB OP_SPLIT OP_DROP OP_1 OP_PICK 2c OP_SUB OP_SPLIT OP_NIP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_NOP 0 OP_PICK 00 OP_CAT OP_BIN2NUM OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_ROLL OP_DROP OP_NOP ffffffff00 OP_LESSTHAN OP_VERIFY OP_5 OP_PICK OP_NOP 0 OP_PICK OP_NOP 0 OP_PICK OP_SIZE OP_NIP OP_1 OP_PICK OP_1 OP_PICK OP_4 OP_SUB OP_SPLIT OP_DROP OP_1 OP_PICK OP_8 OP_SUB OP_SPLIT OP_NIP OP_1 OP_ROLL OP_DROP OP_1 OP_ROLL OP_DROP OP_NOP OP_NOP 0 OP_PICK 00 OP_CAT OP_BIN2NUM OP_1 OP_ROLL OP_DROP OP_NOP OP_1 OP_ROLL OP_DROP OP_NOP OP_2 OP_PICK OP_GREATERTHANOREQUAL OP_VERIFY OP_6 OP_PICK OP_HASH160 OP_1 OP_PICK OP_EQUAL OP_VERIFY OP_7 OP_PICK OP_7 OP_PICK OP_CHECKSIG OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP OP_NIP`;

const decimalToHex = (d: number): string => {
    let h = d.toString(16);
    return h.length % 2 ? '0' + h : h;
}

const changeEndianness = (string: string): string => {
    const result = [];
    let len = string.length - 2;
    while (len >= 0) {
      result.push(string.substr(len, 2));
      len -= 2;
    }
    return result.join('');
}

const int2Hex = (int: number): string => {
    const unreversedHex = decimalToHex(int);
    return changeEndianness(unreversedHex);
}

export async function signLoginMessage(blockHeight: number) {
    const message = `Hodlocker Login - Block ${blockHeight}`
    const messageHash = bsv.crypto.Hash.sha256(Buffer.from(message))
    const privateKey = bsv.PrivateKey.fromWIF(localStorage.getItem('ownerKey')!)
    const signature = bsv.crypto.ECDSA.sign(messageHash, privateKey)
    
    return {
      publicKey: localStorage.getItem('ownerPublicKey')!,
      signature: signature.toString(),
      blockHeight
    }
  } 

export const createLockOutput = (address: string, blockHeight: number, satoshis: number, templateRawTx?: string): string => {
    let bsvtx;
    if (templateRawTx) { 
        bsvtx = new bsv.Transaction(templateRawTx) 
    } else { 
        bsvtx = new bsv.Transaction() 
    }
    
    const p2pkhOut = new bsv.Transaction.Output({
        script: bsv.Script(new bsv.Address(address)), 
        satoshis: 1
    });
    
    const addressHex = p2pkhOut.script.chunks[2].buf.toString('hex');
    const nLockTimeHexHeight = int2Hex(blockHeight);
    const scriptTemplate = `${LOCKUP_PREFIX} ${addressHex} ${nLockTimeHexHeight} ${LOCKUP_SUFFIX}`;
    const lockingScript = bsv.Script.fromASM(scriptTemplate);
    
    bsvtx.addOutput(new bsv.Transaction.Output({
        script: lockingScript, 
        satoshis
    }));
    
    return bsvtx.toString();
}

export const lockLike = (
    address: string, 
    blockHeight: number, 
    satoshis: number, 
    signPkWIF: string,
    likeTxid: string, 
    emoji?: string
): string => {
    const lockRawTx = createLockOutput(address, blockHeight, satoshis);
    const bLikeTx = bLike(lockRawTx, likeTxid, emoji, signPkWIF);
    return bLikeTx;
}

// Helper function to create B protocol like
const bLike = (
    rawtx: string, 
    likeTxid: string, 
    emoji: string | undefined, 
    signPkWIF: string
): string => {
    const bsvtx = new bsv.Transaction(rawtx);
    const bSocial = new BSocial('hodlocker.com');
    const l = bSocial.like(likeTxid, emoji || '');
    const payload = signPayload(l, signPkWIF, true);
    bsvtx.addOutput(new bsv.Transaction.Output({
        script: bsv.Script.buildSafeDataOut(payload),
        satoshis: 0
    }));
    return bsvtx.toString();
}

export const getBSVPublicKey = (pk: string) => { return bsv.PublicKey.fromPrivateKey(bsv.PrivateKey.fromWIF(pk)) }

export const newPK = () => {
    const pk = new bsv.PrivateKey();
    const pkWIF = pk.toWIF();
    return pkWIF;
} 
export const sendBSV = async(satoshis: number, toAddress: string) => {
    try {
        if (!satoshis) { throw `Invalid amount` }
        const balance = await getWalletBalance();
        if (balance < satoshis) throw `Amount entered exceeds balance`;
        const sendMax = balance === satoshis;
        if (!toAddress) { throw `Invalid address` }
        
        const addr = bsv.Address.fromString(toAddress);
        if (addr) {
            const bsvtx = new bsv.Transaction();
            if (sendMax) {
                bsvtx.to(addr, satoshis - 10);
            } else {
                bsvtx.to(addr, satoshis);
            }
            const rawtx = await payForRawTx(bsvtx.toString());
            if (rawtx) {
                const t = await broadcast(rawtx, true, localStorage.walletAddress);
                return t;
            } 
        }
    } catch(e) {
        console.log(e);
        throw e;
    }
}


export const broadcast = async (txhex: string, cacheUTXOs = false, address = null) => {
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

const btUTXOs = async (address: string) => {
    const utxos = []
    if (!utxos.length) {
        console.log(`Calling Bitails UTXOs endpoint...`);
        const r = await fetch(`https://api.bitails.io/address/${address}/unspent`);
        const { unspent } = await r.json();
        return normalizeUTXOs(unspent);
    } else { return utxos }
} 

export const getPaymentUTXOs = async(address: string, amount: number) => {
    const utxos = await btUTXOs(address);
    const addr = bsv.Address.fromString(address);
    const script = bsv.Script.fromAddress(addr);
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

export const payForRawTx = async (rawtx: string) => {
    const bsvtx = new bsv.Transaction(rawtx);
    const satoshis = bsvtx.outputs.reduce(((t, e) => t + e.satoshis), 0);
    const txFee = parseInt(((bsvtx._estimateSize() + (P2PKH_INPUT_SIZE * bsvtx.inputs.length)) * FEE_FACTOR)) + 1;
    const utxos = await getPaymentUTXOs(localStorage.walletAddress, satoshis + txFee);
    if (!utxos.length) { throw `Insufficient funds` }
    bsvtx.from(utxos);
    const inputSatoshis = utxos.reduce(((t, e) => t + e.satoshis), 0);
    if (inputSatoshis - satoshis - txFee > 0) {
        bsvtx.to(localStorage.walletAddress, inputSatoshis - satoshis - txFee);
    }
    bsvtx.sign(bsv.PrivateKey.fromWIF(localStorage.walletKey));
    console.log(bsvtx.toString())
    return bsvtx.toString();
}

export const appPayForRawTx = async (rawtx: string, appKey: string) => {
    const bsvtx = new bsv.Transaction(rawtx);
    const satoshis = bsvtx.outputs.reduce(((t, e) => t + e.satoshis), 0);
    const txFee = parseInt(((bsvtx._estimateSize() + (P2PKH_INPUT_SIZE * bsvtx.inputs.length)) * FEE_FACTOR)) + 1;
    
    const privateKey = bsv.PrivateKey.fromWIF(appKey);
    const address = privateKey.toAddress().toString();
    
    const utxos = await getPaymentUTXOs(address, satoshis + txFee);
    if (!utxos.length) { throw `Insufficient funds in app wallet` }
    
    bsvtx.from(utxos);
    const inputSatoshis = utxos.reduce(((t, e) => t + e.satoshis), 0);
    if (inputSatoshis - satoshis - txFee > 0) {
        bsvtx.to(address, inputSatoshis - satoshis - txFee);
    }
    
    bsvtx.sign(privateKey);
    return bsvtx.toString();
}

export const getWalletBalance = async(address = localStorage.walletAddress): Promise<number> => {
    const utxos = await btUTXOs(address);

    console.log(utxos)

    const balance = utxos.reduce(((t, e) => t + e.satoshis), 0)
    return balance; 
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

export const restoreWallet = (oPK: string, pPk: string) => {
  const pk = bsv.PrivateKey.fromWIF(pPk);
  const pkWif = pk.toString();
  const address = bsv.Address.fromPrivateKey(pk)
  const ownerPk = bsv.PrivateKey.fromWIF(oPK);
  localStorage.ownerKey = ownerPk.toWIF();
  const ownerAddress = bsv.Address.fromPrivateKey(ownerPk);
  localStorage.ownerAddress = ownerAddress.toString();
  localStorage.walletAddress = address.toString();
  localStorage.walletKey = pkWif;
  localStorage.ownerPublicKey = ownerPk.toPublicKey().toHex();
}

interface BSocialPost {
    appName: string;
    type: string;
    txId: string;
    texts: Array<{ text: string; type: string }>;
    images: Array<{ content: string; type: string }>;
    extraMapData: Record<string, string>;
    setType(type: string): void;
    setTxId(txId: string): void;
    addMapData(key: string, value: string): void;
    addText(text: string, type?: string): void;
    addMarkdown(markdown: string): void;
    addImage(dataUrl: string): void;
    getOps(format?: string): string[];
}

interface BSocialLike {
    appName: string;
    txId: string;
    emoji: string;
    setTxId(txId: string): void;
    setEmoji(emoji: string): void;
    getOps(format?: string): string[];
}

interface BSocialTip {
    appName: string;
    txId: string;
    amount: number;
    currency: string;
    setTxId(txId: string): void;
    setAmount(amount: number, currency: string): void;
    getOps(format?: string): string[];
}

interface BSocialFollow {
    appName: string;
    idKey: string;
    followAction: string;
    setIdKey(idKey: string): void;
    setAction(action: string): void;
    getOps(format?: string): string[];
}

class BSocialPost implements BSocialPost {
    appName: string;
    type: string;
    txId: string;
    texts: Array<{ text: string; type: string }>;
    images: Array<{ content: string; type: string }>;
    extraMapData: Record<string, string>;

    constructor(appName: string) {
        if (!appName) throw new Error('App name needs to be set');
        this.appName = appName;
        this.type = 'post';
        this.txId = '';
        this.texts = [];
        this.images = [];
        this.extraMapData = {};
    }

    setType(type: string): void {
        this.type = type;
    }

    setTxId(txId: string): void {
        this.txId = txId;
    }

    addMapData(key: string, value: string): void {
        if (typeof key !== 'string' || typeof value !== 'string') {
            throw new Error('Key and value should be a string');
        }
        this.extraMapData[key] = value;
    }

    addText(text: string, type: string = 'text/markdown'): void {
        if (typeof text !== 'string') throw new Error('Text should be a string');
        this.texts.push({ text, type });
    }

    addMarkdown(markdown: string): void {
        this.addText(markdown);
    }

    addImage(dataUrl: string): void {
        const image = dataUrl.split(',');
        const meta = image[0].split(';');
        const type = meta[0].split(':');

        if (type[0] !== 'data' || meta[1] !== 'base64' || !type[1].match('image/')) {
            throw new Error('Invalid image dataUrl format');
        }

        const img = atob(image[1]);
        this.images.push({
            content: img,
            type: type[1],
        });
    }

    getOps(format: string = 'hex'): string[] {
        const hasContent = this.texts.length > 0 || this.images.length > 0;
        const isRepost = this.type === 'repost' && this.txId;
        if (!hasContent && !isRepost) {
            throw new Error('There is no content for this post');
        }

        const ops: string[] = [];

        if (this.texts.length > 0) {
            this.texts.forEach((t) => {
                ops.push(B_PROTOCOL_ADDRESS);
                ops.push(t.text);
                ops.push(t.type);
                ops.push('UTF-8');
                ops.push('|');
            });
        }

        if (this.images.length > 0) {
            this.images.forEach((image) => {
                ops.push(B_PROTOCOL_ADDRESS);
                ops.push(image.content);
                ops.push(image.type);
                ops.push('|');
            });
        }

        ops.push(MAP_PROTOCOL_ADDRESS);
        ops.push('SET');
        ops.push('app');
        ops.push(this.appName);
        ops.push('type');
        ops.push(this.type);

        if (this.txId) {
            if (this.type !== 'repost') {
                ops.push('context');
                ops.push('tx');
            }
            ops.push('tx');
            ops.push(this.txId);
        }

        const extraMapData = Object.keys(this.extraMapData);
        if (extraMapData.length) {
            extraMapData.forEach((key) => {
                ops.push(key);
                ops.push(this.extraMapData[key]);
            });
        }

        return ops.map(op => op.toString(format));
    }
}

class BSocialLike {
    constructor(appName: string) {
      if (!appName) throw new Error('App name needs to be set');
      this.appName = appName;
      this.txId = '';
      this.emoji = '';
    }
  
    setTxId(txId: string) {
      this.txId = txId;
    }
  
    setEmoji(emoji: string) {
      if (typeof emoji !== 'string' || !emoji.match(/\p{Emoji}/gu)) {
        throw new Error('Invalid emoji');
      }
      this.emoji = emoji;
    }
  
    getOps(format = 'hex') {
      if (!this.txId) throw new Error('Like is not referencing a valid transaction');
  
      const ops = [];
      ops.push(MAP_PROTOCOL_ADDRESS); // MAP
      ops.push('SET');
      ops.push('app');
      ops.push(this.appName);
      ops.push('type');
      ops.push('like');
      ops.push('context');
      ops.push('tx');
      ops.push('tx');
      ops.push(this.txId);
  
      if (this.emoji) {
        ops.push('emoji');
        ops.push(this.emoji);
      }
  
      return ops.map((op) => {
        return Buffer.from(op).toString(format);
      });
    }
  }
  

class BSocialTip implements BSocialTip {
    appName: string;
    txId: string;
    amount: number;
    currency: string;

    constructor(appName: string) {
        if (!appName) throw new Error('App name needs to be set');
        this.appName = appName;
        this.txId = '';
        this.amount = 0;
        this.currency = '';
    }

    setTxId(txId: string): void {
        this.txId = txId;
    }

    setAmount(amount: number, currency: string): void {
        this.amount = amount;
        this.currency = currency;
    }

    getOps(format: string = 'hex'): string[] {
        if (!this.txId) throw new Error('Tip is not referencing a valid transaction');

        const ops: string[] = [];
        ops.push(MAP_PROTOCOL_ADDRESS); // MAP
        ops.push('SET');
        ops.push('app');
        ops.push(this.appName);
        ops.push('type');
        ops.push('tip');
        ops.push('context');
        ops.push('tx');
        ops.push('tx');
        ops.push(this.txId);

        if (this.amount && this.currency) {
            ops.push('amount');
            ops.push(this.amount.toString());
            ops.push('currency');
            ops.push(this.currency);
        }

        return ops.map(op => op.toString(format));
    }
}

class BSocialFollow implements BSocialFollow {
    appName: string;
    idKey: string;
    followAction: string;

    constructor(appName: string) {
        if (!appName) throw new Error('App name needs to be set');
        this.appName = appName;
        this.idKey = '';
        this.followAction = 'follow';
    }

    setIdKey(idKey: string): void {
        this.idKey = idKey;
    }

    setAction(action: string): void {
        if (action !== 'follow' && action !== 'unfollow') throw new Error('Invalid action');
        this.followAction = action;
    }

    getOps(format: string = 'hex'): string[] {
        if (!this.idKey) throw new Error('Follow is not referencing a valid id');

        const ops: string[] = [];
        ops.push(MAP_PROTOCOL_ADDRESS);
        ops.push('SET');
        ops.push('app');
        ops.push(this.appName);
        ops.push('type');
        ops.push(this.followAction);
        ops.push('idKey');
        ops.push(this.idKey);

        return ops.map(op => Buffer.from(op).toString(format));
    }
}

export class BSocial {
    private appName: string;

    constructor(appName: string) {
        if (!appName) throw new Error('App name needs to be set');
        this.appName = appName;
    }

    post(): BSocialPost {
        return new BSocialPost(this.appName);
    }

    repost(txId: string): BSocialPost {
        const post = new BSocialPost(this.appName);
        post.setType('repost');
        post.setTxId(txId);
        return post;
    }

    reply(txId: string): BSocialPost {
        const post = new BSocialPost(this.appName);
        post.setTxId(txId);
        return post;
    }

    like(txId: string, emoji = ''): BSocialLike {
        const like = new BSocialLike(this.appName);
        like.setTxId(txId);
        if (emoji) {
            like.setEmoji(emoji);
        }
        return like;
    }

    tip(txId: string, amount: number = 0, currency: string = 'USD'): BSocialTip {
        const tip = new BSocialTip(this.appName);
        tip.setTxId(txId);
        if (amount && currency) {
            tip.setAmount(amount, currency);
        }
        return tip;
    }

    follow(idKey: string): BSocialFollow {
        const follow = new BSocialFollow(this.appName);
        follow.setIdKey(idKey);
        return follow;
    }

    unfollow(idKey: string): BSocialFollow {
        const follow = new BSocialFollow(this.appName);
        follow.setIdKey(idKey);
        follow.setAction('unfollow');
        return follow;
    }
}

export function signPayload(data: any, pkWIF: string, isLike = false) {
    const arrops = data.getOps('utf8');
    let hexarrops = [];
    hexarrops.push('6a');
    if (isLike) { hexarrops.push('6a') }
    arrops.forEach(o => { hexarrops.push(str2Hex(o)) })
    if (isLike) { hexarrops.push('7c') }
    let hexarr = [], payload = [];
    if (pkWIF) {
        const b2sign = hexArrayToBSVBuf(hexarrops);
        const privateKey = new bsv.PrivateKey.fromWIF(pkWIF);
        const signature = bsv.Message.sign(b2sign.toString(), privateKey);
        const address = privateKey.toAddress().toString();
        payload = arrops.concat(['|', AIP_PROTOCOL_ADDRESS, 'BITCOIN_ECDSA', address, signature]);
    } else { 
        payload = arrops 
    }
    payload.forEach(p => { hexarr.push(str2Hex(p)) })
    return payload;
}

const hex2Str = (hex: string) => {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        let v = parseInt(hex.substr(i, 2), 16);
        if (v) str += String.fromCharCode(v);
    }
    return str; 
}

const str2Hex = (str: string) => {
    const hex = unescape(encodeURIComponent(str)).split('').map(v => {return v.charCodeAt(0).toString(16).padStart(2,'0')}).join('');
    return hex;
}

const hexArrayToBSVBuf = (arr: string) => {
    const hexBuf = arrToBuf(arr);
    const decoded = new TextDecoder().decode(hexBuf);
    const str2sign = hex2Str(decoded);
    const abuf = strToArrayBuffer(str2sign);
    const bsvBuf = dataToBuf(abuf);
    return bsvBuf;
}

const arrToBuf = (arr: string) => {
    const msgUint8 = new TextEncoder().encode(arr);
    const decoded = new TextDecoder().decode(msgUint8);
    const value = decoded.replaceAll(',', '');
    return new TextEncoder().encode(value);
}

const strToArrayBuffer = (binary_string: string) => {
    const bytes = new Uint8Array( binary_string.length );
    for (let i = 0; i < binary_string.length; i++)  {bytes[i] = binary_string.charCodeAt(i) }
    return bytes;
}

const dataToBuf = (arr: string) => {
    const bufferWriter = new bsv.encoding.BufferWriter();
    arr.forEach(a => { bufferWriter.writeUInt8(a) });
    return bufferWriter.toBuffer();
}

// Add these helper functions if not already present
const getUTXO = (rawtx: string, oIdx: number = 0) => {
    const tx = new bsv.Transaction(rawtx);
    const output = tx.outputs[oIdx];
    return {
        satoshis: output.satoshis,
        script: output.script.toHex(),
        txid: tx.hash,
        vout: oIdx
    };
};

const hex2Int = (hex: string): number => {
    // Convert from little-endian to big-endian by reversing byte pairs
    const bigEndian = hex.match(/.{2}/g)?.reverse().join('') || hex;
    return parseInt(bigEndian, 16);
};

// Unlock functions
const unlockLockScript = (
    txHex: string, 
    inputIndex: number, 
    lockTokenScript: string, 
    satoshis: number, 
    privkey: bsv.PrivateKey
): string => {
    const tx = new bsv.Transaction(txHex);
    const sighashType = bsv.crypto.Signature.SIGHASH_ALL | bsv.crypto.Signature.SIGHASH_FORKID;
    const scriptCode = bsv.Script.fromHex(lockTokenScript);
    const value = new bsv.crypto.BN(satoshis);
    
    // Create preImage of current transaction with valid nLockTime
    const preimg = bsv.Transaction.Sighash.sighashPreimage(
        tx, 
        sighashType, 
        inputIndex, 
        scriptCode, 
        value
    ).toString('hex');
    
    // Sign transaction with private key
    const signature = bsv.Transaction.Sighash.sign(
        tx, 
        privkey, 
        sighashType, 
        inputIndex, 
        scriptCode, 
        value
    ).toTxFormat();

    return bsv.Script.fromASM(
        `${signature.toString('hex')} ${privkey.toPublicKey().toHex()} ${preimg}`
    ).toHex();
};

export const unlockCoins = async (
    pkWIF: string, 
    receiveAddress: string, 
    txid: string, 
    oIdx: number = 0
): Promise<string> => {
    try {
        const rawtx = await getRawtx(txid);
        const lockedUTXO = getUTXO(rawtx, oIdx);
        const bsvtx = new bsv.Transaction();
        const lockedScript = new bsv.Script(lockedUTXO.script);

        bsvtx.addInput(new bsv.Transaction.Input({
            prevTxId: txid,
            outputIndex: oIdx,
            script: bsv.Script.fromASM('')
        }), lockedScript, lockedUTXO.satoshis);

        const lockedBlockHex = lockedScript.chunks[6].buf.toString('hex');
        console.log('Locked block hex:', lockedBlockHex);
        const lockedBlock = hex2Int(lockedBlockHex);
        console.log('Locked block:', lockedBlock);
        bsvtx.lockUntilBlockHeight(lockedBlock);

        // Subtract 1 satoshi to pay the transaction fee
        bsvtx.to(
            receiveAddress, 
            lockedUTXO.satoshis === 1 ? 1 : lockedUTXO.satoshis - 2
        );

        const solution = unlockLockScript(
            bsvtx.toString(), 
            oIdx, 
            lockedUTXO.script, 
            lockedUTXO.satoshis, 
            bsv.PrivateKey.fromWIF(pkWIF)
        );
        
        bsvtx.inputs[0].setScript(bsv.Script.fromHex(solution));
        return bsvtx.toString();
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const bulkUnlock = async (
    pkWIF: string,
    receiveAddress: string,
    identityAddress: string,
    fromHeight: number,
    toHeight: number
): Promise<string[]> => {
    try {
        const response = await fetch('https://mornin.run/getLocks', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fromHeight,
                toHeight,
                address: identityAddress
            })
        });

        const locks = await response.json();
        const unlockTxids: string[] = [];

        if (locks.length) {
            for (const lock of locks) {
                try {
                    const rawtx = await unlockCoins(pkWIF, receiveAddress, lock.txid);
                    const txid = await broadcast(rawtx);
                    console.log('Unlocked:', txid);
                    unlockTxids.push(txid);
                } catch (error) {
                    console.error(`Failed to unlock tx ${lock.txid}:`, error);
                }
            }
        }

        return unlockTxids;
    } catch (error) {
        console.error('Bulk unlock failed:', error);
        throw error;
    }
};

const getRawtx = async (txid: string): Promise<string> => {
    const r = await fetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/hex`);
    return await r.text();
};

// Special str2Hex function for binary image data
export function str2HexForImage(str: string): string {
    try {
        // Convert each binary character to a 2-digit hex representation
        let hex = '';
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            const hexByte = charCode.toString(16).padStart(2, '0');
            hex += hexByte;
        }
        
        // Ensure the hex string has an even length
        if (hex.length % 2 !== 0) {
            console.warn('Generated an odd-length hex string, padding with 0');
            hex += '0';
        }
        
        return hex;
    } catch (error) {
        console.error('Error converting image to hex:', error);
        throw new Error('Failed to convert image to hex format');
    }
}
'use client'
import React, { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, Download, Send, Trash2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {QRCodeSVG} from 'qrcode.react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useToast } from "@/hooks/use-toast"

// Add these imports from shuallet
import { getWalletBalance, newPK, restoreWallet, sendBSV, signLoginMessage } from '@/lib/shuallet'
import { createPasskey, getPasskey, isPasskeyAvailable, getPasskeys, removePasskey } from '@/lib/passkeys';
import { useBlockHeight } from "@/hooks/use-block-height"

// Add this type for the different sheet views
type SheetView = 'main' | 'send' | 'backup' | 'disconnect' | 'import' | 'create-wallet' | 'import-passkey' | 'delete-confirm' | 'send-confirm';

// Add type for error handling
type ErrorWithMessage = {
  toString(): string
}

// Add type for wallet selection
type WalletInfo = {
  id: string;
  name: string;
  createdAt: number;
};

export default function ConnectButton() {
  const [isWalletInitialized, setIsWalletInitialized] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bsvPrice, setBsvPrice] = useState<number>(0)
  const [sendAmount, setSendAmount] = useState('')
  const [sendAddress, setSendAddress] = useState('')
  const [backupFileName, setBackupFileName] = useState('')
  const [currentView, setCurrentView] = useState<SheetView>('main')
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [newWalletName, setNewWalletName] = useState('');
  const [passkeyToDelete, setPasskeyToDelete] = useState<string | null>(null);
  const [importedWalletData, setImportedWalletData] = useState<{ ordPk: string; payPk: string } | null>(null);
  const { blockHeight } = useBlockHeight()

  const { toast } = useToast()

   // Add this new function
   const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        description: "Address copied to clipboard",
        duration: 1500
      })
    } catch (err) {
      console.error('Failed to copy:', err)
      toast({
        variant: "destructive",
        description: "Failed to copy address",
        duration: 1500
      })
    }
  }

  // Format balance to K format (e.g., 900K, 1.2M)
  const formatBalance = (balance: number): string => {
    return balance.toLocaleString('en-US')
  }

  useEffect(() => {
    const initWallet = async () => {
      if (typeof window !== 'undefined' && window.localStorage.walletAddress) {
        setIsWalletInitialized(true)
        setWalletAddress(window.localStorage.walletAddress)
        if (blockHeight) {
          await fetchBalance()
          await login()
        }
      }
    }
    
    initWallet()
    fetchBSVPrice()
    setIsPasskeySupported(isPasskeyAvailable());
  }, [blockHeight])

  const fetchBalance = async () => {
    if (typeof window !== 'undefined') {
      setIsLoading(true)
      try {
        const balanceInSatoshis = await getWalletBalance()
        setWalletBalance(balanceInSatoshis)
      } catch (error) {
        console.error('Error fetching balance:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const login = async () => {
    try {
      setIsLoading(true)
      if (!blockHeight) {
        throw new Error('Block height not available')
      }
      
      const loginData = await signLoginMessage(blockHeight)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Login failed')
      }

      const { session, user } = await response.json()

      // Create profile if it doesn't exist
      await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_public_key: window.localStorage.ownerPublicKey,
          username: `..${window.localStorage.ownerPublicKey.slice(-12)}`,
        })
      })

      setIsWalletInitialized(true)
      window.dispatchEvent(new Event('walletConnected'))
    } catch (error) {
      console.error('Login error:', error)
      toast({
        variant: "destructive", 
        description: (error as Error).message || "Failed to connect wallet",
        duration: 1500
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClick = async () => {
    setIsLoading(true)
    try {
      if (!isWalletInitialized) {
        await setupWallet()
      } else {
        await fetchBalance() // Refresh balance before showing modal
        setIsModalOpen(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const json = JSON.parse((e.target?.result as string))
        if (json.ordPk && json.payPk) {
          if (isPasskeySupported) {
            // Store the wallet data temporarily
            setImportedWalletData(json);
            setIsModalOpen(true);
            setCurrentView('import-passkey');
          } else {
            // Regular import without passkey
            restoreWallet(json.ordPk, json.payPk);
            setIsWalletInitialized(true);
            setWalletAddress(window.localStorage.walletAddress);
            await fetchBalance();
            await login();
            
            setIsModalOpen(true);
            setCurrentView('main');
            toast({
              description: "Wallet imported successfully",
              duration: 1500
            });
          }
        } else {
          throw new Error('Invalid wallet file format');
        }
      } catch (e) {
        console.error(e);
        toast({
          variant: "destructive",
          description: "Error importing wallet: Invalid format",
          duration: 1500
        });
      }
    }
    reader.readAsText(file);
    event.target.value = '';
  };

  const setupWallet = async () => {
    if (!window.localStorage.walletKey) {
      setIsModalOpen(true)
      setCurrentView('import')
    } else {
      await login()
    }
  }

  const handleLogout = () => {
    // Clear wallet data from localStorage
    localStorage.removeItem('walletKey')
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('ownerKey')
    localStorage.removeItem('ownerAddress')
    localStorage.removeItem('ownerPublicKey')

    // Reset state
    setIsWalletInitialized(false)
    setWalletAddress('')
    setWalletBalance(0)
    setIsModalOpen(false)
    setCurrentView('main')

    // Dispatch wallet disconnected event
    window.dispatchEvent(new Event('walletDisconnected'))

    // Show confirmation toast
    toast({
      description: "Wallet disconnected",
      duration: 1500
    })
  }

  const handleBackup = () => {
    if (!backupFileName.trim()) {
      toast({
        variant: "destructive",
        description: "Please enter a filename",
        duration: 1500
      })
      return
    }

    const walletData = {
      ordPk: localStorage.ownerKey,
      payPk: localStorage.walletKey,
    }

    const dataStr = JSON.stringify(walletData)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const filename = backupFileName.toLowerCase().endsWith('.json') 
      ? backupFileName 
      : `${backupFileName}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', filename)
    linkElement.click()
    
    setBackupFileName('')
    setCurrentView('main')
    
    toast({
      description: "Wallet backup created successfully",
      duration: 1500
    })
  }

  const handleSend = async () => {
    try {
      if (!sendAddress || !sendAmount) {
        toast({
          variant: "destructive",
          description: "Please enter both address and amount",
          duration: 1000
        })
        return
      }

      setIsLoading(true)
      const txid = await sendBSV(Number(sendAmount), sendAddress)
      if (txid) {
        setSendAmount('')
        setSendAddress('')
        setCurrentView('main')
        await fetchBalance()
        
        // Close the wallet sheet
        setIsModalOpen(false)
        
        toast({
          description: "Transaction sent successfully",
          duration: 1500
        })
      }
    } catch (error) {
      console.error('Send error:', error)
      const errorMessage = (error as ErrorWithMessage)?.toString() || "Failed to send transaction"
      toast({
        variant: "destructive",
        description: errorMessage,
        duration: 1500
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBSVPrice = async () => {
    try {
      const response = await fetch('https://api.whatsonchain.com/v1/bsv/main/exchangerate')
      const data = await response.json()
      console.log('BSV Price data:', data)
      setBsvPrice(Number(data.rate))
    } catch (error) {
      console.error('Error fetching BSV price:', error)
    }
  }

  const calculateUSDValue = (sats: number): string => {
    const satoshis = Number(sats)
    if (isNaN(satoshis)) {
      return '0.0000'
    }
    
    const bsv = satoshis / 100000000
    
    const usd = bsv * bsvPrice
    
    if (isNaN(usd)) {
      return '0.0000'
    }
    
    return usd.toLocaleString('en-US', { 
      minimumFractionDigits: 4,
      maximumFractionDigits: 4 
    })
  }

  // Helper function to reset view when sheet closes
  const handleSheetOpenChange = (open: boolean) => {
    setIsModalOpen(open)
    if (!open) {
      // Reset to main view when sheet closes
      setTimeout(() => setCurrentView('main'), 150)
      // Reset other states
      setSendAmount('')
      setSendAddress('')
      setBackupFileName('')
    }
  }

  const handleCreateWallet = async () => {
    try {
      if (!newWalletName.trim()) {
        toast({
          variant: "destructive",
          description: "Please enter a wallet name",
          duration: 1500
        });
        return;
      }

      setIsLoading(true);
      const paymentPk = newPK();
      const ownerPK = newPK();
      
      if (paymentPk && ownerPK) {
        if (isPasskeySupported) {
          await createPasskey({
            ordPk: ownerPK,
            payPk: paymentPk,
            name: newWalletName
          });
          
          await loadAvailableWallets();
        }
        
        restoreWallet(ownerPK, paymentPk);
        setIsWalletInitialized(true);
        setWalletAddress(window.localStorage.walletAddress);
        await fetchBalance();
        await login();
        
        setCurrentView('backup');
        setBackupFileName(newWalletName);
        
        toast({
          description: "New wallet created successfully. Please backup your wallet now.",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      toast({
        variant: "destructive",
        description: "Failed to create wallet",
        duration: 1500
      });
    } finally {
      setIsLoading(false);
      setNewWalletName('');
    }
  };

  const handleUnlock = async (credentialId: string) => {
    try {
      setIsLoading(true);
      const walletData = await getPasskey(credentialId);
      if (walletData) {
        restoreWallet(walletData.ordPk, walletData.payPk);
        setIsWalletInitialized(true);
        setWalletAddress(window.localStorage.walletAddress);
        await fetchBalance();
        setIsModalOpen(true);
        setCurrentView('main');
        
        // Dispatch wallet connected event
        window.dispatchEvent(new Event('walletConnected'));
      }
    } catch (error) {
      console.error('Error unlocking wallet:', error);
      toast({
        variant: "destructive",
        description: "Failed to unlock wallet",
        duration: 1500
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to load available wallets
  const loadAvailableWallets = useCallback(async () => {
    if (isPasskeySupported) {
      const wallets = await getPasskeys();
      setAvailableWallets(wallets);
    }
  }, [isPasskeySupported]);

  useEffect(() => {
    loadAvailableWallets();
  }, [isPasskeySupported, loadAvailableWallets]);

  // Add this function inside the ConnectButton component
  const handleDeletePasskey = async (id: string) => {
    setPasskeyToDelete(id);
    setCurrentView('delete-confirm');
  };

  const confirmDeletePasskey = async () => {
    if (!passkeyToDelete) return;
    
    try {
      setIsLoading(true);
      const success = removePasskey(passkeyToDelete);
      if (success) {
        await loadAvailableWallets();
        setCurrentView('import');
        toast({
          description: "Passkey removed successfully",
          duration: 1500
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        description: "Failed to remove passkey",
        duration: 1500
      });
    } finally {
      setIsLoading(false);
      setPasskeyToDelete(null);
    }
  };

  // Update the renderImportView function to include delete buttons
  const renderImportView = () => (
    <>
      <SheetHeader>
        <SheetTitle className="font-sans">Login with Wallet</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 mt-4">
        {isPasskeySupported && availableWallets.length > 0 && (
          <div className="space-y-2">
            {availableWallets.map((wallet) => (
              <div key={wallet.id} className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="w-full justify-between border-black dark:border-white hover:bg-black/5 dark:hover:bg-white/5 font-sans"
                  onClick={() => handleUnlock(wallet.id)}
                >
                  <span className="font-medium">{wallet.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(wallet.createdAt).toLocaleDateString()}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  onClick={() => handleDeletePasskey(wallet.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex space-x-2 pt-2">
          <Button 
            className="flex-1 bg-black dark:bg-white text-white dark:text-black border border-white/30 dark:border-black/30 hover:bg-black/90 dark:hover:bg-white/90 font-sans"
            onClick={() => setCurrentView('create-wallet')}
          >
            Create New Wallet
          </Button>
          <Button
            className="flex-1 bg-white dark:bg-black text-black dark:text-white border border-black dark:border-white hover:bg-white/90 dark:hover:bg-black/90 font-sans"
            variant="outline"
            onClick={() => {
              fileInputRef.current?.click();
              setIsModalOpen(false);
            }}
          >
            Import from Backup
          </Button>
        </div>
      </div>
    </>
  );

  // Add new view for wallet creation
  const renderCreateWalletView = () => (
    <>
      <SheetHeader>
        <SheetTitle className="font-sans">Create New Wallet</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label htmlFor="walletName" className="font-sans">Wallet Name</Label>
          <Input
            id="walletName"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            placeholder="Enter wallet name"
            className="font-sans"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentView('import')}
            className="font-sans"
          >
            Back
          </Button>
          <Button 
            onClick={handleCreateWallet}
            disabled={isLoading}
            className="font-sans"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Create Wallet'
            )}
          </Button>
        </div>
      </div>
    </>
  );

  // Add new function to handle the import with passkey
  const handleImportWithPasskey = async (shouldCreatePasskey: boolean) => {
    try {
      if (!importedWalletData) return;

      // Restore wallet first
      restoreWallet(importedWalletData.ordPk, importedWalletData.payPk);
      setIsWalletInitialized(true);
      setWalletAddress(window.localStorage.walletAddress);

      if (shouldCreatePasskey) {
        if (!newWalletName.trim()) {
          toast({
            variant: "destructive",
            description: "Please enter a wallet name",
            duration: 1500
          });
          return;
        }

        await createPasskey({
          ordPk: importedWalletData.ordPk,
          payPk: importedWalletData.payPk,
          name: newWalletName
        });
        await loadAvailableWallets();
      }

      await fetchBalance();
      await login();
      
      setIsModalOpen(true);
      setCurrentView('main');
      
      toast({
        description: "Wallet imported successfully",
        duration: 1500
      });
    } catch (error) {
      console.error('Error importing wallet:', error);
      toast({
        variant: "destructive",
        description: "Failed to import wallet",
        duration: 1500
      });
    } finally {
      setImportedWalletData(null);
      setNewWalletName('');
    }
  };

  // Add new view for passkey import choice
  const renderImportPasskeyView = () => (
    <>
      <SheetHeader>
        <SheetTitle className="font-sans">Save as Passkey?</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 mt-4">
        <p className="font-sans">Would you like to save this wallet as a passkey? This will allow you to easily access it using your device's authentication.</p>
        
        <div className="space-y-2">
          <Label htmlFor="walletName" className="font-sans">Wallet Name</Label>
          <Input
            id="walletName"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            placeholder="Enter wallet name"
            className="font-sans"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleImportWithPasskey(false)}
            className="font-sans"
          >
            Skip
          </Button>
          <Button 
            onClick={() => handleImportWithPasskey(true)}
            disabled={!newWalletName.trim()}
            className="font-sans"
          >
            Save as Passkey
          </Button>
        </div>
      </div>
    </>
  );

  // Add this function inside ConnectButton component
  const handleSendMax = () => {
    setSendAmount(walletBalance.toString())
  }

  // Render different content based on current view
  const renderSheetContent = () => {
    switch (currentView) {
      case 'send':
        return (
          <>
            <SheetHeader>
              <SheetTitle className="font-sans">Send BSV</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="font-sans">Recipient Address</Label>
                <Input
                  id="address"
                  value={sendAddress}
                  onChange={(e) => setSendAddress(e.target.value)}
                  placeholder="Enter BSV address"
                  className="font-sans"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="amount" className="font-sans">Amount (in satoshis)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSendMax}
                    className="h-6 px-2 text-xs font-sans"
                  >
                    Send Max
                  </Button>
                </div>
                <Input
                  id="amount"
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="Enter amount in sats"
                  className="font-sans"
                />
                {sendAmount && (
                  <p className="text-sm text-muted-foreground font-sans">
                    ${calculateUSDValue(Number(sendAmount))} USD
                  </p>
                )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('main')}
                  disabled={isLoading}
                  className="font-sans"
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentView('send-confirm')}
                  disabled={isLoading || !sendAddress || !sendAmount}
                  className="font-sans"
                >
                  Continue
                </Button>
              </div>
            </div>
          </>
        )

      case 'backup':
        return (
          <>
            <SheetHeader>
              <SheetTitle className="font-sans">Backup Wallet</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="filename" className="font-sans">Backup Filename</Label>
                <Input
                  id="filename"
                  value={backupFileName}
                  onChange={(e) => setBackupFileName(e.target.value)}
                  placeholder="Enter filename (e.g., my-wallet-backup)"
                  className="font-sans"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setCurrentView('main');
                  }}
                  className="font-sans"
                >
                  Done
                </Button>
                <Button onClick={() => {
                  handleBackup();
                }} className="font-sans">
                  Download Backup
                </Button>
              </div>
            </div>
          </>
        )

      case 'disconnect':
        return (
          <>
            <SheetHeader>
              <SheetTitle className="font-sans">Disconnect Wallet</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <p className="font-sans">Please make sure you have a backup of your wallet before disconnecting.</p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCurrentView('main')} className="font-sans">
                  Back
                </Button>
                <Button variant="destructive" onClick={handleLogout} className="font-sans">
                  Disconnect
                </Button>
              </div>
            </div>
          </>
        )

      case 'create-wallet':
        return renderCreateWalletView();

      case 'import':
        return renderImportView();

      case 'import-passkey':
        return renderImportPasskeyView();

      case 'delete-confirm':
        return (
          <>
            <SheetHeader>
              <SheetTitle className="font-sans">Delete Passkey</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <p className="font-sans">Are you sure you want to delete this passkey? This action cannot be undone.</p>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setPasskeyToDelete(null);
                    setCurrentView('import');
                  }}
                  className="font-sans"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={confirmDeletePasskey} 
                  disabled={isLoading}
                  className="font-sans"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </div>
          </>
        );

      case 'send-confirm':
        return (
          <>
            <SheetHeader>
              <SheetTitle className="font-sans">Confirm Transaction</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="rounded-lg border p-4 space-y-3 font-sans">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sending</p>
                  <p className="font-medium font-mono">{formatBalance(Number(sendAmount))} sats</p>
                  <p className="text-sm text-muted-foreground">
                    ${calculateUSDValue(Number(sendAmount))} USD
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">To Address</p>
                  <p className="font-mono text-sm break-all">{sendAddress}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Network Fee</p>
                  <p className="font-medium">10 sats</p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('send')}
                  disabled={isLoading}
                  className="font-sans"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={isLoading}
                  className="font-sans"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm Send'
                  )}
                </Button>
              </div>
            </div>
          </>
        );

      default:
        return (
          <>
            <SheetHeader>
              <SheetTitle className="font-sans">Wallet</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col items-center space-y-6 p-4">
              <div className="bg-muted/30 p-4 rounded-xl border w-full text-center">
                <p 
                  className="font-mono text-sm break-all cursor-pointer hover:opacity-80 transition-opacity font-sans"
                  onClick={() => copyToClipboard(walletAddress)}
                  title="Click to copy address"
                >
                  {walletAddress}
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800/30 shadow-sm">
                <QRCodeSVG value={walletAddress} size={200} />
              </div>
              
              <div className="text-center space-y-1 w-full font-sans">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold text-primary font-mono">
                  {formatBalance(walletBalance)} <span className="text-lg font-sans">sats</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  ${calculateUSDValue(walletBalance)} USD
                </p>
              </div>
              
              <div className="flex flex-row space-x-2 w-full mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('send')}
                  className="w-full py-2 sm:py-6 group hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-indigo-500/10 
                  transition-all duration-300 hover:border-blue-500"
                >
                  <Send className="w-4 h-4 mr-1 sm:mr-2 group-hover:text-blue-500" />
                  <span className="group-hover:text-blue-500 text-xs sm:text-sm font-sans">Send</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('backup')}
                  className="w-full py-2 sm:py-6 group hover:bg-gradient-to-r hover:from-green-500/10 hover:to-emerald-500/10 
                  transition-all duration-300 hover:border-green-500"
                >
                  <Download className="w-4 h-4 mr-1 sm:mr-2 group-hover:text-green-500" />
                  <span className="group-hover:text-green-500 text-xs sm:text-sm font-sans">Backup</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentView('disconnect')}
                  className="w-full py-2 sm:py-6 group hover:bg-gradient-to-r hover:from-red-500/10 hover:to-rose-500/10 
                  transition-all duration-300 hover:border-red-500"
                >
                  <LogOut className="w-4 h-4 mr-1 sm:mr-2 group-hover:text-red-500" />
                  <span className="group-hover:text-red-500 text-xs sm:text-sm font-sans">Disconnect</span>
                </Button>
              </div>
            </div>
          </>
        )
    }
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        style={{ display: 'none' }}
      />
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleClick}
        className="h-10 group border border-input hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-amber-500/10 
        transition-all duration-300 hover:border-l-4 hover:border-orange-500 font-sans"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : walletAddress ? (
          <span className="text-xs font-mono group-hover:text-orange-500 font-sans">
            {`${formatBalance(walletBalance)} sats`}
          </span>
        ) : (
          <span className="group-hover:text-orange-500 font-sans">Login</span>
        )}
      </Button>

      <Sheet open={isModalOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent side="bottom" className="w-full md:w-1/3 mx-auto rounded-t-[10px] z-[100]">
          {renderSheetContent()}
        </SheetContent>
      </Sheet>
    </>
  )
}
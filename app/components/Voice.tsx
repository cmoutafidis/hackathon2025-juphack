'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Copy, AlertTriangle, Volume2, RefreshCw, ArrowRight } from 'lucide-react';

export default function Voice() {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [walletGenerated, setWalletGenerated] = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [transcript, setTranscript] = useState('');
  
  // Speech recognition and synthesis references
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  
  // Wallet and swap data
  const [walletData, setWalletData] = useState({
    address: '',
    seedPhrase: [],
    secretKey: '', // Store securely, in a real app use better security measures
    balance: 0,
    tokenBalances: [] as any[] // All token balances from Jupiter - ensure it's always an array
  });
  
  // Flag to track if we're fetching token balances
  const [isFetchingTokenBalances, setIsFetchingTokenBalances] = useState(false);
  
  const [swapData, setSwapData] = useState({
    inputToken: 'SOL',
    outputToken: 'USDC',
    inputAmount: '0',
    outputAmount: '0',
    txSignature: ''
  });
  
  // Flag to track if we're fetching balance
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);

  // SIMPLIFIED SPEECH RECOGNITION IMPLEMENTATION
  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis;
    }
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log('Error stopping recognition:', err);
        }
      }
    };
  }, []);

  // Handle listening state changes
  useEffect(() => {
    if (!isListening) {
      // Stop listening if active
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log('Error stopping recognition:', err);
        }
      }
      return;
    }
    
    // Start listening
    try {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        showNotification('Speech recognition not supported in your browser');
        setIsListening(false);
        return;
      }
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // Add event handlers
      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript.toLowerCase();
        console.log('HEARD:', text);
        setTranscript(text);
        
        // Command processing
        if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
          sayHello();
        } else if (text.includes('create wallet') || text.includes('generate wallet') || text.includes('new wallet')) {
          console.log("Detected wallet creation command");
          generateWallet();
        } else if (text.includes('swap') || text.includes('exchange') || text.includes('trade') || text.includes('swap token')) {
          console.log("Detected swap command");
          if (walletGenerated) {
            swapTokens();
          } else {
            showNotification('Please create a wallet first');
            speak('Please create a wallet first before swapping tokens');
          }
        } else if (text.includes('solana')) {
          sayHelp();
        }
      };
      
      recognitionRef.current.onend = () => {
        console.log('Recognition ended - restarting');
        // Restart recognition if still in listening mode
        if (isListening) {
          try {
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                recognitionRef.current.start();
              }
            }, 100);
          } catch (err) {
            console.log('Error restarting recognition:', err);
          }
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.log('Recognition error:', event.error);
        // Don't stop on network errors
        if (event.error !== 'network' && event.error !== 'aborted') {
          showNotification('Speech recognition error: ' + event.error);
        }
      };
      
      // Start recognition
      recognitionRef.current.start();
      console.log('Recognition started');
      
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      showNotification('Failed to start speech recognition');
      setIsListening(false);
    }
  }, [isListening, walletGenerated]);

  // SIMPLIFIED HELPERS FOR COMMON RESPONSES
  const sayHello = () => {
    console.log('SAYING HELLO');
    showNotification('Hello Sir');
    speak('Hello Sir');
  };
  
  const sayHelp = () => {
    showNotification('How can I help you?');
    speak('How can I help you?');
  };
  
  // Simple notification helper
  const showNotification = (message: string) => {
    setNotification({
      show: true,
      message: message
    });
    
    setTimeout(() => {
      setNotification({
        show: false,
        message: ''
      });
    }, 3000);
  };
  
  // Simple speak helper
  const speak = (text: string) => {
    if (!speechSynthesisRef.current) return;
    
    try {
      speechSynthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  };

  // Toggle microphone listening state
  const toggleListening = () => {
    setIsListening(!isListening);
  };

  // Generate wallet
  const generateWallet = async () => {
    setIsLoading(true);
    showNotification('Generating your Solana wallet');
    speak('Generating your Solana wallet, please wait');
    
    try {
      console.log("Calling wallet generation API...");
      // Call the real API endpoint for wallet generation
      const response = await fetch('/api/generateWallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}) // Empty body as we just need to trigger wallet creation
      });
      
      console.log("API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Wallet generated successfully");
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate wallet');
      }
      
      // Set wallet data from API response
      setWalletData({
        address: data.address,
        seedPhrase: data.seedPhrase,
        secretKey: data.secretKey || '', // In a real app, handle this securely
        balance: 0, // We'll fetch the balance separately
        tokenBalances: [] // Will fetch token balances separately
      });
      
      setIsLoading(false);
      setWalletGenerated(true);
      showNotification('Wallet created successfully');
      speak('Your Solana wallet has been created successfully. Now fetching your wallet balance.');
      
      // Fetch the balance of the newly created wallet
      fetchWalletBalance(data.address);
    } catch (error) {
      console.error('Error generating wallet:', error);
      setIsLoading(false);
      showNotification('Error generating wallet');
      speak('Sorry, there was an error generating your wallet');
    }
  };
  
  // Fetch wallet balance
  const fetchWalletBalance = async (address: string) => {
    if (!address) return;
    
    setIsFetchingBalance(true);
    
    try {
      console.log("Fetching wallet balance for address:", address);
      
      // Call the API endpoint for balance checking
      const response = await fetch('/api/getWalletBalance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address })
      });
      
      console.log("Balance API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Balance API error response:", errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Balance data received:", data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch balance');
      }
      
      // Update the wallet data with the balance
      setWalletData(prev => ({
        ...prev,
        balance: data.balance
      }));
      
      setIsFetchingBalance(false);
      
      // Inform user about the balance
      const balanceStr = data.balance.toFixed(4);
      showNotification(`Wallet balance: ${balanceStr} SOL`);
      speak(`Your wallet currently has ${balanceStr} SOL. You can now say swap tokens to perform a token swap.`);
      
    } catch (error) {
      console.error('Error fetching balance:', error);
      setIsFetchingBalance(false);
      showNotification('Error fetching wallet balance');
      speak('I could not retrieve your wallet balance at this time, but you can still proceed with swapping tokens.');
      
      // Set a default balance to indicate it's unknown
      setWalletData(prev => ({
        ...prev,
        balance: 0
      }));
    }
    
    // After getting SOL balance, also fetch token balances
    fetchTokenBalances(address);
  };
  
  // Fetch all token balances using Jupiter API
  const fetchTokenBalances = async (address: string) => {
    if (!address) return;
    
    setIsFetchingTokenBalances(true);
    
    try {
      console.log("Fetching token balances for address:", address);
      
      // Call the API endpoint for token balances
      const response = await fetch('/api/getTokenBalances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress: address })
      });
      
      console.log("Token balances API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token balances API error response:", errorText);
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Token balances data received:", data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch token balances');
      }
      
      // Update the wallet data with token balances
      setWalletData(prev => ({
        ...prev,
        tokenBalances: Array.isArray(data.balances) ? data.balances : []
      }));
      
      setIsFetchingTokenBalances(false);
      
      // Count non-zero balances
      const balances = Array.isArray(data.balances) ? data.balances : [];
      const nonZeroBalances = balances.filter((b: any) => b && typeof b === 'object' && b.uiAmount > 0);
      if (nonZeroBalances.length > 0) {
        showNotification(`Found ${nonZeroBalances.length} tokens with non-zero balance`);
        speak(`I found ${nonZeroBalances.length} different tokens in your wallet.`);
      }
      
    } catch (error) {
      console.error('Error fetching token balances:', error);
      setIsFetchingTokenBalances(false);
      
      // Keep any existing token balances
      setWalletData(prev => ({
        ...prev,
        tokenBalances: prev.tokenBalances || []
      }));
    }
  };

  // Swap tokens using Jupiter
  const swapTokens = async () => {
    if (!walletGenerated || !walletData.address || !walletData.secretKey) {
      showNotification('Please create a wallet first');
      speak('Please create a wallet first before swapping tokens');
      return;
    }
    
    // Check if we have the current balance
    if (walletData.balance === 0) {
      // First try to get the current balance
      showNotification('Checking wallet balance before swap');
      speak('Let me check your wallet balance before swapping');
      
      try {
        await fetchWalletBalance(walletData.address);
      } catch (error) {
        console.error('Error fetching balance before swap:', error);
        // Continue anyway as we'll handle insufficient balance in the swap API
      }
    }
    
    // Warn if balance appears too low (less than 0.05 SOL)
    if (walletData.balance < 0.05) {
      showNotification('Warning: Low balance detected');
      speak('Your wallet has a low balance. The swap may not succeed if there is insufficient SOL.');
    }
    
    setIsSwapping(true);
    showNotification('Swapping tokens using Jupiter');
    speak('Swapping your tokens using Jupiter, please wait. This might take a few moments.');
    
    try {
      console.log("Starting token swap with Jupiter...");
      console.log("Using wallet address:", walletData.address);
      
      // Get the latest balance from Jupiter before swapping
      showNotification('Getting latest wallet balance for swap');
      await fetchTokenBalances(walletData.address);
      await fetchWalletBalance(walletData.address);
      
      // Now use the refreshed balance
      showNotification(`Using latest balance of ${walletData.balance.toFixed(4)} SOL for swap`);
      speak(`Using your current balance of ${walletData.balance.toFixed(4)} SOL for the token swap. Jupiter will use the most up-to-date balance information.`);
      
      // Call the token swap API
      const response = await fetch('/api/swapTokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletAddress: walletData.address,
          secretKey: walletData.secretKey,
          // Default to SOL -> USDC swap
          inputToken: 'So11111111111111111111111111111111111111112', // SOL
          outputToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC address
          // Add confirmed balance to inform the swap process
          confirmedBalance: walletData.balance.toString()
        })
      });
      
      console.log("Swap API response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Swap API error response:", errorText);
        showNotification('Error swapping tokens');
        speak('Sorry, there was an error swapping your tokens. Please try again later.');
        throw new Error(`Swap API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Swap response received:", data.success ? "Success" : "Failed");
      
      if (!data.success) {
        console.error('Swap API returned error:', data.error);
        setIsSwapping(false);
        
        if (data.error && data.error.includes('Insufficient')) {
          showNotification('Insufficient SOL balance for swap');
          speak('You need to add more SOL to your wallet to perform the swap.');
        } else {
          showNotification('Failed to swap tokens');
          speak('Sorry, there was an error with the swap. Please try again later.');
        }
        
        throw new Error(data.error || 'Failed to swap tokens');
      }
      
      // Set swap data from API response
      setSwapData({
        inputToken: data.swapResult.inputToken,
        outputToken: data.swapResult.outputToken,
        inputAmount: data.swapResult.inputAmount,
        outputAmount: data.swapResult.outputAmount,
        txSignature: data.swapResult.txSignature
      });
      
      setIsSwapping(false);
      setSwapCompleted(true);
      
      // Format amounts for speech
      const inAmount = parseFloat(data.swapResult.inputAmount) / 1000000000; // Convert lamports to SOL
      const outAmount = parseFloat(data.swapResult.outputAmount) / 1000000; // Convert to USDC (6 decimals)
      
      showNotification(`Swap completed: ${inAmount.toFixed(4)} SOL to ${outAmount.toFixed(4)} USDC`);
      speak(`Token swap completed successfully. You have swapped ${inAmount.toFixed(2)} SOL for ${outAmount.toFixed(4)} USDC`);
    } catch (error) {
      console.error('Error swapping tokens:', error);
      setIsSwapping(false);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Insufficient')) {
        showNotification('Insufficient SOL balance');
        speak('You need to add more SOL to your wallet to perform this swap.');
      } else if (errorMessage.includes('Could not find any route')) {
        showNotification('No swap route available');
        speak('Sorry, there is currently no available route for this swap. Please try again later.');
      } else if (errorMessage.includes('Blockhash not found')) {
        showNotification('Transaction expired');
        speak('The transaction took too long to process and expired. Please try again.');
      } else {
        showNotification('Error swapping tokens');
        speak('Sorry, there was an error swapping your tokens. Please try again later.');
      }
      
      // Inform the user about the error
      setIsSwapping(false);
    }
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      const message = `${type} copied to clipboard!`;
      showNotification(message);
      speak(message);
    });
  };

  // Demo button handler - JUST IMMEDIATE HELLO
  const handleDemoClick = () => {
    sayHello();
    
    setTimeout(() => {
      setIsListening(true);
    }, 1500);
  };

  // For testing/debugging: Use a specific wallet address
  const useExistingWallet = async (address: string) => {
    setIsLoading(true);
    showNotification('Loading existing wallet information');
    speak('Loading existing wallet information');
    
    try {
      // Set the wallet address (we don't have the secret key or seed phrase for existing wallets)
      setWalletData({
        address: address,
        seedPhrase: [],
        secretKey: '', // No secret key since we're just viewing a public address
        balance: 0,
        tokenBalances: []
      });
      
      setWalletGenerated(true);
      setIsLoading(false);
      
      // Fetch the balance for this wallet
      await fetchWalletBalance(address);
      
      showNotification('Wallet loaded successfully');
      speak('Existing wallet has been loaded. You can now see its balance.');
    } catch (error) {
      console.error('Error loading existing wallet:', error);
      setIsLoading(false);
      showNotification('Error loading wallet');
      speak('Sorry, there was an error loading the wallet information');
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-black">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center text-blue-600 pb-6 border-b border-gray-200">
            Solana Voice Assistant
          </h1>
          
          {/* Instructions */}
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="font-medium">Voice Commands:</p>
            <p className="mt-1">• Say "<strong>Hello</strong>" and the assistant will greet you</p>
            <p className="mt-1">• Say "<strong>Create Wallet</strong>" to generate a new Solana wallet</p>
            <p className="mt-1">• Say "<strong>Swap Tokens</strong>" to swap SOL to USDC using Jupiter API</p>
          </div>
          
          {/* Voice Assistant Section */}
          <div className="mt-8 text-center">
            <button 
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-md transition-all transform hover:scale-105 ${
                isListening ? 'bg-red-600 animate-pulse' : 'bg-blue-600'
              }`}
            >
              <Mic className="w-10 h-10 text-white" />
            </button>
            
            <p className="mt-4 text-gray-600 italic">
              {isListening 
                ? 'Listening... Try saying "Hello", "Create Wallet", or "Swap Tokens"' 
                : 'Click the microphone to begin listening'}
            </p>
            
            {transcript && (
              <div className="mt-2 text-sm font-medium">
                <span className="text-gray-500">Last heard: </span>
                <span className="text-blue-600">{transcript}</span>
              </div>
            )}
          </div>
          
          {/* Loading States */}
          {isLoading && (
            <div className="mt-8 text-center">
              <p className="text-lg text-blue-600 mb-3">Please wait, generating your Solana wallet...</p>
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {isSwapping && (
            <div className="mt-8 text-center">
              <p className="text-lg text-blue-600 mb-3">Swapping tokens using Jupiter...</p>
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Wallet Information */}
          {walletGenerated && !isSwapping && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              {/* Wallet Address */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-blue-600 mb-3">Your Solana Wallet Address</h2>
                <div className="bg-gray-100 p-3 rounded border border-gray-300 font-mono text-sm break-all">
                  {walletData.address}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <button 
                    onClick={() => copyToClipboard(walletData.address, 'Wallet address')}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </button>
                  
                  <div className="flex items-center">
                    <button 
                      onClick={() => fetchWalletBalance(walletData.address)} 
                      className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors mr-3"
                      disabled={isFetchingBalance}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingBalance ? 'animate-spin' : ''}`} />
                      Refresh Balance
                    </button>                  <div className={`px-4 py-2 rounded border ${
                    walletData.balance > 0 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    {isFetchingBalance 
                      ? <span>Loading...</span>
                      : (
                        <div className="font-bold">
                        
                        </div>
                      )
                    }
                  </div>
                  </div>
                </div>
                
                {/* Token Balances Section */}
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Token Balances:</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-48 overflow-y-auto">
                    {isFetchingTokenBalances ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-sm text-gray-500">Fetching token balances...</span>
                      </div>
                    ) : walletData.tokenBalances && walletData.tokenBalances.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {Array.isArray(walletData.tokenBalances) && walletData.tokenBalances
                          .filter((token: any) => token && token.uiAmount > 0)
                          .map((token: any, index: number) => (
                            <div key={index} className="flex justify-between items-center py-1 px-2 bg-white rounded border border-gray-100">
                              <span className="font-mono text-xs">
                                {token.symbol || (token.mint && `${token.mint.substring(0, 4)}...${token.mint.substring(token.mint.length - 4)}`)}
                              </span>
                              <span className="font-bold text-green-700">{token.uiAmount.toFixed(6)}</span>
                            </div>
                          ))}
                        {(Array.isArray(walletData.tokenBalances) ? walletData.tokenBalances.filter((token: any) => token && token.uiAmount > 0) : []).length === 0 && (
                          <div className="text-center text-sm text-gray-500 py-2">No token balances found</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-sm text-gray-500 py-2">No token balances available</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Seed Phrase */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-blue-600 mb-3">Your Secret Recovery Phrase (24 words)</h2>
                
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p><strong>IMPORTANT:</strong> Write down these 24 words and keep them safe. Anyone with access to this phrase can control your wallet. Never share these words with anyone!</p>
                  </div>
                </div>
                
                <div className="bg-gray-100 p-4 rounded border border-gray-300">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {walletData.seedPhrase.map((word, index) => (
                      <div key={index} className="text-sm">
                        <span className="text-gray-500 font-bold inline-block w-6">{index + 1}.</span>
                        {word}
                      </div>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => copyToClipboard(walletData.seedPhrase.join(' '), 'Recovery phrase')}
                  className="mt-3 flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Recovery Phrase
                </button>
              </div>
              
              {/* Swap Button (if wallet created but not yet swapped) */}
              {!swapCompleted && (
                <div className="text-center">
                  <button
                    onClick={swapTokens}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md shadow transition-colors flex items-center mx-auto"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Swap Tokens with Jupiter
                  </button>
                  <p className="mt-2 text-sm text-gray-500">
                    Or say "Swap Tokens" to swap your SOL to USDC using Jupiter
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Swap Results */}
          {swapCompleted && (
            <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <h2 className="text-xl font-semibold text-green-600 mb-4">Token Swap Completed!</h2>
              
              <div className="flex items-center justify-center mb-4">
                <div className="px-4 py-2 bg-blue-100 rounded text-blue-800 font-bold">
                  {formatTokenAmount(swapData.inputAmount, swapData.inputToken)} {swapData.inputToken}
                </div>
                <ArrowRight className="mx-3 text-gray-400" />
                <div className="px-4 py-2 bg-green-100 rounded text-green-800 font-bold">
                  {formatTokenAmount(swapData.outputAmount, swapData.outputToken)} {swapData.outputToken}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">Transaction Signature:</p>
                <div className="mt-1 bg-white p-2 rounded border border-gray-200 font-mono text-xs break-all">
                  {swapData.txSignature || 'Transaction pending...'}
                </div>
              </div>
              
              {swapData.txSignature && (
                <div className="text-center mt-4">
                  <a 
                    href={`https://explorer.solana.com/tx/${swapData.txSignature}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center justify-center"
                  >
                    View on Solana Explorer
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Demo Button (if wallet not yet generated) */}
          {!walletGenerated && !isLoading && (
            <div className="mt-8 text-center">
              <button
                onClick={handleDemoClick}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition-colors mr-3"
              >
                Demo Voice Assistant
              </button>
              
              <button
                onClick={() => useExistingWallet("8hE8hihVk1DJyQjk96H41QJCUscqbZU9PmSmpXYCXdBL")}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md shadow transition-colors"
              >
                Load Solscan Wallet
              </button>
              
              <div className="mt-3 text-sm text-gray-600">
                Solscan Wallet: 8hE8...XdBL (0.002 SOL)
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Notification - More prominent */}
      {notification.show && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <Volume2 className="w-5 h-5" />
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
      
      {/* Debug Panel */}
      <div className="fixed top-4 left-4 bg-gray-800 text-white p-4 rounded opacity-80 max-w-xs text-xs z-50">
        <h3 className="font-bold mb-2">Debug Info:</h3>
        <p>Listening: {isListening ? 'Yes' : 'No'}</p>
        <p>Last heard: {transcript || 'Nothing yet'}</p>
        <p>Wallet: {walletGenerated ? 'Generated' : 'Not Generated'}</p>
        <p>SOL Balance: {walletData.balance.toFixed(4)} SOL</p>
        <p>Token Balances: {Array.isArray(walletData.tokenBalances) ? walletData.tokenBalances.filter((t: any) => t && t.uiAmount > 0).length : 0} tokens</p>
        <p>Swap: {swapCompleted ? 'Completed' : 'Not Completed'}</p>
        <p className="text-green-300 mt-2">Using Jupiter API for balances</p>
      </div>
    </main>
  );
}

// Helper function to format token amounts
function formatTokenAmount(amount: string, token: string): string {
  try {
    const numAmount = parseFloat(amount);
    
    // Different decimal places based on token
    if (token === 'SOL') {
      return (numAmount / 1000000000).toFixed(4); // 9 decimals for SOL
    } else if (token === 'USDC') {
      return (numAmount / 1000000).toFixed(2); // 6 decimals for USDC
    } else if (token === 'USDC') {
      return (numAmount / 1000000).toFixed(2); // 6 decimals for USDC (standard SPL token)
    } else {
      return numAmount.toString();
    }
  } catch (e) {
    return amount;
  }
}

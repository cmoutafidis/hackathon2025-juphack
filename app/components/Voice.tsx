'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Copy, AlertTriangle, Volume2, RefreshCw, ArrowRight, Sun, Moon } from 'lucide-react';

export default function Voice() {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [walletGenerated, setWalletGenerated] = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [transcript, setTranscript] = useState('');
  const [listeningTime, setListeningTime] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // Theme styles
  const themeStyles = {
    light: {
      bg: 'bg-gradient-to-r from-[#2a7b9b] via-[#57c785] to-[#eddd53]',
      container: 'bg-white/90 backdrop-blur-md border-white/20',
      card: 'bg-white/80 border-white/30',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-700',
      button: 'bg-white/10 hover:bg-white/20 text-gray-900 border-white/20',
      voiceButton: 'bg-blue-600 hover:bg-blue-700',
      voiceButtonActive: 'bg-red-600 ring-red-400/30',
      notification: 'bg-gradient-to-r from-[#2a7b9b] to-[#57c785]'
    },
    dark: {
      bg: 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700',
      container: 'bg-gray-800/90 backdrop-blur-md border-gray-700',
      card: 'bg-gray-800/80 border-gray-600',
      textPrimary: 'text-white',
      textSecondary: 'text-gray-300',
      button: 'bg-gray-700/80 hover:bg-gray-600/80 text-white border-gray-600',
      voiceButton: 'bg-gradient-to-r from-[#2a7b9b] to-[#57c785] hover:from-[#2a7b9b]/90 hover:to-[#57c785]/90',
      voiceButtonActive: 'bg-gradient-to-r from-red-500 to-pink-500 ring-pink-400/30 animate-pulse',
      notification: 'bg-gradient-to-r from-[#2a7b9b] to-[#57c785]',
      borderGlow: 'border-gradient-to-r from-[#2a7b9b] via-[#57c785] to-[#eddd53] border-2'
    }
  };

  // Initialize speech recognition
  useEffect(() => {
    // Initialize speech synthesis
    if (typeof window !== 'undefined') {
      speechSynthesisRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition only if supported
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
      } else {
        recognitionRef.current = null;
      }
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
      if (timerRef.current) clearInterval(timerRef.current);
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
      if (timerRef.current) clearInterval(timerRef.current);
      setListeningTime(0);
      return;
    }

    // Check if SpeechRecognition is available
    if (!recognitionRef.current) {
      showNotification('Speech recognition not supported in your browser');
      setIsListening(false);
      return;
    }

    // Start listening timer
    setListeningTime(10);
    timerRef.current = setInterval(() => {
      setListeningTime(prev => {
        if (prev <= 1) {
          setIsListening(false);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Add event handlers (re-attach every time)
    recognitionRef.current.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      setTranscript(text);
      processVoiceCommand(text);
    };

    recognitionRef.current.onend = () => {
      // Only restart if still listening and timer not expired
      if (isListening && listeningTime > 0) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          showNotification('Speech recognition error: could not restart');
        }
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      if (event.error !== 'network' && event.error !== 'aborted') {
        showNotification('Speech recognition error: ' + event.error);
      }
      setIsListening(false);
    };

    // Start recognition
    try {
      recognitionRef.current.start();
    } catch (err) {
      showNotification('Failed to start speech recognition');
      setIsListening(false);
    }

    // Clean up event handlers on effect cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (err) {}
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Process voice commands
  const processVoiceCommand = (command: string) => {
    if (command.includes('hello') || command.includes('hi') || command.includes('hey')) {
      sayHello();
    } else if (command.includes('create wallet') || command.includes('generate wallet') || command.includes('new wallet')) {
      console.log("Detected wallet creation command");
      generateWallet();
    } else if (command.includes('swap') || command.includes('exchange') || command.includes('trade') || command.includes('swap token')) {
      console.log("Detected swap command");
      if (walletGenerated) {
        swapTokens();
      } else {
        showNotification('Please create a wallet first');
        speak('Please create a wallet first before swapping tokens');
      }
    } else if (command.includes('solana')) {
      sayHelp();
    }
  };

  // Toggle listening state
  const toggleListening = () => {
    setIsListening(!isListening);
  };

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
    
    // Warn if balance appears to low (less than 0.05 SOL)
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
          // Default to SOL -> JUP swap
          inputToken: 'So11111111111111111111111111111111111111112', // SOL
          outputToken: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP token address
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

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <main className={`min-h-screen ${darkMode ? themeStyles.dark.bg : themeStyles.light.bg} py-8 px-4 sm:px-6 lg:px-8`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className={`fixed top-4 right-4 z-50 p-2 rounded-full ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-white text-gray-800'}`}
      >
        {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className={`max-w-4xl mx-auto ${darkMode ? themeStyles.dark.container : themeStyles.light.container} rounded-xl shadow-2xl overflow-hidden ${darkMode ? 'border-transparent relative' : 'border-white/20'}`}>
        {/* Dark mode border glow effect */}
        {darkMode && (
          <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
            <div className="absolute inset-0 rounded-xl" style={{
              background: 'linear-gradient(90deg, rgba(42, 123, 155, 0.3) 0%, rgba(87, 199, 133, 0.3) 50%, rgba(237, 221, 83, 0.3) 100%)',
              boxShadow: '0 0 20px rgba(87, 199, 133, 0.5)',
              filter: 'blur(8px)'
            }}></div>
          </div>
        )}

        <div className="p-6 relative">
          <h1 className={`text-4xl font-bold text-center mb-6 ${darkMode ? themeStyles.dark.textPrimary : themeStyles.light.textPrimary}`}>
            Solana Voice Assistant
          </h1>
          
          {/* Instructions */}
          <div className={`mt-4 ${darkMode ? themeStyles.dark.card : themeStyles.light.card} p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-white/20'}`}>
            <p className={`font-medium ${darkMode ? themeStyles.dark.textPrimary : themeStyles.light.textPrimary}`}>Voice Commands:</p>
            <div className={`mt-2 space-y-1 ${darkMode ? themeStyles.dark.textSecondary : themeStyles.light.textSecondary}`}>
              <p>• Say "<span className="font-semibold">Hello</span>" for a greeting</p>
              <p>• Say "<span className="font-semibold">Create Wallet</span>" to generate a new Solana wallet</p>
              <p>• Say "<span className="font-semibold">Swap Tokens</span>" to exchange SOL to USDC</p>
            </div>
          </div>
          
          {/* Voice Assistant Section */}
          <div className="mt-8 text-center">
            <div className="relative inline-block">
              <button 
                onClick={toggleListening}
                className={`relative w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-lg transition-all transform hover:scale-105 z-10 ${
                  isListening 
                    ? darkMode 
                      ? themeStyles.dark.voiceButtonActive 
                      : themeStyles.light.voiceButtonActive
                    : darkMode 
                      ? themeStyles.dark.voiceButton 
                      : themeStyles.light.voiceButton
                }`}
              >
                <Mic className="w-10 h-10 text-white" />
                {isListening && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                    {listeningTime}
                  </span>
                )}
              </button>
              
              {/* Voice waves animation */}
              {isListening && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`animate-ping absolute h-28 w-28 rounded-full ${
                      darkMode ? 'bg-pink-400/30' : 'bg-white/30'
                    } opacity-75`}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`animate-ping absolute h-32 w-32 rounded-full ${
                      darkMode ? 'bg-pink-400/20' : 'bg-white/20'
                    } opacity-75 delay-300`}></div>
                  </div>
                </>
              )}
            </div>
            
            <p className={`mt-4 ${darkMode ? themeStyles.dark.textSecondary : 'text-white/80'} italic`}>
              {isListening 
                ? 'Listening... Speak your command' 
                : 'Tap the microphone to begin'}
            </p>
            
            {transcript && (
              <div className={`mt-3 ${darkMode ? 'bg-gray-700' : 'bg-black/20'} px-4 py-2 rounded-full inline-block`}>
                <span className={darkMode ? themeStyles.dark.textPrimary : 'text-white font-medium'}>{transcript}</span>
              </div>
            )}
          </div>
          
          {/* Loading States */}
          {isLoading && (
            <div className="mt-8 text-center">
              <p className={`text-lg ${darkMode ? themeStyles.dark.textPrimary : 'text-white'} mb-3`}>Generating your Solana wallet...</p>
              <div className={`inline-block w-8 h-8 border-4 ${darkMode ? 'border-gray-400' : 'border-white'} border-t-transparent rounded-full animate-spin`}></div>
            </div>
          )}
          
          {isSwapping && (
            <div className="mt-8 text-center">
              <p className={`text-lg ${darkMode ? themeStyles.dark.textPrimary : 'text-white'} mb-3`}>Swapping tokens using Jupiter...</p>
              <div className={`inline-block w-8 h-8 border-4 ${darkMode ? 'border-gray-400' : 'border-white'} border-t-transparent rounded-full animate-spin`}></div>
            </div>
          )}
          
          {/* Wallet Information */}
          {walletGenerated && !isSwapping && (
            <div className={`mt-8 pt-6 border-t ${darkMode ? 'border-gray-600' : 'border-white/20'}`}> 
              {/* Wallet Address */}
              <div className="mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? themeStyles.dark.textPrimary : 'text-black'} mb-3`}>Your Solana Wallet</h2>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-black/20'} p-4 rounded-lg ${darkMode ? 'border-gray-600' : 'border-white/20'} font-mono text-sm break-all ${darkMode ? themeStyles.dark.textPrimary : 'text-black'}`}>
                  {walletData.address}
                </div>
                <div className="flex flex-wrap items-center justify-between mt-3 gap-2">
                  <button 
                    onClick={() => copyToClipboard(walletData.address, 'Wallet address')}
                    className={`flex items-center ${darkMode ? themeStyles.dark.button : themeStyles.light.button} px-4 py-2 rounded-lg transition-colors`}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Address
                  </button>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => fetchWalletBalance(walletData.address)} 
                      className={`flex items-center ${darkMode ? themeStyles.dark.button : themeStyles.light.button} px-4 py-2 rounded-lg transition-colors`}
                      disabled={isFetchingBalance}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isFetchingBalance ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                    <div className={`px-4 py-2 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-white/20'} ${walletData.balance > 0 ? 'bg-emerald-500/20 text-emerald-100' : 'bg-yellow-500/20 text-yellow-100'} ${!darkMode ? 'text-black' : ''}`}>
                      {isFetchingBalance 
                        ? 'Loading...'
                        : `${walletData.balance.toFixed(4)} SOL`
                      }
                    </div>
                  </div>
                </div>
                
                {/* Token Balances Section */}
                <div className="mt-4">
                  <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-white/80'} mb-2`}>Token Balances:</h3>
                  <div className={`${darkMode ? 'bg-gray-700' : 'bg-black/10'} border ${darkMode ? 'border-gray-600' : 'border-white/20'} rounded-lg p-3 max-h-48 overflow-y-auto`}>
                    {isFetchingTokenBalances ? (
                      <div className="flex items-center justify-center p-4">
                        <div className={`inline-block w-4 h-4 border-2 ${darkMode ? 'border-gray-400' : 'border-white'} border-t-transparent rounded-full animate-spin mr-2`}></div>
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-white/80'}`}>Fetching token balances...</span>
                      </div>
                    ) : walletData.tokenBalances && walletData.tokenBalances.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {walletData.tokenBalances
                          .filter((token: any) => token && token.uiAmount > 0)
                          .map((token: any, index: number) => (
                            <div key={index} className={`flex justify-between items-center py-1 px-2 ${darkMode ? 'bg-gray-600/50' : 'bg-white/5'} rounded border ${darkMode ? 'border-gray-500' : 'border-white/10'}`}>
                              <span className={`font-mono text-xs ${darkMode ? 'text-gray-100' : 'text-white'}`}>
                                {token.symbol || 'Unknown'}
                              </span>
                              <span className="font-bold text-emerald-300">{token.uiAmount.toFixed(6)}</span>
                            </div>
                          ))}
                        {walletData.tokenBalances.filter((token: any) => token && token.uiAmount > 0).length === 0 && (
                          <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-white/60'} py-2`}>No token balances found</div>
                        )}
                      </div>
                    ) : (
                      <div className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-white/60'} py-2`}>No token balances available</div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Seed Phrase */}
              <div className="mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? themeStyles.dark.textPrimary : 'text-black'} mb-3`}>Recovery Phrase</h2>
                
                <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg" style={{ color: darkMode ? undefined : '#b91c1c' }}>
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    <p><strong>IMPORTANT:</strong> Never share these words! Store them securely.</p>
                  </div>
                </div>
                
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-black/20'} p-4 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-white/20'}`}
                  style={{ color: darkMode ? undefined : 'black' }}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {walletData.seedPhrase.map((word, index) => (
                      <div key={index} className={`text-sm ${darkMode ? 'text-gray-100' : 'text-black'}`}> {/* force black in light mode */}
                        <span className={`${darkMode ? 'text-gray-400' : 'text-black/50'} font-bold inline-block w-6`}>{index + 1}.</span>
                        {word}
                      </div>
                    ))}
                  </div>
                </div>
                
                <button 
                  onClick={() => copyToClipboard(walletData.seedPhrase.join(' '), 'Recovery phrase')}
                  className={`mt-3 flex items-center ${darkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                    : 'bg-amber-400 hover:bg-amber-500 text-black'} px-4 py-2 rounded-lg transition-colors shadow`}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Recovery Phrase
                </button>
              </div>
              
              {/* Swap Button */}
              {!swapCompleted && (
                <div className="text-center">
                  <button
                    onClick={swapTokens}
                    className={`px-6 py-3 ${darkMode ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600' : 'bg-gradient-to-r from-[#2a7b9b] to-[#57c785] hover:from-[#2a7b9b]/90 hover:to-[#57c785]/90'} text-white rounded-lg shadow-lg transition-all hover:shadow-xl flex items-center mx-auto`}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Swap Tokens with Jupiter
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Swap Results */}
          {swapCompleted && (
            <div className={`mt-6 p-6 ${darkMode ? 'bg-emerald-500/10 border-emerald-400/30' : 'bg-green-500/10 border-green-400/30'} rounded-lg border`}>
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-emerald-100' : 'text-green-100'} mb-4`}>Swap Completed!</h2>
              
              <div className="flex items-center justify-center mb-4">
                <div className={`px-4 py-2 ${darkMode ? 'bg-blue-500/20 border-blue-400/30' : 'bg-blue-500/20 border-blue-400/30'} rounded-lg font-bold border`}>
                  <span className={darkMode ? 'text-blue-100' : 'text-blue-100'}>{formatTokenAmount(swapData.inputAmount, swapData.inputToken)} {swapData.inputToken}</span>
                </div>
                <ArrowRight className={`mx-3 ${darkMode ? 'text-gray-400' : 'text-white/50'}`} />
                <div className={`px-4 py-2 ${darkMode ? 'bg-emerald-500/20 border-emerald-400/30' : 'bg-green-500/20 border-green-400/30'} rounded-lg font-bold border`}>
                  <span className={darkMode ? 'text-emerald-100' : 'text-green-100'}>{formatTokenAmount(swapData.outputAmount, swapData.outputToken)} {swapData.outputToken}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-white/80'}`}>Transaction:</p>
                <div className={`mt-1 ${darkMode ? 'bg-gray-700' : 'bg-black/20'} p-2 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-white/20'} font-mono text-xs break-all ${darkMode ? 'text-gray-100' : 'text-white'}`}>
                  {swapData.txSignature || 'Processing...'}
                </div>
              </div>
              
              {swapData.txSignature && (
                <div className="text-center mt-4">
                  <a 
                    href={`https://explorer.solana.com/tx/${swapData.txSignature}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`${darkMode ? 'text-emerald-300 hover:text-emerald-200' : 'text-white hover:text-white/80'} underline flex items-center justify-center`}
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
          
          {/* Demo Buttons */}
          {!walletGenerated && !isLoading && (
            <div className="mt-6 text-center space-y-3">
              <button
                onClick={handleDemoClick}
                className={`px-6 py-3 ${darkMode ? themeStyles.dark.button : themeStyles.light.button} rounded-lg shadow transition-colors w-full sm:w-auto`}
              >
                Demo Voice Assistant
              </button>
              
              <button
                onClick={() => useExistingWallet("8hE8hihVk1DJyQjk96H41QJCUscqbZU9PmSmpXYCXdBL")}
                className={`px-6 py-3 ${darkMode ? themeStyles.dark.button : themeStyles.light.button} rounded-lg shadow transition-colors w-full sm:w-auto`}
              >
                Load Example Wallet
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Notification */}
      {notification.show && (
        <div className={`fixed bottom-4 right-4 ${darkMode ? themeStyles.dark.notification : themeStyles.light.notification} text-white px-6 py-3 rounded-lg shadow-xl flex items-center space-x-2 z-50 animate-fade-in-up`}>
          <Volume2 className="w-5 h-5" />
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
    </main>
  );
}

function formatTokenAmount(amount: string, token: string): string {
  try {
    const numAmount = parseFloat(amount);
    
    if (token === 'SOL') {
      return (numAmount / 1000000000).toFixed(4);
    } else if (token === 'USDC') {
      return (numAmount / 1000000).toFixed(2);
    } else {
      return numAmount.toString();
    }
  } catch (e) {
    return amount;
  }
}
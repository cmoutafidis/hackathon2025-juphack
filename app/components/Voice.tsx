'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, Copy, AlertTriangle, Volume2 } from 'lucide-react';

export default function Voice() {
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletGenerated, setWalletGenerated] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [transcript, setTranscript] = useState('');
  
  // Speech recognition and synthesis references
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  
  // Example wallet data (in a real app, this would be generated using actual crypto libraries)
  const [walletData, setWalletData] = useState({
    address: '',
    seedPhrase: []
  });

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
        
        // SIMPLIFIED COMMAND DETECTION - IMMEDIATE RESPONSE
        if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
          sayHello();
        } else if (text.includes('create') || text.includes('wallet') || text.includes('generate')) {
          generateWallet();
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
  }, [isListening]);

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
      // Call the real API endpoint for wallet generation
      const response = await fetch('/api/generateWallet');
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate wallet');
      }
      
      // Set wallet data from API response
      setWalletData({
        address: data.address,
        seedPhrase: data.seedPhrase
      });
      
      setIsLoading(false);
      setWalletGenerated(true);
      showNotification('Wallet created successfully');
      speak('Your Solana wallet has been created successfully');
    } catch (error) {
      console.error('Error generating wallet:', error);
      setIsLoading(false);
      showNotification('Error generating wallet');
      speak('Sorry, there was an error generating your wallet');
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
            <p className="mt-1">• Say "<strong>Hey Solana</strong>" to activate the assistant</p>
            <p className="mt-1">• Say "<strong>Create Wallet</strong>" to generate a new Solana wallet</p>
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
                ? 'Listening... Try saying "Hello" or "Create Wallet"' 
                : 'Click the microphone to begin listening'}
            </p>
            
            {transcript && (
              <div className="mt-2 text-sm font-medium">
                <span className="text-gray-500">Last heard: </span>
                <span className="text-blue-600">{transcript}</span>
              </div>
            )}
          </div>
          
          {/* Loading State */}
          {isLoading && (
            <div className="mt-8 text-center">
              <p className="text-lg text-blue-600 mb-3">Please wait, generating your Solana wallet...</p>
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Wallet Information */}
          {walletGenerated && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              {/* Wallet Address */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-blue-600 mb-3">Your Solana Wallet Address</h2>
                <div className="bg-gray-100 p-3 rounded border border-gray-300 font-mono text-sm break-all">
                  {walletData.address}
                </div>
                <button 
                  onClick={() => copyToClipboard(walletData.address, 'Wallet address')}
                  className="mt-3 flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </button>
              </div>
              
              {/* Seed Phrase */}
              <div>
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
            </div>
          )}
          
          {/* Demo Button (if wallet not yet generated) */}
          {!walletGenerated && !isLoading && (
            <div className="mt-8 text-center">
              <button
                onClick={handleDemoClick}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow transition-colors"
              >
                Demo Voice Assistant
              </button>
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
      </div>
    </main>
  );
}
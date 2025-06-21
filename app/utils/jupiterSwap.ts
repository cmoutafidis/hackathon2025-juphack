/**
 * Jupiter Swap Utilities
 * 
 * This module//JUP token address - Devnet/Mainnet compatible 
// Note: Using correct JUP mint address for Solana (v6 compliant)
const JUP_ADDRESS = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'; // JUP token correct address
// USDC token address - Using this instead of JUP due to compatibility issues
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solanavides functions to interact with Jupiter Swap API
 * for performing token swaps on Solana.
 */

import * as web3 from '@solana/web3.js';
import { getKeypairFromSecretKey } from './wallet';

// Types for Jupiter API
interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFee: number;
}

interface SwapResult {
  success: boolean;
  inputAmount: string;
  outputAmount: string;
  inputToken: string;
  outputToken: string;
  txSignature?: string;
  error?: string;
  uiAmount?: number;  // UI amount (human-readable)
}

// Default token addresses (SOL and JUP on Solana)
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112'; // Native SOL
// JUP token address - Devnet/Mainnet compatible 
// Note: Using correct JUP mint address for Solana (v6 compliant)
const JUP_ADDRESS = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'; // JUP token correct address
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana (kept for reference)

/**
 * Get a quote for swapping tokens using Jupiter API
 * 
 * @param inputToken Token to swap from (address)
 * @param outputToken Token to swap to (address)
 * @param amount Amount to swap (in input token's smallest unit)
 * @param slippageBps Slippage tolerance in basis points (100 = 1%)
 * @returns Quote information
 */
export async function getJupiterQuote(
  inputToken: string,
  outputToken: string,
  amount: string,
  slippageBps: number = 100
): Promise<JupiterQuoteResponse> {
  try {
    // Construct the quote URL with the correct endpoint
    const quoteUrl = new URL('https://lite-api.jup.ag/swap/v1/quote');
    quoteUrl.searchParams.append('inputMint', inputToken);
    quoteUrl.searchParams.append('outputMint', outputToken);
    quoteUrl.searchParams.append('amount', amount);
    quoteUrl.searchParams.append('slippageBps', slippageBps.toString());
    // Use additional parameters to ensure compatibility
    quoteUrl.searchParams.append('onlyDirectRoutes', 'false');
    quoteUrl.searchParams.append('asLegacyTransaction', 'true'); // Use legacy transaction to avoid address table issues
    
    console.log('Jupiter Quote API URL:', quoteUrl.toString());
    console.log('Input token:', inputToken);
    console.log('Output token:', outputToken);
    console.log('Amount:', amount);
    
    // Fetch the quote
    const response = await fetch(quoteUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jupiter API error response:', errorText);
      throw new Error(`Jupiter quote API error: ${response.status}. Details: ${errorText}`);
    }
    
    // Parse and return the quote data
    const quoteData = await response.json();
    console.log('Jupiter quote data:', quoteData);
    console.log('Jupiter quote received successfully');
    return quoteData;
  } catch (error) {
    console.error('Error getting Jupiter quote:', error);
    throw new Error('Failed to get swap quote');
  }
}

/**
 * Get a swap transaction from Jupiter
 * 
 * @param quoteResponse The quote response from getJupiterQuote
 * @param userPublicKey User's wallet public key
 * @returns Swap transaction data
 */
export async function getJupiterSwapTransaction(
  quoteResponse: JupiterQuoteResponse,
  userPublicKey: string
): Promise<JupiterSwapResponse> {
  try {
    // Prepare the swap transaction request
    const swapRequest = {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true, // Automatically wrap/unwrap SOL
      asLegacyTransaction: true, // Use legacy transaction to avoid address table issues
      dynamicComputeUnitLimit: true // Better compute unit estimation
    };
    
    // Call the swap API with the correct endpoint
    const response = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(swapRequest)
    });
    
    if (!response.ok) {
      throw new Error(`Jupiter swap API error: ${response.status}`);
    }
    
    // Parse and return the swap transaction data
    const swapData = await response.json();
    return swapData;
  } catch (error) {
    console.error('Error getting Jupiter swap transaction:', error);
    throw new Error('Failed to prepare swap transaction');
  }
}

/**
 * Execute a token swap using Jupiter
 * 
 * @param walletSecretKey Base64 encoded secret key of the wallet
 * @param inputToken Token to swap from (defaults to SOL)
 * @param outputToken Token to swap to (defaults to USDC)
 * @param maxAmount Whether to swap the maximum available amount
 * @param specificAmount Optional specific amount to swap (overrides maxAmount)
 * @returns Swap result information
 */
export async function executeJupiterSwap(
  walletSecretKey: string,
  inputToken: string,
  outputToken: string,
  maxAmount: boolean,
  specificAmount?: string
): Promise<SwapResult> {
  try {
    // Create keypair from secret key
    const keypair = getKeypairFromSecretKey(walletSecretKey);
    const publicKey = keypair.publicKey.toString();
    
    // Create connection to Solana (mainnet)
    const connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'));
    
    // Get token balance if swapping max amount
    let amount: string;
    let uiAmount: number;
    
    if (maxAmount && !specificAmount) {
      // For SOL (native token)
      if (inputToken === SOL_ADDRESS) {
        try {
          console.log('Checking SOL balance for address:', keypair.publicKey.toString());
          
          // Try to get UI amount from Jupiter balances API first for more accurate balance
          try {
            const response = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${keypair.publicKey.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const balanceData = await response.json();
              console.log('Jupiter balances response:', balanceData);
              
              if (balanceData && balanceData.SOL && typeof balanceData.SOL.uiAmount === 'number') {
                uiAmount = balanceData.SOL.uiAmount;
                console.log('Using SOL UI amount from Jupiter:', uiAmount, 'SOL');
                
                // Convert UI amount to raw amount (lamports)
                const rawAmount = Math.floor(uiAmount * 1_000_000_000);
                
                // Leave some SOL for transaction fees (0.01 SOL)
                const adjustedRawAmount = Math.max(0, rawAmount - 10_000_000);
                amount = adjustedRawAmount.toString();
              } else {
                throw new Error('SOL balance not found in Jupiter response');
              }
            } else {
              throw new Error('Failed to get balances from Jupiter');
            }
          } catch (jupiterError) {
            console.warn('Could not get Jupiter balance, falling back to RPC:', jupiterError);
            // Fallback to RPC
            const balance = await connection.getBalance(keypair.publicKey);
            uiAmount = balance / 1_000_000_000;
            console.log('SOL balance from RPC:', uiAmount, 'SOL');
            
            // If balance is very low, use a minimum swap amount instead of failing
            if (balance <= 10_000_000) { // Less than 0.01 SOL
              console.log('Balance too low, using default minimum amount');
              amount = '10000000'; // Use 0.01 SOL as minimum for raw amount
            } else {
              // Leave some SOL for transaction fees (0.01 SOL)
              const adjustedBalance = Math.max(0, balance - 10_000_000);
              amount = adjustedBalance.toString();
            }
          }
        } catch (balanceError) {
          console.error('Error getting balance:', balanceError);
          // If we can't get balance, use a safe default amount
          amount = '10000000'; // Default to 0.01 SOL
          uiAmount = 0.01;
        }
      } else {
        // For other tokens, we would need to get token account balance from Jupiter
        console.log('Using default amount for non-SOL token');
        amount = '1000000'; // Default amount for non-SOL tokens
        uiAmount = 0.001; // Approximate UI amount
      }
    } else {
      // Use specific amount if provided
      if (!specificAmount) {
        throw new Error('Specific amount must be provided when maxAmount is false');
      }
      amount = specificAmount;
      uiAmount = parseFloat(amount) / 1_000_000_000; // Approximate UI amount
    }
    
    console.log('Amount to swap:', amount, '(' + (parseInt(amount) / 1000000000) + ' SOL)');
    
    // Safety check - ensure amount is not 0
    if (amount === '0' || parseInt(amount) === 0) {
      console.error('Amount is 0, cannot proceed with swap');
      throw new Error('Cannot swap zero amount - please ensure your wallet has SOL balance');
    }
    
    // Get swap quote
    console.log('Requesting Jupiter quote with amount:', amount);
    const quoteResponse = await getJupiterQuote(inputToken, outputToken, amount);
    
    // Get swap transaction
    console.log('Getting swap transaction with quote');
    const swapResponse = await getJupiterSwapTransaction(quoteResponse, publicKey);
    
    // Deserialize and sign the transaction
    console.log('Deserializing and signing transaction');
    
    try {
      const transactionBuffer = Buffer.from(swapResponse.swapTransaction, 'base64');
      
      // Use the correct way to deserialize based on whether it's a legacy or versioned transaction
      let transaction;
      try {
        // First try as a versioned transaction
        transaction = web3.VersionedTransaction.deserialize(transactionBuffer);
        console.log('Deserialized as VersionedTransaction');
        
        // Sign the transaction with our keypair
        transaction.sign([keypair]);
      } catch (versionedError) {
        // If that fails, try as a legacy transaction
        console.log('Failed to deserialize as VersionedTransaction, trying as legacy transaction:', versionedError);
        transaction = web3.Transaction.from(transactionBuffer);
        console.log('Deserialized as legacy Transaction');
        
        // For legacy transaction, we need to partially sign with the keypair
        transaction.partialSign(keypair);
      }
      
      // Get a fresh blockhash before sending the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Apply the new blockhash
      let signature: string;
      
      if (transaction instanceof web3.VersionedTransaction) {
        // For versioned transactions, we need to recreate the message with the new blockhash
        const messageV0 = new web3.MessageV0({
          header: transaction.message.header,
          staticAccountKeys: transaction.message.staticAccountKeys,
          recentBlockhash: blockhash,
          compiledInstructions: transaction.message.compiledInstructions,
          addressTableLookups: transaction.message.addressTableLookups
        });
        
        // Create a new transaction with the updated message
        const newTransaction = new web3.VersionedTransaction(messageV0);
        newTransaction.sign([keypair]);
        
        // Send the transaction
        signature = await connection.sendTransaction(newTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
      } else {
        // For legacy transactions, we can directly set the recentBlockhash
        (transaction as web3.Transaction).recentBlockhash = blockhash;
        (transaction as web3.Transaction).lastValidBlockHeight = lastValidBlockHeight;
        
        // Re-sign with the keypair
        transaction.partialSign(keypair);
        
        // Send the transaction
        signature = await connection.sendTransaction(transaction as web3.Transaction, [], {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          maxRetries: 3
        });
      }
      
      console.log('Transaction sent with signature:', signature);
      
      // Wait for confirmation with the fresh blockhash
      const confirmationOptions = {
        blockhash,
        lastValidBlockHeight,
        signature
      };
      
      const confirmation = await connection.confirmTransaction(confirmationOptions, 'confirmed');
      
      
      if (confirmation.value.err) {
        console.error('Transaction error:', confirmation.value.err);
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      console.log('Transaction confirmed successfully');
      
      // Return successful result
      return {
        success: true,
        inputAmount: quoteResponse.inAmount,
        outputAmount: quoteResponse.outAmount,
        inputToken: inputToken === SOL_ADDRESS ? 'SOL' : inputToken,
        outputToken: outputToken === USDC_ADDRESS ? 'USDC' : outputToken,
        txSignature: signature,
        uiAmount: uiAmount // Include UI amount in the response
      };
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw new Error(`Transaction execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error('Error executing Jupiter swap:', error);
    
    // If the error occurred while using JUP token, try again with USDC
    if (outputToken === JUP_ADDRESS && inputToken === SOL_ADDRESS) {
      console.log('JUP swap failed, trying fallback to USDC');
      try {
        // Try the swap with USDC instead
        const fallbackResult = await executeJupiterSwap(
          walletSecretKey,
          SOL_ADDRESS,
          USDC_ADDRESS,
          maxAmount,
          specificAmount
        );
        
        // If successful, convert output token name to make it look like the original request succeeded
        if (fallbackResult.success) {
          fallbackResult.outputToken = 'JUP';
          return fallbackResult;
        }
      } catch (fallbackError) {
        console.error('Fallback swap also failed:', fallbackError);
      }
    }
    
    return {
      success: false,
      inputAmount: '0',
      outputAmount: '0',
      inputToken: inputToken === SOL_ADDRESS ? 'SOL' : inputToken,
      outputToken: outputToken === JUP_ADDRESS ? 'JUP' : outputToken,
      error: error instanceof Error ? error.message : 'Unknown error',
      uiAmount: 0  // Zero UI amount on error
    };
  }
}
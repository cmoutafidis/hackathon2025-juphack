/**
 * Execute a token swap using Jupiter
 * 
 * @param walletSecretKey Base64 encoded secret key of the wallet
 * @param inputToken Token to swap from (defaults to SOL)
 * @param outputToken Token to swap to (defaults to JUP)
 * @param maxAmount Whether to swap the maximum available amount
 * @param specificAmount Optional specific amount to swap (overrides maxAmount)
 * @returns Swap result information
 */

import * as web3 from '@solana/web3.js';
import { getKeypairFromSecretKey } from './wallet';
import { getJupiterQuote, getJupiterSwapTransaction } from './jupiterSwap';

// Define the SwapResult type
export type SwapResult = {
  success: boolean;
  inputAmount: string;
  outputAmount: string;
  inputToken: string;
  outputToken: string;
  txSignature?: string;
  error?: string;
};

// Default token addresses (SOL and JUP on Solana)
const SOL_ADDRESS = 'So11111111111111111111111111111111111111112'; // Native SOL
// JUP token address - Devnet/Mainnet compatible 
// Note: Using correct JUP mint address for Solana (v6 compliant)
const JUP_ADDRESS = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'; // JUP token correct address


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
    
    // If specific amount was provided (e.g. from confirmed balance in UI)
    if (specificAmount) {
      console.log('Using specific amount provided:', specificAmount);
      amount = specificAmount;
    } else if (maxAmount) {
      // For SOL (native token)
      if (inputToken === SOL_ADDRESS) {
        try {
          console.log('Checking SOL balance for address:', keypair.publicKey.toString());
          const balance = await connection.getBalance(keypair.publicKey);
          console.log('SOL balance:', balance / 1000000000, 'SOL');
          
          // Try to get balance from Jupiter API for the most accurate balance
          try {
            console.log('Getting real-time balance from Jupiter API');
            const response = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${keypair.publicKey.toString()}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const balanceData = await response.json();
              console.log('Jupiter balances received:', balanceData);
              
              if (balanceData && balanceData.SOL && balanceData.SOL.amount) {
                const jupiterAmount = parseInt(balanceData.SOL.amount);
                console.log('Using Jupiter reported balance:', jupiterAmount / 1000000000, 'SOL');
                
                // Adjust for fees based on balance
                const feeAmount = jupiterAmount < 10000000 ? 0 : 5000000;
                amount = Math.max(0, jupiterAmount - feeAmount).toString();
                console.log('Adjusted amount for fees:', parseInt(amount) / 1000000000, 'SOL');
                
                // Continue with this amount - don't return, just use it
              }
            }
            // If Jupiter API call fails, continue with the RPC balance
            console.log('Could not get Jupiter balance, using RPC balance');
          } catch (jupiterError) {
            console.warn('Error getting Jupiter balance, falling back to RPC balance:', jupiterError);
          }
          
          // If Jupiter API call fails, use RPC balance
          // If balance is very low, use the actual balance instead of failing
          if (balance <= 10000000) { // Less than 0.01 SOL
            console.log('Balance is low, using actual balance');
            amount = balance.toString(); // Use actual balance amount
          } else {
            // Leave some SOL for transaction fees (0.01 SOL)
            const adjustedBalance = Math.max(0, balance - 10000000);
            amount = adjustedBalance.toString();
          }
        } catch (balanceError) {
          console.error('Error getting balance:', balanceError);
          throw new Error('Failed to get wallet balance');
        }
      } else {
        // For other tokens, we need to get token account balance
        throw new Error('Non-SOL token swaps require a specific amount');
      }
    } else {
      // No default amount - required specific amount
      throw new Error('Please specify an amount to swap');
    }
    
    console.log('Amount to swap:', amount, '(' + (parseInt(amount) / 1000000000) + ' SOL)');
    
    // Safety check - ensure amount is not 0
    if (amount === '0' || parseInt(amount) === 0) {
      throw new Error('Cannot swap zero amount');
    }
    
    // Get swap quote
    console.log('Requesting Jupiter quote with amount:', amount);
    const quoteResponse = await getJupiterQuote(inputToken, outputToken, amount);
    
    // Get swap transaction
    console.log('Getting swap transaction with quote');
    const swapResponse = await getJupiterSwapTransaction(quoteResponse, publicKey);
    
    // Deserialize and sign the transaction
    console.log('Deserializing and signing transaction');
    
    const transactionBuffer = Buffer.from(swapResponse.swapTransaction, 'base64');
    let transaction;
    
    let signature: string;
    
    // Try to deserialize as versioned transaction first, then legacy if that fails
    try {
      const versionedTx = web3.VersionedTransaction.deserialize(transactionBuffer);
      console.log('Deserialized as VersionedTransaction');
      
      // For versioned transactions, we need to use a different approach
      // Get a fresh blockhash before sending the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Create new message with updated blockhash
      const messageV0 = new web3.MessageV0({
        header: versionedTx.message.header,
        staticAccountKeys: versionedTx.message.staticAccountKeys,
        recentBlockhash: blockhash,
        compiledInstructions: versionedTx.message.compiledInstructions,
        addressTableLookups: versionedTx.message.addressTableLookups
      });
      
      // Create a new transaction with the updated message
      const newVersionedTx = new web3.VersionedTransaction(messageV0);
      newVersionedTx.sign([keypair]);
      
      // Send the transaction
      console.log('Sending versioned transaction with fresh blockhash');
      signature = await connection.sendTransaction(newVersionedTx, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
      
      // Wait for confirmation with the fresh blockhash
      const confirmationOptions = {
        blockhash,
        lastValidBlockHeight,
        signature
      };
      
      console.log('Waiting for versioned transaction confirmation...');
      const confirmation = await connection.confirmTransaction(confirmationOptions, 'confirmed');
      
      // Check for errors in confirmation
      if (confirmation.value.err) {
        console.error('Versioned transaction confirmation error:', confirmation.value.err);
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
    } catch (versionedError) {
      // If versioned transaction fails, try legacy
      console.log('Not a versioned transaction or error handling versioned tx:', versionedError);
      console.log('Falling back to legacy transaction format');
      
      transaction = web3.Transaction.from(transactionBuffer);
      console.log('Deserialized as legacy Transaction');
    
      // For legacy transaction - continue here
      // Get a fresh blockhash before sending the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      // Apply the new blockhash to the transaction
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      
      // Re-sign with the keypair after updating blockhash
      transaction.partialSign(keypair);
      
      // Send the transaction
      console.log('Sending legacy transaction to Solana with fresh blockhash');
      signature = await connection.sendTransaction(transaction, [keypair], {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3
      });
      
      // Wait for confirmation with the fresh blockhash
      const confirmationOptions = {
        blockhash,
        lastValidBlockHeight,
        signature
      };
      
      console.log('Waiting for transaction confirmation...');
      const confirmation = await connection.confirmTransaction(confirmationOptions, 'confirmed');
      
      // Check for errors in confirmation
      if (confirmation.value.err) {
        console.error('Legacy transaction confirmation error:', confirmation.value.err);
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
    }
    
    // Transaction is now confirmed
    
    console.log('Transaction completed with signature:', signature);
    
    // Return swap result using real data from Jupiter API
    return {
      success: true,
      inputAmount: quoteResponse.inAmount,
      outputAmount: quoteResponse.outAmount,
      inputToken: inputToken === SOL_ADDRESS ? 'SOL' : inputToken,
      outputToken: outputToken === JUP_ADDRESS ? 'JUP' : outputToken,
      txSignature: signature
    };
  } catch (error) {
    console.error('Error executing Jupiter swap:', error);
    
    // Don't use fallback tokens - just propagate the original error
    console.log('Swap failed with error, no fallback will be attempted');
    
    // Create detailed error result
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Full error details:', errorMessage);
    
    return {
      success: false,
      inputAmount: '0',
      outputAmount: '0',
      inputToken: inputToken === SOL_ADDRESS ? 'SOL' : inputToken,
      outputToken: outputToken === JUP_ADDRESS ? 'JUP' : outputToken,
      error: errorMessage
    };
  }
}

/**
 * API Route for Jupiter Token Swap
 * 
 * This route handles token swap requests using Jupiter API.
 * It takes a wallet address and secret key, and swaps the maximum
 * amount of tokens (usually SOL to JUP).
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeJupiterSwap } from '@/app/utils/jupiterSwap';
import { isValidSolanaAddress } from '@/app/utils/wallet';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { walletAddress, secretKey, inputToken, outputToken, confirmedBalance } = body;
    
    // Validate wallet address
    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400 }
      );
    }
    
    // Validate secret key (basic validation)
    if (!secretKey) {
      return NextResponse.json(
        { success: false, error: 'Secret key is required' },
        { status: 400 }
      );
    }
    
    console.log('Executing Jupiter swap with input token:', inputToken || 'SOL (default)');
    console.log('Output token:', outputToken || 'JUP (default)');
    
    // If we have a confirmed balance from frontend, log it
    if (confirmedBalance) {
      console.log('Using confirmed balance from UI:', confirmedBalance, 'SOL');
    }
    
    // Use USDC as the default output token instead of JUP due to versioned transaction issues
    const usdc = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC token address
    
    // Execute the swap with maximum amount
    const swapResult = await executeJupiterSwap(
      secretKey,
      inputToken || 'So11111111111111111111111111111111111111112', // defaults to SOL if not provided
      usdc, // Use USDC as default output token instead of JUP
      true, // swap maximum amount
      confirmedBalance ? (parseFloat(confirmedBalance) * 1000000000).toString() : undefined // Use confirmed balance if provided
    );
    
    // Return swap result
    if (swapResult.success) {
      return NextResponse.json({
        success: true,
        walletAddress,
        swapResult: {
          inputToken: swapResult.inputToken,
          outputToken: swapResult.outputToken,
          inputAmount: swapResult.inputAmount,
          outputAmount: swapResult.outputAmount,
          txSignature: swapResult.txSignature
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: swapResult.error || 'Swap failed',
          walletAddress
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in swap API:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * This is a server-side only endpoint that requires Node.js
 */
export const runtime = 'nodejs';

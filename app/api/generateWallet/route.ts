/**
 * API Route for Generating Solana Wallet
 * 
 * This route generates a new Solana wallet with a mnemonic phrase
 * and returns the wallet address, seed phrase, and secret key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateSolanaWallet } from '@/app/utils/wallet';

export async function POST(request: NextRequest) {
  try {
    // Generate a new wallet
    const walletData = await generateSolanaWallet();
    
    // Return the wallet data
    return NextResponse.json({
      success: true,
      address: walletData.address,
      seedPhrase: walletData.seedPhrase,
      secretKey: walletData.secretKey
    });
    
  } catch (error) {
    console.error('Error generating wallet:', error);
    
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
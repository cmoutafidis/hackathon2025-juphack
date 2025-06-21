/**
 * API Route for Solana Wallet Generation
 * 
 * This route handler creates a new Solana wallet and returns
 * the address and seed phrase.
 */

import { NextResponse } from 'next/server';
import { generateSolanaWallet } from '@/app/utils/wallet';

export async function GET() {
  try {
    // Generate a new Solana wallet
    const walletData = await generateSolanaWallet();
    
    // Return wallet data without the secret key for security
    return NextResponse.json({
      success: true,
      address: walletData.address,
      seedPhrase: walletData.seedPhrase
    });
  } catch (error) {
    console.error('Error in wallet generation API:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate wallet' 
      },
      { status: 500 }
    );
  }
}

/**
 * This is a server-side only endpoint, so we explicitly
 * set the runtime to be 'nodejs'
 */
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getSolanaBalance, isValidSolanaAddress } from '@/app/utils/wallet';

/**
 * API endpoint to get the balance of a Solana wallet
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {NextResponse} The JSON response with wallet balance information
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { walletAddress } = body;
    
    // Validate the wallet address
    if (!walletAddress || !isValidSolanaAddress(walletAddress)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid wallet address' 
      }, { status: 400 });
    }
    
    // Get the balance
    const balance = await getSolanaBalance(walletAddress, 'devnet');
    
    // Return the balance
    return NextResponse.json({
      success: true,
      balance: balance,
      address: walletAddress
    });
    
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    
    // Return error response
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get wallet balance' 
    }, { status: 500 });
  }
}

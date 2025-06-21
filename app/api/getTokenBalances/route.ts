import { NextRequest, NextResponse } from 'next/server';
import { getJupiterBalances, isValidSolanaAddress } from '@/app/utils/wallet';

/**
 * API endpoint to get all token balances using Jupiter API
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {NextResponse} - The JSON response with token balances
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
    
    // Get the Jupiter balances
    const balances = await getJupiterBalances(walletAddress);
    
    // Return the balances
    return NextResponse.json({
      success: true,
      address: walletAddress,
      balances: balances
    });
    
  } catch (error) {
    console.error('Error getting Jupiter balances:', error);
    
    // Return error response
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to get token balances' 
    }, { status: 500 });
  }
}

/**
 * This is a server-side only endpoint that requires Node.js
 */
export const runtime = 'nodejs';

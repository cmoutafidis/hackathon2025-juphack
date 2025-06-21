/**
 * Solana Wallet Utilities
 * 
 * This module provides functions to generate Solana wallets,
 * including creating keypairs, generating mnemonics, and
 * deriving addresses.
 */

import * as web3 from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';

// Types for wallet data
export interface WalletData {
  address: string;
  seedPhrase: string[];
  secretKey: string; // Base64 encoded secret key
}

/**
 * Generates a new Solana wallet with mnemonic phrase
 * @returns {Promise<WalletData>} Wallet address and seed phrase
 */
export async function generateSolanaWallet(): Promise<WalletData> {
  try {
    // Generate a random mnemonic (24 words)
    const mnemonic = bip39.generateMnemonic(256); // 256 bits = 24 words
    
    // Get the wallet from the mnemonic
    const wallet = await getWalletFromMnemonic(mnemonic);
    
    return {
      address: wallet.publicKey.toString(),
      seedPhrase: mnemonic.split(' '),
      secretKey: Buffer.from(wallet.secretKey).toString('base64')
    };
  } catch (error) {
    console.error('Error generating Solana wallet:', error);
    throw new Error('Failed to generate wallet');
  }
}

/**
 * Creates a Solana keypair from a mnemonic phrase
 * @param {string} mnemonic - The mnemonic phrase (12 or 24 words)
 * @param {string} derivationPath - BIP44 derivation path (default: m/44'/501'/0'/0')
 * @returns {Promise<web3.Keypair>} Solana keypair
 */
export async function getWalletFromMnemonic(
  mnemonic: string, 
  derivationPath: string = "m/44'/501'/0'/0'"
): Promise<web3.Keypair> {
  try {
    // Convert mnemonic to seed
    const seed = await bip39.mnemonicToSeed(mnemonic);
    
    // Derive the keypair using the seed and path
    const derivedKey = derivePath(derivationPath, seed.toString('hex')).key;
    
    // Create a keypair from the derived private key
    const keypair = web3.Keypair.fromSeed(Uint8Array.from(derivedKey));
    
    return keypair;
  } catch (error) {
    console.error('Error creating wallet from mnemonic:', error);
    throw new Error('Failed to create wallet from mnemonic');
  }
}

/**
 * Validates a Solana address
 * @param {string} address - The Solana address to validate
 * @returns {boolean} True if address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new web3.PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Creates a keypair from a base64 encoded secret key
 * @param {string} secretKeyBase64 - Base64 encoded secret key
 * @returns {web3.Keypair} Solana keypair
 */
export function getKeypairFromSecretKey(secretKeyBase64: string): web3.Keypair {
  try {
    const secretKey = Buffer.from(secretKeyBase64, 'base64');
    return web3.Keypair.fromSecretKey(secretKey);
  } catch (error) {
    console.error('Error creating keypair from secret key:', error);
    throw new Error('Invalid secret key format');
  }
}

/**
 * Generates a keypair with a random seed
 * @returns {web3.Keypair} Solana keypair
 */
export function generateRandomKeypair(): web3.Keypair {
  return web3.Keypair.generate();
}

/**
 * Gets connection to Solana network
 * @param {string} network - Network to connect to: 'mainnet-beta', 'testnet', 'devnet'
 * @returns {web3.Connection} Solana connection
 */
export function getSolanaConnection(network: 'mainnet-beta' | 'testnet' | 'devnet' = 'mainnet-beta'): web3.Connection {
  let endpoint: string;
  
  switch (network) {
    case 'mainnet-beta':
      endpoint = 'https://api.mainnet-beta.solana.com';
      break;
    case 'testnet':
      endpoint = 'https://api.testnet.solana.com';
      break;
    case 'devnet':
    default:
      endpoint = 'https://api.devnet.solana.com';
      break;
  }
  
  return new web3.Connection(endpoint);
}

/**
 * Gets the SOL balance for a wallet address
 * @param {string} walletAddress - The Solana wallet address
 * @param {string} network - Network to connect to: 'mainnet-beta', 'testnet', 'devnet'
 * @returns {Promise<number>} Balance in SOL (not lamports)
 */
export async function getSolanaBalance(
  walletAddress: string, 
  network: 'mainnet-beta' | 'testnet' | 'devnet' = 'mainnet-beta'
): Promise<number> {
  try {
    if (!isValidSolanaAddress(walletAddress)) {
      throw new Error('Invalid Solana address');
    }
    
    const connection = getSolanaConnection(network);
    const publicKey = new web3.PublicKey(walletAddress);
    // Get the balance in lamports
    const balanceInLamports = await connection.getBalance(publicKey);
    console.log(`Balance for ${walletAddress} in lamports:`, balanceInLamports);
    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const balanceInSol = balanceInLamports / 1_000_000_000;
    
    return balanceInSol;
  } catch (error) {
    console.error('Error getting Solana balance:', error);
    throw new Error('Failed to fetch wallet balance');
  }
}

// Native SOL token address constant
export const SOL_ADDRESS = 'So11111111111111111111111111111111111111112';

/**
 * Interface for token balance information returned by Jupiter API
 */
export interface TokenBalance {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  symbol?: string;  // Optional symbol field for display
}

/**
 * Get all token balances for a wallet using Jupiter API
 * @param walletAddress The Solana wallet address
 * @returns Promise with an array of token balances
 */
export async function getJupiterBalances(walletAddress: string): Promise<TokenBalance[]> {
  try {
    if (!isValidSolanaAddress(walletAddress)) {
      throw new Error('Invalid Solana address');
    }
    
    console.log(`Fetching Jupiter balances for ${walletAddress}`);
    
    // Call Jupiter API to get all token balances
    const response = await fetch(`https://lite-api.jup.ag/ultra/v1/balances/${walletAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jupiter API error response:', errorText);
      throw new Error(`Jupiter API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Jupiter balances received:', data);
    
    // Transform the response to the expected format
    if (Array.isArray(data)) {
      return data;
    } else if (data && typeof data === 'object') {
      if (data.tokens && Array.isArray(data.tokens)) {
        // Some Jupiter API versions return { tokens: [...] }
        return data.tokens;
      } else {
        // Jupiter API is returning an object format like {SOL: {...}, USDC: {...}}
        // Convert to array of token balances
        const tokenBalances: TokenBalance[] = [];
        for (const [symbol, details] of Object.entries(data)) {
          if (details && typeof details === 'object') {
            const tokenDetails = details as any;
            tokenBalances.push({
              mint: symbol === 'SOL' ? SOL_ADDRESS : symbol,
              owner: walletAddress,
              amount: tokenDetails.amount || '0',
              decimals: symbol === 'SOL' ? 9 : (tokenDetails.decimals || 0),
              uiAmount: tokenDetails.uiAmount || 0,
              symbol: symbol // Add symbol field for display purposes
            } as TokenBalance);
          }
        }
        return tokenBalances;
      }
    } else {
      console.warn('Jupiter API returned unexpected format:', data);
      return []; // Return empty array as fallback
    }
  } catch (error) {
    console.error('Error fetching Jupiter balances:', error);
    throw new Error('Failed to fetch token balances');
  }
}
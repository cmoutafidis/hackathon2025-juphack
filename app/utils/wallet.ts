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
export function getSolanaConnection(network: 'mainnet-beta' | 'testnet' | 'devnet' = 'devnet'): web3.Connection {
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
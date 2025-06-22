# Solana Voice Assistant - JupHack


![Solana Voice Assistant](/public/preview.png)



A voice-controlled Solana wallet and token swap application built with Next.js and integrated with Jupiter Swap API. This application allows users to create Solana wallets and perform token swaps using simple voice commands.

## 🔍 Overview

The Solana Voice Assistant enables users to interact with Solana blockchain through voice commands. Users can create wallets, check balances, and execute token swaps on Jupiter, all without typing a single command. The app leverages browser Web Speech API for voice recognition and provides real-time feedback through visual notifications and voice responses.

## ✨ Features

- **Voice-Controlled Interface**: Create wallets and execute trades using simple voice commands
- **Solana Wallet Generation**: Create new Solana wallets with 24-word seed phrases
- **Token Balance Display**: View SOL and SPL token balances using Jupiter API
- **Token Swaps**: Swap SOL to JUP/USDC using Jupiter Swap API
- **Responsive UI**: Beautiful interface with light/dark mode support
- **Real-time Feedback**: Visual and voice feedback for all operations

## 🛠️ Tech Stack

- **Frontend**:
  - Next.js 15 (App Router)
  - React 19
  - TailwindCSS 4
  - Lucide React (icons)
  - Web Speech API for voice recognition and synthesis

- **Blockchain Integration**:
  - Solana Web3.js
  - Jupiter Swap API
  - BIP39 for mnemonic phrase generation
  - ED25519-HD-KEY for key derivation

## 🚀 Getting Started

### Prerequisites

Make sure you have Node.js (v18 or newer) and npm/yarn/pnpm installed on your system.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/goodfornothing-code/juphack.git
   cd juphack
   ```


4. Open [http://localhost:3000](http://localhost:3000) in your web browser.

## 🗣️ Voice Commands

The application supports the following voice commands:

- **"Hello"** - Activate the assistant
- **"Create Wallet"** or **"Generate Wallet"** - Create a new Solana wallet
- **"Swap Tokens"** or **"Trade Tokens"** - Initiate a token swap (SOL to JUP)

## 💼 API Routes

- **/api/generateWallet** - Creates a new Solana wallet with seed phrase
- **/api/getWalletBalance** - Fetches SOL balance for a wallet address
- **/api/getTokenBalances** - Fetches all token balances using Jupiter API
- **/api/swapTokens** - Executes token swaps using Jupiter Swap API

## 🛡️ Security Considerations

- In a production environment, wallet seed phrases and private keys should never be stored in the browser or transmitted unencrypted
- This application is for demonstration purposes only
- Consider implementing proper wallet connection methods (like Phantom or Solflare) for a production application

## 🔮 Future Improvements

- Integration with hardware wallets
- Support for more complex voice commands
- Additional trading pairs and swap options
- Integration with other Solana DeFi protocols
- Enhanced error handling and recovery

## 📄 License

[MIT License](LICENSE)

## 🙏 Acknowledgements

- [Jupiter Aggregator](https://jup.ag/) for providing the swap API
- [Solana Foundation](https://solana.com/) for the blockchain infrastructure
- [Vercel](https://vercel.com/) for hosting and deployment
=======

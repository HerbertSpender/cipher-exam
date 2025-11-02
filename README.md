# CipherExam - Privacy-First Exam System

A decentralized exam system powered by FHEVM (Fully Homomorphic Encryption Virtual Machine) that enables encrypted score storage and on-chain computation while maintaining complete privacy.

## 🎯 Overview

CipherExam is a blockchain-based exam platform that uses fully homomorphic encryption to protect student privacy. All answers and scores are encrypted end-to-end, and computations (like total score calculation and pass/fail judgment) are performed on-chain in encrypted state.

### Key Features

- 🔒 **End-to-End Encryption**: All student answers and scores are encrypted using FHEVM
- ⚡ **On-Chain Computation**: Total scores and pass/fail judgments computed on-chain in encrypted state
- 🛡️ **Privacy Protection**: Student data remains private throughout the entire exam process
- 📱 **Modern Web Interface**: Built with Next.js, TypeScript, and Tailwind CSS
- 🔗 **Wallet Integration**: EIP-6963 support with MetaMask integration
- 🌐 **Multi-Network Support**: Works on Sepolia testnet and local Hardhat network

## 📁 Project Structure

```
zama_exam/
├── fhevm-hardhat-template/    # Smart contracts and Hardhat configuration
│   ├── contracts/             # Solidity smart contracts
│   │   ├── CipherExam.sol     # Main exam contract
│   │   └── FHECounter.sol     # Example FHE counter contract
│   ├── deploy/                # Deployment scripts
│   ├── test/                  # Contract tests
│   └── tasks/                 # Hardhat custom tasks
│
└── cipher-exam-frontend/      # Next.js frontend application
    ├── app/                   # Next.js app directory
    ├── components/            # React components
    ├── hooks/                 # Custom React hooks
    ├── fhevm/                 # FHEVM integration
    └── abi/                   # Contract ABIs and addresses
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager
- **MetaMask**: Browser wallet extension
- **Hardhat Node**: For local development (optional)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd zama_exam
   ```

2. **Install contract dependencies**

   ```bash
   cd fhevm-hardhat-template
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../cipher-exam-frontend
   npm install
   ```

### Configuration

#### Smart Contracts

1. **Set up environment variables**

   ```bash
   cd fhevm-hardhat-template
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   npx hardhat vars set ETHERSCAN_API_KEY  # Optional
   ```

2. **Compile contracts**

   ```bash
   npm run compile
   ```

3. **Run tests**

   ```bash
   npm run test
   ```

#### Frontend

1. **Generate ABI files** (after deploying contracts)

   ```bash
   cd cipher-exam-frontend
   npm run genabi
   ```

2. **Build frontend**

   ```bash
   npm run build
   ```

### Deployment

#### Deploy to Local Network

1. **Start Hardhat node**

   ```bash
   cd fhevm-hardhat-template
   npx hardhat node
   ```

2. **Deploy contracts**

   ```bash
   npx hardhat deploy --network localhost
   ```

3. **Start frontend in mock mode**

   ```bash
   cd ../cipher-exam-frontend
   npm run dev:mock
   ```

#### Deploy to Sepolia Testnet

1. **Deploy contracts**

   ```bash
   cd fhevm-hardhat-template
   npx hardhat deploy --network sepolia
   ```

2. **Update frontend ABI**

   ```bash
   cd ../cipher-exam-frontend
   npm run genabi
   ```

3. **Start frontend**

   ```bash
   npm run dev
   ```

## 📝 Contract Details

### CipherExam Contract

**Address on Sepolia**: `0x3cAd83Bd5d2595B1B3900Acd68f4b36E39038C1A`

**Key Functions**:
- `createExam()`: Create a new exam with encrypted passing threshold
- `submitAnswers()`: Submit encrypted scores for each question
- `computeTotalAndJudge()`: Compute total score and pass/fail in encrypted state
- `getNextExamId()`: Get the total number of exams created

### Network Support

- **Sepolia Testnet** (Chain ID: 11155111)
- **Local Hardhat Network** (Chain ID: 31337)

## 🌐 Frontend

### Development Modes

- **Mock Mode** (`npm run dev:mock`): Uses `@fhevm/mock-utils` for local development
- **Production Mode** (`npm run dev`): Uses real `@zama-fhe/relayer-sdk` for Sepolia

### Features

- ✅ Wallet connection with EIP-6963 support
- ✅ Automatic wallet reconnection on page refresh
- ✅ FHEVM integration (mock and real modes)
- ✅ Exam creation with question management
- ✅ Encrypted answer submission
- ✅ Encrypted score computation
- ✅ Personal score decryption
- ✅ Exam history tracking

### Live Demo

🌐 **Production URL**: https://cipher-exam-nq25pj.vercel.app

## 🧪 Testing

### Contract Tests

```bash
cd fhevm-hardhat-template
npm run test
```

### Frontend Static Export Check

```bash
cd cipher-exam-frontend
npm run check:static
```

## 📚 Technology Stack

### Smart Contracts
- **Solidity**: ^0.8.24
- **FHEVM Solidity**: ^0.9.1
- **Hardhat**: ^2.26.0
- **Ethers.js**: ^6.15.0

### Frontend
- **Next.js**: ^15.4.2 (Static Export)
- **React**: ^19.1.0
- **TypeScript**: ^5
- **Tailwind CSS**: ^3.4.1
- **FHEVM Relayer SDK**: ^0.3.0-5
- **Ethers.js**: ^6.15.0

## 🔐 Security Considerations

- All sensitive data is encrypted using FHEVM
- Private keys never leave the user's wallet
- Decryption signatures are stored locally in IndexedDB
- No server-side data storage

## 📄 License

MIT License

## 🙏 Acknowledgments

- [Zama](https://zama.ai/) for FHEVM technology
- [FHEVM Documentation](https://docs.zama.ai/fhevm)

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ using FHEVM by Zama**



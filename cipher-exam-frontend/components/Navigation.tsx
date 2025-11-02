"use client";

import Link from "next/link";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";

export function Navigation() {
  const { isConnected, accounts, connect, chainId } = useMetaMaskEthersSigner();

  const shortAddress = accounts?.[0] 
    ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
    : "";

  const chainName = chainId === 31337 ? "Hardhat" : chainId === 11155111 ? "Sepolia" : "Unknown";

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold text-primary">
              CipherExam
            </Link>
            <div className="hidden md:flex gap-6">
              <Link href="/exams" className="text-sm font-medium hover:text-primary transition-colors">
                Exams
              </Link>
              <Link href="/exams/history" className="text-sm font-medium hover:text-primary transition-colors">
                My History
              </Link>
              <Link href="/exams/create" className="text-sm font-medium hover:text-primary transition-colors">
                Create Exam
              </Link>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isConnected ? (
              <>
                <span className="text-sm text-muted-foreground">{chainName}</span>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  <span className="text-sm font-mono">{shortAddress}</span>
                </div>
              </>
            ) : (
              <button
                onClick={connect}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}


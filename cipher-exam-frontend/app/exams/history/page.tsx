"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { Contract } from "ethers";
import { CipherExamABI } from "@/abi/CipherExamABI";
import { CipherExamAddresses } from "@/abi/CipherExamAddresses";

type ExamHistoryItem = {
  examId: bigint;
  title: string;
  questionCount: number;
  submittedAt: number;
  startTime: number;
  endTime: number;
  status: number; // 0 = not started, 1 = in progress, 2 = ended
};

export default function HistoryPage() {
  const { chainId, ethersReadonlyProvider, isConnected, connect, accounts } = useMetaMaskEthersSigner();
  const [history, setHistory] = useState<ExamHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!chainId || !ethersReadonlyProvider || !accounts?.[0]) {
        setHistory([]);
        return;
      }

      const address = CipherExamAddresses[String(chainId) as keyof typeof CipherExamAddresses]?.address;
      if (!address || address === "0x0000000000000000000000000000000000000000") {
        setHistory([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const contract = new Contract(address, CipherExamABI.abi, ethersReadonlyProvider);
        const userAddress = accounts[0];
        
        // Get total number of exams
        const nextExamId = await contract.getNextExamId();
        const examCount = Number(nextExamId);

        // Check each exam for user submissions
        const historyPromises: Promise<ExamHistoryItem | null>[] = [];
        for (let i = 0; i < examCount; i++) {
          historyPromises.push(
            (async () => {
              try {
                // Check if user has submitted by checking submission.exists
                // This works because submissions is a public mapping
                const submission = await contract.submissions(BigInt(i), userAddress);
                if (!submission.exists) {
                  return null;
                }

                // Get exam info
                const info = await contract.getExamInfo(BigInt(i));
                const status = await contract.getExamStatus(BigInt(i));
                
                // Get submission timestamp
                const submittedAt = Number(submission.submittedAt);

                return {
                  examId: BigInt(i),
                  title: info.title,
                  questionCount: Number(info.questionCount),
                  submittedAt,
                  startTime: Number(info.startTime),
                  endTime: Number(info.endTime),
                  status: Number(status),
                };
              } catch {
                return null;
              }
            })()
          );
        }

        const results = await Promise.all(historyPromises);
        const validHistory = results
          .filter((item): item is ExamHistoryItem => item !== null)
          .sort((a, b) => b.submittedAt - a.submittedAt); // Sort by most recent first

        setHistory(validHistory);
      } catch (err) {
        console.error("Failed to load history:", err);
        setError(err instanceof Error ? err.message : "Failed to load exam history");
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [chainId, ethersReadonlyProvider, accounts]);

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return { label: "Not Started", color: "text-muted-foreground bg-muted" };
      case 1:
        return { label: "In Progress", color: "text-primary bg-primary/10" };
      case 2:
        return { label: "Ended", color: "text-muted-foreground bg-muted" };
      default:
        return { label: "Unknown", color: "text-muted-foreground bg-muted" };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Exam History</h1>
          <Link
            href="/exams"
            className="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10"
          >
            Browse Exams
          </Link>
        </div>

        {!isConnected && (
          <div className="bg-card p-6 rounded-lg shadow-card text-center mb-6">
            <p className="mb-4">Please connect your wallet to view your exam history.</p>
            <button
              onClick={connect}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-error/10 text-error rounded-lg">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading exam history...</p>
          </div>
        ) : !accounts?.[0] ? (
          <div className="bg-card p-6 rounded-lg shadow-card text-center">
            <p className="text-muted-foreground">Please connect your wallet to view your exam history.</p>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-card p-6 rounded-lg shadow-card text-center">
            <p className="text-muted-foreground mb-4">You haven't taken any exams yet.</p>
            <Link
              href="/exams"
              className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Browse Available Exams
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const statusInfo = getStatusLabel(item.status);
              return (
                <div
                  key={String(item.examId)}
                  className="bg-card p-6 rounded-lg shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Questions: {item.questionCount}</span>
                        <span>•</span>
                        <span>Submitted: {new Date(item.submittedAt * 1000).toLocaleString()}</span>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <p>Exam Period: {new Date(item.startTime * 1000).toLocaleString()} - {new Date(item.endTime * 1000).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/exams/${item.examId}/results`}
                      className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      View Results
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { Contract } from "ethers";
import { CipherExamABI } from "@/abi/CipherExamABI";
import { CipherExamAddresses } from "@/abi/CipherExamAddresses";

type ExamCard = {
  id: bigint;
  title: string;
  questionCount: number;
  startTime: number;
  endTime: number;
  status: number; // 0 = not started, 1 = in progress, 2 = ended
};

export default function ExamsPage() {
  const { chainId, ethersReadonlyProvider, isConnected, connect, accounts } = useMetaMaskEthersSigner();
  const [exams, setExams] = useState<ExamCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExams = async () => {
      if (!chainId || !ethersReadonlyProvider) {
        setExams([]);
        return;
      }

      const address = CipherExamAddresses[String(chainId) as keyof typeof CipherExamAddresses]?.address;
      if (!address || address === "0x0000000000000000000000000000000000000000") {
        setExams([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const contract = new Contract(address, CipherExamABI.abi, ethersReadonlyProvider);
        const nextExamId = await contract.getNextExamId();
        const examCount = Number(nextExamId);

        const examPromises: Promise<ExamCard | null>[] = [];
        for (let i = 0; i < examCount; i++) {
          examPromises.push(
            (async () => {
              try {
                const info = await contract.getExamInfo(BigInt(i));
                const status = await contract.getExamStatus(BigInt(i));
                return {
                  id: BigInt(i),
                  title: info.title,
                  questionCount: Number(info.questionCount),
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

        const examResults = await Promise.all(examPromises);
        const validExams = examResults.filter((e): e is ExamCard => e !== null);
        setExams(validExams);
      } catch (err) {
        console.error("Failed to load exams:", err);
        setError(err instanceof Error ? err.message : "Failed to load exams");
      } finally {
        setIsLoading(false);
      }
    };

    loadExams();
  }, [chainId, ethersReadonlyProvider]);

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
          <h1 className="text-3xl font-bold">Available Exams</h1>
          {isConnected && (
            <Link
              href="/exams/create"
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Create Exam
            </Link>
          )}
        </div>

        {!isConnected && (
          <div className="bg-card p-6 rounded-lg shadow-card text-center mb-6">
            <p className="mb-4">Please connect your wallet to view exams.</p>
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
            <p className="text-muted-foreground">Loading exams...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-card p-6 rounded-lg shadow-card text-center">
            <p className="text-muted-foreground">No exams available yet.</p>
            {isConnected && (
              <Link
                href="/exams/create"
                className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Create Your First Exam
              </Link>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => {
              const statusInfo = getStatusLabel(exam.status);
              return (
                <div
                  key={String(exam.id)}
                  className="bg-card p-6 rounded-lg shadow-card hover:shadow-card-hover transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold">{exam.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs rounded ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4 text-sm text-muted-foreground">
                    <p>Questions: {exam.questionCount}</p>
                    <p>Start: {new Date(exam.startTime * 1000).toLocaleString()}</p>
                    <p>End: {new Date(exam.endTime * 1000).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    {exam.status === 1 && isConnected && (
                      <Link
                        href={`/exams/${exam.id}/take`}
                        className="flex-1 text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        Take Exam
                      </Link>
                    )}
                    {exam.status === 2 && isConnected && (
                      <Link
                        href={`/exams/${exam.id}/results`}
                        className="flex-1 text-center px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10"
                      >
                        View Results
                      </Link>
                    )}
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

"use client";

import { useState, useEffect, use } from "react";
import { Navigation } from "@/components/Navigation";
import { useCipherExam } from "@/hooks/useCipherExam";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { Contract } from "ethers";
import { CipherExamABI } from "@/abi/CipherExamABI";
import { CipherExamAddresses } from "@/abi/CipherExamAddresses";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";

export default function ResultsPage({ params }: { params: Promise<{ examId: string }> }) {
  // Next.js 15 requires params to be a Promise in client components
  const resolvedParams = use(params);
  const examIdStr = resolvedParams.examId;
  const { chainId, ethersReadonlyProvider, ethersSigner, isConnected, accounts, connect } = useMetaMaskEthersSigner();
  const { contract, fhevmInstance } = useCipherExam();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  
  const [examInfo, setExamInfo] = useState<any>(null);
  const [encryptedTotal, setEncryptedTotal] = useState<string | null>(null);
  const [encryptedPassed, setEncryptedPassed] = useState<string | null>(null);
  const [encryptedScores, setEncryptedScores] = useState<string[]>([]);
  
  const [decryptedTotal, setDecryptedTotal] = useState<number | null>(null);
  const [decryptedPassed, setDecryptedPassed] = useState<boolean | null>(null);
  const [decryptedScores, setDecryptedScores] = useState<number[]>([]);
  
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExamAndResults = async () => {
      if (!chainId || !ethersReadonlyProvider || !accounts?.[0]) return;
      
      const address = CipherExamAddresses[String(chainId) as keyof typeof CipherExamAddresses]?.address;
      if (!address || address === "0x0000000000000000000000000000000000000000") return;

      try {
        const contractInstance = new Contract(address, CipherExamABI.abi, ethersReadonlyProvider);
        const examId = BigInt(examIdStr);
        
        const info = await contractInstance.getExamInfo(examId);
        setExamInfo({
          title: info.title,
          questionCount: Number(info.questionCount),
          questionScores: info.questionScores.map((s: bigint) => Number(s)),
        });

        const total = await contractInstance.getMyEncryptedTotal(examId, accounts[0]);
        const passed = await contractInstance.getMyPassedStatus(examId, accounts[0]);
        const scores = await contractInstance.getMyScores(examId, accounts[0]);

        setEncryptedTotal(total);
        setEncryptedPassed(passed);
        setEncryptedScores(scores);
      } catch (err) {
        console.error("Failed to load results:", err);
        setError(err instanceof Error ? err.message : "Failed to load results");
      }
    };

    loadExamAndResults();
  }, [chainId, ethersReadonlyProvider, accounts, examIdStr]);

  const handleDecrypt = async () => {
    if (!fhevmInstance || !contract || !ethersSigner || !accounts?.[0] || encryptedTotal === null) return;

    setIsDecrypting(true);
    setError(null);

    try {
      const contractAddress = await contract.getAddress();
      const examId = BigInt(examIdStr);

      // Load or sign decryption signature
      const sig = await FhevmDecryptionSignature.loadOrSign(
        fhevmInstance,
        [contractAddress],
        ethersSigner,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        throw new Error("Unable to build FHEVM decryption signature");
      }

      // Prepare handles for decryption
      const handles = [
        { handle: encryptedTotal, contractAddress },
        ...(encryptedPassed ? [{ handle: encryptedPassed, contractAddress }] : []),
        ...encryptedScores.map((score) => ({ handle: score, contractAddress })),
      ];

      // Decrypt all handles at once
      const res = await fhevmInstance.userDecrypt(
        handles,
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      // Extract decrypted values
      setDecryptedTotal(Number((res as any)[encryptedTotal] || BigInt(0)));
      
      if (encryptedPassed) {
        const passedValue = (res as any)[encryptedPassed];
        setDecryptedPassed(typeof passedValue === "boolean" ? passedValue : Boolean(passedValue));
      }

      const decrypted = encryptedScores.map((score) => Number((res as any)[score] || BigInt(0)));
      setDecryptedScores(decrypted);
    } catch (err) {
      console.error("Failed to decrypt:", err);
      setError(err instanceof Error ? err.message : "Failed to decrypt");
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Exam Results {examIdStr}</h1>
          <div className="bg-card p-6 rounded-lg shadow-card text-center">
            <p className="mb-4">Please connect your wallet to view results.</p>
            <button
              onClick={connect}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Connect Wallet
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!examInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Exam Results {examIdStr}</h1>
          <div className="bg-card p-6 rounded-lg shadow-card">
            <p>Loading results...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{examInfo.title} - Results</h1>

        {encryptedTotal === null ? (
          <div className="bg-card p-6 rounded-lg shadow-card">
            <p className="text-muted-foreground">No submission found for this exam.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg shadow-card">
              <h2 className="text-xl font-semibold mb-4">Encrypted Results</h2>
              <div className="space-y-2 mb-4">
                <p className="text-sm text-muted-foreground">
                  Total Score Handle: <span className="font-mono text-xs">{encryptedTotal}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Pass/Fail Handle: <span className="font-mono text-xs">{encryptedPassed}</span>
                </p>
              </div>

              {decryptedTotal === null ? (
                <button
                  onClick={handleDecrypt}
                  disabled={isDecrypting || !fhevmInstance}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDecrypting ? "Decrypting..." : "Decrypt My Scores"}
                </button>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-success/10 rounded-lg">
                    <p className="text-lg font-semibold">Total Score: {decryptedTotal}</p>
                    <p className="text-sm">
                      Status: {decryptedPassed ? (
                        <span className="text-success font-semibold">Passed</span>
                      ) : (
                        <span className="text-error font-semibold">Failed</span>
                      )}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Question Scores:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {decryptedScores.map((score, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <p className="text-sm">Q{index + 1}: {score}/{examInfo.questionScores[index]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-error/10 text-error rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

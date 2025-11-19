"use client";

import { useState, useEffect, useCallback } from "react";
import { Contract, ethers } from "ethers";
import { useMetaMaskEthersSigner } from "./metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { CipherExamABI } from "@/abi/CipherExamABI";
import { CipherExamAddresses } from "@/abi/CipherExamAddresses";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";

export function useCipherExam() {
  const {
    provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    isConnected,
    accounts,
  } = useMetaMaskEthersSigner();

  const { instance: fhevmInstance } = useFhevm({
    provider: provider,
    chainId,
    enabled: isConnected,
    initialMockChains: { 31337: "http://localhost:8545" },
  });

  // Contract instance state
  const [contract, setContract] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!chainId || !ethersReadonlyProvider) {
      setContract(null);
      return;
    }

    const address = CipherExamAddresses[String(chainId) as keyof typeof CipherExamAddresses]?.address;
    if (!address || address === "0x0000000000000000000000000000000000000000") {
      setContract(null);
      return;
    }

    const c = new Contract(address, CipherExamABI.abi, ethersReadonlyProvider);
    setContract(c);
  }, [chainId, ethersReadonlyProvider]);

  const createExam = useCallback(
    async (
      title: string,
      questionCount: number,
      passingScore: number,
      questionScores: number[],
      startTime: number,
      endTime: number
    ) => {
      if (!contract || !ethersSigner || !fhevmInstance || !accounts?.[0]) {
        throw new Error("Not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get next exam ID before creation (this will be the new exam ID)
        const nextExamId = await contract.getNextExamId();
        const newExamId = Number(nextExamId);

        const contractAddress = await contract.getAddress();
        const encryptedInput = await fhevmInstance
          .createEncryptedInput(contractAddress, accounts[0])
          .add32(passingScore)
          .encrypt();

        const tx = await (contract as any)
          .connect(ethersSigner)
          .createExam(
            title,
            questionCount,
            encryptedInput.handles[0],
            encryptedInput.inputProof,
            questionScores,
            startTime,
            endTime
          );
        const receipt = await tx.wait();
        
        // Verify the exam ID after creation (should be nextExamId)
        const actualNextId = await contract.getNextExamId();
        const actualExamId = Number(actualNextId) - 1;
        
        return {
          txHash: tx.hash,
          examId: actualExamId,
        };
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, ethersSigner, fhevmInstance, accounts]
  );

  const submitAnswers = useCallback(
    async (examId: bigint, scores: number[]) => {
      if (!contract || !ethersSigner || !fhevmInstance || !accounts?.[0]) {
        throw new Error("Not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        const contractAddress = await contract.getAddress();
        const encryptedInput = await fhevmInstance
          .createEncryptedInput(contractAddress, accounts[0]);

        for (const score of scores) {
          encryptedInput.add32(score);
        }

        const encrypted = await encryptedInput.encrypt();

        const tx = await contract
          .connect(ethersSigner)
          .submitAnswers(examId, encrypted.handles, encrypted.inputProof);
        await tx.wait();
        return tx.hash;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, ethersSigner, fhevmInstance, accounts]
  );

  const computeTotalAndJudge = useCallback(
    async (examId: bigint, student: string) => {
      if (!contract || !ethersSigner) {
        throw new Error("Not connected");
      }

      setIsLoading(true);
      setError(null);

      try {
        const tx = await contract
          .connect(ethersSigner)
          .computeTotalAndJudge(examId, student);
        await tx.wait();
        return tx.hash;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [contract, ethersSigner]
  );

  return {
    contract,
    isConnected,
    isLoading,
    error,
    createExam,
    submitAnswers,
    computeTotalAndJudge,
    fhevmInstance,
  };
}


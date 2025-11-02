"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { useCipherExam } from "@/hooks/useCipherExam";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { Contract } from "ethers";
import { CipherExamABI } from "@/abi/CipherExamABI";
import { CipherExamAddresses } from "@/abi/CipherExamAddresses";
import { Question, StudentAnswer } from "@/types/exam";
import { loadExamQuestions } from "@/lib/questionStorage";
import { calculateScore } from "@/lib/scoring";

export default function TakeExamPage({ params }: { params: Promise<{ examId: string }> }) {
  // Next.js 15 requires params to be a Promise in client components
  const resolvedParams = use(params);
  const examIdStr = resolvedParams.examId;
  const router = useRouter();
  const { chainId, ethersReadonlyProvider, isConnected, accounts, connect } = useMetaMaskEthersSigner();
  const { submitAnswers, computeTotalAndJudge, isLoading, error, fhevmInstance } = useCipherExam();
  
  const [examInfo, setExamInfo] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadExam = async () => {
      if (!chainId || !ethersReadonlyProvider) return;
      
      const address = CipherExamAddresses[String(chainId) as keyof typeof CipherExamAddresses]?.address;
      if (!address || address === "0x0000000000000000000000000000000000000000") return;

      try {
        const contract = new Contract(address, CipherExamABI.abi, ethersReadonlyProvider);
        const examId = BigInt(examIdStr);
        const info = await contract.getExamInfo(examId);
        
        setExamInfo({
          title: info.title,
          questionCount: Number(info.questionCount),
          questionScores: info.questionScores.map((s: bigint) => Number(s)),
          startTime: Number(info.startTime),
          endTime: Number(info.endTime),
        });

        // Load questions from localStorage
        const loadedQuestions = loadExamQuestions(examIdStr);
        if (loadedQuestions && loadedQuestions.length > 0) {
          setQuestions(loadedQuestions);
          setStudentAnswers(
            loadedQuestions.map((q) => ({
              questionId: q.id,
              answer: q.type === "multiple-choice" ? [] : "",
            }))
          );
        } else {
          // Fallback: create placeholder questions if not found
          const placeholderQuestions: Question[] = Array.from({ length: Number(info.questionCount) }).map(
            (_, i) => ({
              id: `q${i}`,
              title: `Question ${i + 1}`,
              type: "single-choice",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "",
              maxScore: Number(info.questionScores[i]),
            })
          );
          setQuestions(placeholderQuestions);
          setStudentAnswers(
            placeholderQuestions.map((q) => ({
              questionId: q.id,
              answer: q.type === "multiple-choice" ? [] : "",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load exam:", err);
      }
    };

    loadExam();
  }, [chainId, ethersReadonlyProvider, examIdStr]);

  const updateAnswer = (questionIndex: number, answer: string | string[]) => {
    const updated = [...studentAnswers];
    updated[questionIndex] = {
      ...updated[questionIndex],
      answer,
    };
    setStudentAnswers(updated);
  };

  const handleSubmit = async () => {
    if (!isConnected || !accounts?.[0]) {
      connect();
      return;
    }

    if (questions.length === 0) {
      alert("Questions not loaded. Please refresh the page.");
      return;
    }

    // Validate all questions are answered
    for (let i = 0; i < studentAnswers.length; i++) {
      const answer = studentAnswers[i].answer;
      if (
        !answer ||
        (Array.isArray(answer) && answer.length === 0) ||
        (typeof answer === "string" && !answer.trim())
      ) {
        alert(`Please answer question ${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Calculate scores for each question
      const scores: number[] = [];
      for (let i = 0; i < questions.length; i++) {
        const score = calculateScore(questions[i], studentAnswers[i]);
        scores.push(score);
      }

      const examId = BigInt(examIdStr);
      const txHash = await submitAnswers(examId, scores);
      await computeTotalAndJudge(examId, accounts[0]);
      
      alert(`Answers submitted! Transaction: ${txHash}`);
      router.push(`/exams/${examIdStr}/results`);
    } catch (err) {
      console.error("Failed to submit:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8">Take Exam {examIdStr}</h1>
          <div className="bg-card p-6 rounded-lg shadow-card text-center">
            <p className="mb-4">Please connect your wallet to take the exam.</p>
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
          <h1 className="text-3xl font-bold mb-8">Take Exam {examIdStr}</h1>
          <div className="bg-card p-6 rounded-lg shadow-card">
            <p>Loading exam information...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">{examInfo.title}</h1>
        <div className="bg-card p-6 rounded-lg shadow-card mb-6">
          <p className="text-sm text-muted-foreground mb-2">
            Start: {new Date(examInfo.startTime * 1000).toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            End: {new Date(examInfo.endTime * 1000).toLocaleString()}
          </p>
          <p className="text-sm">Total Questions: {examInfo.questionCount}</p>
        </div>

        <div className="space-y-6 mb-6">
          {questions.map((question, index) => {
            const studentAnswer = studentAnswers[index];
            const currentAnswer = studentAnswer?.answer || (question.type === "multiple-choice" ? [] : "");

            return (
              <div key={question.id} className="bg-card p-6 rounded-lg shadow-card">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      Question {index + 1}: {question.title}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      Type: {question.type.replace("-", " ")} | Max Score: {question.maxScore} points
                    </span>
                  </div>
                </div>

                {question.type === "single-choice" && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={currentAnswer === option}
                          onChange={(e) => updateAnswer(index, e.target.value)}
                          className="w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === "multiple-choice" && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIndex) => (
                      <label key={optIndex} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(currentAnswer as string[]).includes(option)}
                          onChange={(e) => {
                            const current = currentAnswer as string[];
                            const updated = e.target.checked
                              ? [...current, option]
                              : current.filter((a) => a !== option);
                            updateAnswer(index, updated);
                          }}
                          className="w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {(question.type === "fill-blank" || question.type === "essay") && (
                  <textarea
                    value={currentAnswer as string}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    rows={question.type === "essay" ? 6 : 3}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    placeholder={question.type === "essay" ? "Write your essay answer here..." : "Enter your answer..."}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-error/10 text-error rounded-lg">
            Error: {error.message}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
          className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting || isLoading ? "Submitting..." : "Submit Answers"}
        </button>
      </main>
    </div>
  );
}

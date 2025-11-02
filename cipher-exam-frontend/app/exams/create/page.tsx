"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { QuestionEditor } from "@/components/QuestionEditor";
import { useCipherExam } from "@/hooks/useCipherExam";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { Question } from "@/types/exam";
import { saveExamQuestions } from "@/lib/questionStorage";

export default function CreateExamPage() {
  const router = useRouter();
  const { isConnected, connect } = useMetaMaskEthersSigner();
  const { createExam, isLoading, error } = useCipherExam();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [passingScore, setPassingScore] = useState(60);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "q1",
      title: "",
      type: "single-choice",
      options: ["Option A", "Option B"],
      correctAnswer: "",
      maxScore: 30,
    },
  ]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q${Date.now()}`,
      title: "",
      type: "single-choice",
      options: ["Option A", "Option B"],
      correctAnswer: "",
      maxScore: 30,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, question: Question) => {
    const updated = [...questions];
    updated[index] = question;
    setQuestions(updated);
  };

  const deleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert("At least one question is required");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      connect();
      return;
    }

    // Validate questions
    if (questions.length === 0) {
      alert("Please add at least one question");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title.trim()) {
        alert(`Question ${i + 1} title is required`);
        return;
      }
      if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
        alert(`Question ${i + 1} correct answer is required`);
        return;
      }
      if ((q.type === "single-choice" || q.type === "multiple-choice") && (!q.options || q.options.length < 2)) {
        alert(`Question ${i + 1} must have at least 2 options`);
        return;
      }
    }

    try {
      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);
      const questionCount = questions.length;
      const questionScores = questions.map((q) => q.maxScore);
      const totalScore = questionScores.reduce((sum, score) => sum + score, 0);

      const result = await createExam(
        title,
        questionCount,
        passingScore,
        questionScores,
        startTimestamp,
        endTimestamp
      );

      // Save questions with the actual exam ID
      saveExamQuestions(String(result.examId), questions);

      alert(`Exam created! Exam ID: ${result.examId}\nTransaction: ${result.txHash}`);
      router.push("/exams");
    } catch (err) {
      console.error("Failed to create exam:", err);
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <h1 className="text-3xl font-bold mb-8">Create New Exam</h1>
          <div className="bg-card p-6 rounded-lg shadow-card text-center">
            <p className="mb-4">Please connect your wallet to create an exam.</p>
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Create New Exam</h1>
        <form onSubmit={handleSubmit} className="bg-card p-6 rounded-lg shadow-card space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Exam Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-border rounded-lg"
              placeholder="Optional exam description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Passing Score (out of {questions.reduce((sum, q) => sum + q.maxScore, 0)}) *
            </label>
            <input
              type="number"
              min="0"
              max={questions.reduce((sum, q) => sum + q.maxScore, 0)}
              value={passingScore}
              onChange={(e) => setPassingScore(parseInt(e.target.value) || 0)}
              required
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Start Time *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">End Time *</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-4 py-2 border border-border rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium">
                Questions ({questions.length})
                <span className="text-error ml-1">*</span>
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
              >
                + Add Question
              </button>
            </div>
            {questions.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <p className="text-muted-foreground mb-4">No questions added yet</p>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
                >
                  + Add First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    index={index}
                    onUpdate={(updated) => updateQuestion(index, updated)}
                    onDelete={() => deleteQuestion(index)}
                  />
                ))}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-4 py-2 text-primary hover:text-primary/80 font-medium border border-primary rounded-lg hover:bg-primary/10"
                  >
                    + Add Another Question
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-error/10 text-error rounded-lg">
              Error: {error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Exam..." : "Create Exam"}
          </button>
        </form>
      </main>
    </div>
  );
}

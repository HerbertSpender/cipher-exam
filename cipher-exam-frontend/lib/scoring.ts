// lib/scoring.ts
import { Question, StudentAnswer } from "@/types/exam";

export function calculateScore(question: Question, studentAnswer: StudentAnswer): number {
  if (!question.correctAnswer) return 0;

  switch (question.type) {
    case "single-choice":
      if (typeof studentAnswer.answer === "string" && studentAnswer.answer === question.correctAnswer) {
        return question.maxScore;
      }
      return 0;

    case "multiple-choice":
      if (Array.isArray(studentAnswer.answer) && Array.isArray(question.correctAnswer)) {
        const studentSet = new Set(studentAnswer.answer);
        const correctSet = new Set(question.correctAnswer);
        
        // Check if answers match exactly
        if (studentSet.size === correctSet.size && 
            [...studentSet].every(a => correctSet.has(a))) {
          return question.maxScore;
        }
        return 0;
      }
      return 0;

    case "fill-blank":
      if (typeof studentAnswer.answer === "string" && typeof question.correctAnswer === "string") {
        // Simple exact match (can be enhanced with fuzzy matching)
        const normalized = (str: string) => str.trim().toLowerCase();
        if (normalized(studentAnswer.answer) === normalized(question.correctAnswer)) {
          return question.maxScore;
        }
        return 0;
      }
      return 0;

    case "essay":
      // For essay questions, we'll need manual grading or use a simple heuristic
      // For now, return 0 (manual grading required)
      // In a real system, this would be handled by a teacher or AI grading service
      return 0;

    default:
      return 0;
  }
}



// lib/questionStorage.ts
import { ExamQuestions, Question } from "@/types/exam";

const STORAGE_PREFIX = "cipher-exam:questions:";

export function saveExamQuestions(examId: string, questions: Question[]): void {
  if (typeof window === "undefined") return;
  
  const data: ExamQuestions = {
    examId,
    questions,
    createdAt: Date.now(),
  };
  
  localStorage.setItem(`${STORAGE_PREFIX}${examId}`, JSON.stringify(data));
}

export function loadExamQuestions(examId: string): Question[] | null {
  if (typeof window === "undefined") return null;
  
  const stored = localStorage.getItem(`${STORAGE_PREFIX}${examId}`);
  if (!stored) return null;
  
  try {
    const data: ExamQuestions = JSON.parse(stored);
    return data.questions;
  } catch {
    return null;
  }
}

export function deleteExamQuestions(examId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${STORAGE_PREFIX}${examId}`);
}



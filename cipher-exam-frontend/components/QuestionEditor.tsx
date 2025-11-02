// components/QuestionEditor.tsx
"use client";

import { Question, QuestionType } from "@/types/exam";
import { useState } from "react";

type Props = {
  question: Question;
  index: number;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
};

export function QuestionEditor({ question, index, onUpdate, onDelete }: Props) {
  const [localQuestion, setLocalQuestion] = useState(question);

  const updateQuestion = (updates: Partial<Question>) => {
    const updated = { ...localQuestion, ...updates };
    setLocalQuestion(updated);
    onUpdate(updated);
  };

  const addOption = () => {
    const options = localQuestion.options || [];
    updateQuestion({ options: [...options, ""] });
  };

  const updateOption = (optIndex: number, value: string) => {
    const options = [...(localQuestion.options || [])];
    options[optIndex] = value;
    updateQuestion({ options });
  };

  const removeOption = (optIndex: number) => {
    const options = localQuestion.options?.filter((_, i) => i !== optIndex) || [];
    updateQuestion({ options });
  };

  const updateCorrectAnswer = (value: string | string[]) => {
    updateQuestion({ correctAnswer: value });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Question {index + 1}</h3>
        <button
          type="button"
          onClick={onDelete}
          className="text-error hover:text-error/80 text-sm"
        >
          Delete
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Question Title *</label>
        <input
          type="text"
          value={localQuestion.title}
          onChange={(e) => updateQuestion({ title: e.target.value })}
          required
          className="w-full px-4 py-2 border border-border rounded-lg"
          placeholder="Enter question text"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Question Type *</label>
        <select
          value={localQuestion.type}
          onChange={(e) => {
            const type = e.target.value as QuestionType;
            const updates: Partial<Question> = { type };
            if (type === "single-choice" || type === "multiple-choice") {
              updates.options = localQuestion.options || ["Option A", "Option B"];
              updates.correctAnswer = type === "single-choice" ? "" : [];
            } else {
              updates.options = undefined;
              updates.correctAnswer = "";
            }
            updateQuestion(updates);
          }}
          className="w-full px-4 py-2 border border-border rounded-lg"
        >
          <option value="single-choice">Single Choice</option>
          <option value="multiple-choice">Multiple Choice</option>
          <option value="fill-blank">Fill in the Blank</option>
          <option value="essay">Essay</option>
        </select>
      </div>

      {(localQuestion.type === "single-choice" || localQuestion.type === "multiple-choice") && (
        <div>
          <label className="block text-sm font-medium mb-2">Options</label>
          <div className="space-y-2">
            {(localQuestion.options || []).map((opt, optIndex) => (
              <div key={optIndex} className="flex gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(optIndex, e.target.value)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg"
                  placeholder={`Option ${optIndex + 1}`}
                />
                {(localQuestion.options?.length || 0) > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(optIndex)}
                    className="px-3 text-error hover:text-error/80"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-sm text-primary hover:text-primary/80"
            >
              + Add Option
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">
              Correct Answer{localQuestion.type === "multiple-choice" ? "s" : ""} *
            </label>
            {localQuestion.type === "single-choice" ? (
              <select
                value={localQuestion.correctAnswer as string || ""}
                onChange={(e) => updateCorrectAnswer(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg"
              >
                <option value="">Select correct answer</option>
                {(localQuestion.options || []).map((opt, optIndex) => (
                  <option key={optIndex} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-2">
                {(localQuestion.options || []).map((opt, optIndex) => (
                  <label key={optIndex} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(localQuestion.correctAnswer as string[] || []).includes(opt)}
                      onChange={(e) => {
                        const current = (localQuestion.correctAnswer as string[] || []);
                        const updated = e.target.checked
                          ? [...current, opt]
                          : current.filter((a) => a !== opt);
                        updateCorrectAnswer(updated);
                      }}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {(localQuestion.type === "fill-blank" || localQuestion.type === "essay") && (
        <div>
          <label className="block text-sm font-medium mb-2">Correct Answer (for reference) *</label>
          <textarea
            value={localQuestion.correctAnswer as string || ""}
            onChange={(e) => updateCorrectAnswer(e.target.value)}
            rows={localQuestion.type === "essay" ? 4 : 2}
            className="w-full px-4 py-2 border border-border rounded-lg"
            placeholder="Enter correct answer"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">Max Score *</label>
        <input
          type="number"
          min="1"
          max="100"
          value={localQuestion.maxScore}
          onChange={(e) => updateQuestion({ maxScore: parseInt(e.target.value) || 1 })}
          required
          className="w-full px-4 py-2 border border-border rounded-lg"
        />
      </div>
    </div>
  );
}



"use client";

import Link from "next/link";
import { Navigation } from "@/components/Navigation";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            CipherExam
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Privacy-First Exam System Powered by FHEVM
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/exams"
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/exams/create"
              className="px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
            >
              Create Exam
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="p-6 bg-card rounded-lg shadow-card">
            <h3 className="text-xl font-semibold mb-2">🔒 Encrypted Storage</h3>
            <p className="text-muted-foreground">
              All answers and scores are encrypted end-to-end, preventing leaks and protecting student privacy.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-card">
            <h3 className="text-xl font-semibold mb-2">⚡ Chain Computation</h3>
            <p className="text-muted-foreground">
              Rankings and pass/fail judgments are computed on-chain in encrypted state using FHEVM.
            </p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-card">
            <h3 className="text-xl font-semibold mb-2">🛡️ Privacy Protection</h3>
            <p className="text-muted-foreground">
              Student data remains private and secure throughout the entire exam process.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div>
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                1
              </div>
              <p className="font-semibold">Create Exam</p>
              <p className="text-sm text-muted-foreground">Teachers create exams with encrypted passing thresholds</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                2
              </div>
              <p className="font-semibold">Submit Answers</p>
              <p className="text-sm text-muted-foreground">Students encrypt and submit scores for each question</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                3
              </div>
              <p className="font-semibold">Compute Results</p>
              <p className="text-sm text-muted-foreground">Chain computes totals and judgments in encrypted state</p>
            </div>
            <div>
              <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                4
              </div>
              <p className="font-semibold">View Scores</p>
              <p className="text-sm text-muted-foreground">Students decrypt and view their personal results</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



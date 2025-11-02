// layout.tsx - Server component for results route
// This provides generateStaticParams for static export compliance

import { ReactNode } from "react";

export function generateStaticParams() {
  // Return the same params as parent [examId] layout
  // This ensures results pages are generated for each examId
  return [
    { examId: '0' },
    { examId: '1' },
    { examId: '2' },
  ];
}

type Props = {
  children: ReactNode;
  params: Promise<{ examId: string }>;
};

export default async function ResultsLayout({ children, params }: Props) {
  await params; // Await params to satisfy Next.js 15 requirements
  return <>{children}</>;
}


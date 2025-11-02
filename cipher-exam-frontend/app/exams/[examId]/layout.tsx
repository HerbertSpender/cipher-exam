// layout.tsx - Server component for dynamic [examId] route segment
// This provides generateStaticParams for static export compliance

import { ReactNode } from "react";

export function generateStaticParams() {
  // For static export, we need to return all possible params
  // Since exam IDs are dynamic and created on-chain, we can't know them at build time
  // Return a placeholder array - these pages will be generated as client-side routes
  // In production, you might want to fetch from a contract or API at build time
  // For now, we return an empty array which means only the route structure is generated
  // The actual pages will be handled client-side via Next.js routing
  
  // Note: Next.js static export requires generateStaticParams to return at least something
  // We'll return a few placeholder values to satisfy the build requirement
  // These won't be used in production, as the actual exam IDs come from the blockchain
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

export default async function ExamIdLayout({ children, params }: Props) {
  // This is a server component, but we just pass through the children
  // The actual page components are client components
  await params; // Await params to satisfy Next.js 15 requirements
  return <>{children}</>;
}


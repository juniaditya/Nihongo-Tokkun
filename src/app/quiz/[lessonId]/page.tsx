import { getQuizSession } from "@/server/supabase/quiz";
import { notFound } from "next/navigation";
import { QuizShell } from "@/features/quiz/QuizShell";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}): Promise<Metadata> {
  const { lessonId } = await params;
  const session = await getQuizSession(lessonId);
  if (!session) return { title: "Quiz — 日本語特訓 N2" };
  return { title: `Quiz: ${session.lesson.label} — 日本語特訓 N2` };
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ section?: string; mode?: string }>;
}) {
  const { lessonId } = await params;
  const { section, mode } = await searchParams;
  const mixedMode = mode === "mixed" ? "mixed" as const : null;

  const session = await getQuizSession(lessonId, mixedMode ? null : section ?? null, mixedMode);
  if (!session) notFound();
  return <QuizShell session={session} />;
}

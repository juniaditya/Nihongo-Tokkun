import { getLessons } from "@/server/supabase/content";
import { getLearningSummary, getReviewQueueSummary } from "@/server/supabase/learning";
import { sortLessons } from "@/lib/lessonSort";
import { AlertCircle } from "lucide-react";
import CourseClientWrapper from "./CourseClientWrapper";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kursus — 日本語特訓 N2",
};

export default async function CoursesPage() {
  try {
    const [rawLessons, learning, reviewQueue] = await Promise.all([
      getLessons(),
      getLearningSummary(),
      getReviewQueueSummary(),
    ]);
    return <CourseClientWrapper lessons={sortLessons(rawLessons)} learning={learning} reviewQueue={reviewQueue} />;
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error loading lessons.";
    return (
      <div className="panel fade-in">
        <h2 className="panel-title error-title"><AlertCircle size={20} /> Kursus tidak dapat dimuat</h2>
        <p className="muted" style={{ marginTop: 12 }}>{error}</p>
      </div>
    );
  }
}

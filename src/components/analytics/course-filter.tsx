import Link from 'next/link';

interface CourseFilterProps {
  courses: Array<{ id: string; name: string; level: string | null }>;
  selectedCourseId: string | null;
}

export function CourseFilter({ courses, selectedCourseId }: CourseFilterProps) {
  if (courses.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm no-scrollbar">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
        Filter:
      </span>
      <Link
        href="/progress"
        className={`rounded-full px-4 py-1.5 font-medium transition-colors shrink-0 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          !selectedCourseId
            ? 'bg-primary-500 text-white font-semibold shadow-glow'
            : 'border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
        }`}
      >
        Semua
      </Link>
      {courses.map((course) => {
        const isSelected = selectedCourseId === course.id;
        return (
          <Link
            key={course.id}
            href={`/progress?course=${course.id}`}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors shrink-0 text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              isSelected
                ? 'bg-primary-500 text-white font-semibold shadow-glow'
                : 'border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
            }`}
          >
            {course.name}
          </Link>
        );
      })}
    </div>
  );
}

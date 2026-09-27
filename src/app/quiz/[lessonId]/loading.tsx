export default function QuizLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-10">
      <div className="space-y-4 w-full max-w-2xl animate-pulse">
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="h-8 w-64 bg-white/10 rounded" />
        <div className="h-32 bg-white/[0.03] rounded-xl border border-white/10" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/[0.03] rounded-lg border border-white/10" />
          ))}
        </div>
      </div>
    </div>
  );
}

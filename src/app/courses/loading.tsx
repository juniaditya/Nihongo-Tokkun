export default function CoursesLoading() {
  return (
    <div className="panel fade-in">
      <h2 className="panel-title">Memuat kursus...</h2>
      <div className="loading-skeleton-grid">
        {Array.from({ length: 9 }).map((_, i) => <div className="loading-skeleton loading-skeleton-tall" key={i} />)}
      </div>
    </div>
  );
}

export default function SearchLoading() {
  return (
    <div className="panel fade-in">
      <h2 className="panel-title">Memuat indeks pencarian...</h2>
      <div className="loading-skeleton-grid">
        {Array.from({ length: 6 }).map((_, i) => <div className="loading-skeleton" key={i} />)}
      </div>
    </div>
  );
}

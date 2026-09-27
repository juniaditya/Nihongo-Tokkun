export default function DashboardLoading() {
  return <LoadingPanel title="Memuat dashboard" />;
}

function LoadingPanel({ title }: { title: string }) {
  return (
    <div className="panel fade-in">
      <h2 className="panel-title">{title}</h2>
      <div className="loading-skeleton-grid">
        {Array.from({ length: 8 }).map((_, i) => <div className="loading-skeleton" key={i} />)}
      </div>
    </div>
  );
}

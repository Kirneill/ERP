export function LoadingState() {
  return (
    <div className="state-card" aria-busy="true" aria-label="Loading dashboard data">
      <div className="skeleton skeleton--title" />
      <div className="skeleton-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton skeleton--card" key={index} />
        ))}
      </div>
      <div className="skeleton skeleton--table" />
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <section className="empty-state" role="status">
      <p className="eyebrow">No records</p>
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section className="empty-state empty-state--error" role="alert">
      <p className="eyebrow">API issue</p>
      <h2>{title}</h2>
      <p>{message}</p>
      <button className="secondary-button" type="button" onClick={onRetry}>Retry dashboard fetch</button>
    </section>
  );
}

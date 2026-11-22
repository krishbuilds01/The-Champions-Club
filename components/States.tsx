// The three states every data view must have: loading, error, empty.
// One look for all of them, everywhere in the app.
export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <p className="muted" style={{ marginBottom: 4 }}>Loading…</p>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skel" style={{ width: `${92 - i * 9}%` }} />
      ))}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice err" role="alert">
      {message}{" "}
      {onRetry && (
        <button className="text-link" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty" role="status">{children}</div>;
}

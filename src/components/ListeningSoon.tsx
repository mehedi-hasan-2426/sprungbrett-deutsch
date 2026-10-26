export function ListeningSoon({ compact = false }: { compact?: boolean }) {
  return (
    <div className="soon">
      <p className="soon-tag">Coming soon</p>
      <p>
        <strong>Listening practice is being recorded.</strong>
        {compact ? null : " Real audio for every dialogue arrives in a later update. Until then, focus on reading, speaking and writing; listening is not counted in your scores."}
      </p>
    </div>
  );
}

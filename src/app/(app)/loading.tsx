export default function Loading() {
  return (
    <main className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Đang tải">
      <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-lg bg-surface" />
      ))}
    </main>
  );
}

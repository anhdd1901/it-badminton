/** Refuses to let e2e (which TRUNCATEs) touch a database that is not clearly the e2e one. */
export function assertSafeE2eDatabase(e2eUrl: string, others: (string | undefined)[]): void {
  const name = decodeURIComponent(new URL(e2eUrl).pathname.slice(1));
  if (!name.endsWith("_e2e")) {
    throw new Error(
      `DATABASE_URL_E2E phải trỏ tới database có tên kết thúc bằng "_e2e" (hiện là "${name}"); e2e sẽ TRUNCATE mọi bảng.`,
    );
  }
  if (others.some((u) => u && u === e2eUrl)) {
    throw new Error(
      "DATABASE_URL_E2E trùng DATABASE_URL hoặc DATABASE_URL_TEST; từ chối chạy vì e2e sẽ TRUNCATE mọi bảng.",
    );
  }
}

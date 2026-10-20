/** Refuses to let e2e (which TRUNCATEs) touch a database that is not clearly the e2e one. */

function dbName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1).replace(/\/+$/, ""));
}

/** host + port + database name; ignores credentials, query string and trailing slash. */
function identity(url: string): string {
  const u = new URL(url);
  return `${u.hostname.toLowerCase()}:${u.port || "5432"}/${dbName(url)}`;
}

const NAME_MESSAGE = (name: string) =>
  `Database e2e phải có tên kết thúc bằng "_e2e" (hiện là "${name}"); e2e sẽ TRUNCATE mọi bảng.`;

export function assertSafeE2eDatabase(e2eUrl: string, others: (string | undefined)[]): void {
  const name = dbName(e2eUrl);
  if (!name.endsWith("_e2e")) throw new Error(NAME_MESSAGE(name));
  const id = identity(e2eUrl);
  if (others.some((u) => u && identity(u) === id)) {
    throw new Error(
      "DATABASE_URL_E2E trùng DATABASE_URL hoặc DATABASE_URL_TEST; từ chối chạy vì e2e sẽ TRUNCATE mọi bảng.",
    );
  }
}

/** Checks the database actually connected to, right before a TRUNCATE. */
export function assertConnectedToE2e(currentDatabase: string): void {
  if (!currentDatabase.endsWith("_e2e")) throw new Error(NAME_MESSAGE(currentDatabase));
}

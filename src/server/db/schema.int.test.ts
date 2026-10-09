import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { makeMember, useTestDb, vn } from "../test/db";
import { members } from "./schema";

describe("schema", () => {
  const t = useTestDb();

  it("tạo được mem", async () => {
    const m = await makeMember(t.db, { username: "minh.nt" });
    const rows = await t.db.select().from(members).where(eq(members.id, m.id));
    expect(rows[0]).toMatchObject({ username: "minh.nt", role: "member", active: true, initialEloTenths: 10000 });
  });
  it("chỉ có một admin", async () => {
    await makeMember(t.db, { role: "admin" });
    await expect(makeMember(t.db, { role: "admin" })).rejects.toThrow();
  });
  it("username không trùng", async () => {
    await makeMember(t.db, { username: "a.b" });
    await expect(makeMember(t.db, { username: "a.b" })).rejects.toThrow();
  });
  it("vn() hiểu là giờ Việt Nam", () => expect(vn("2026-10-17T12:00").toISOString()).toBe("2026-10-17T05:00:00.000Z"));
});

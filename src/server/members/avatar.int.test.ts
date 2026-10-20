import { eq } from "drizzle-orm";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { Role } from "@/domain/types";
import type { Actor } from "../actor";
import { members } from "../db/schema";
import { MESSAGES } from "../errors";
import { makeMember, useTestDb, vn } from "../test/db";
import { removeAvatar, setAvatar } from "./avatar";
import type { AvatarStore } from "./avatar-store";
import { createMember } from "./profile";

function fakeStore(failRemove = false) {
  const puts: Buffer[] = [];
  const removed: string[] = [];
  const store: AvatarStore = {
    async put(bytes) {
      puts.push(bytes);
      return `https://blob.test/avatars/${puts.length}.webp`;
    },
    async remove(url) {
      removed.push(url);
      if (failRemove) throw new Error("boom");
    },
  };
  return { store, puts, removed };
}

const png = () =>
  sharp({ create: { width: 64, height: 64, channels: 3, background: "#cc3333" } })
    .png()
    .toBuffer();

describe("avatar", () => {
  const t = useTestDb();
  const actorOf = (m: { id: string; role: Role }): Actor => ({
    memberId: m.id,
    role: m.role,
    sessionId: "s",
  });
  const urlOf = async (id: string) =>
    (await t.db.select({ u: members.avatarUrl }).from(members).where(eq(members.id, id)))[0].u;

  it("mem tự đặt avatar; đặt lần hai xóa file cũ", async () => {
    const m = await makeMember(t.db, { role: "member" });
    const f = fakeStore();
    await setAvatar(t.db, actorOf(m), m.id, await png(), f.store);
    expect(await urlOf(m.id)).toBe("https://blob.test/avatars/1.webp");
    expect(f.removed).toEqual([]);
    await setAvatar(t.db, actorOf(m), m.id, await png(), f.store);
    expect(await urlOf(m.id)).toBe("https://blob.test/avatars/2.webp");
    expect(f.removed).toEqual(["https://blob.test/avatars/1.webp"]);
  });

  it("mem A đặt cho mem B: FORBIDDEN, store không được gọi", async () => {
    const a = await makeMember(t.db, { role: "member" });
    const b = await makeMember(t.db, { role: "member" });
    const sub = await makeMember(t.db, { role: "subadmin" });
    const f = fakeStore();
    for (const who of [a, sub]) {
      await expect(setAvatar(t.db, actorOf(who), b.id, await png(), f.store)).rejects.toMatchObject(
        {
          code: "FORBIDDEN",
          message: MESSAGES.forbidden,
        },
      );
      await expect(removeAvatar(t.db, actorOf(who), b.id, f.store)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    expect(f.puts).toHaveLength(0);
    expect(f.removed).toHaveLength(0);
    expect(await urlOf(b.id)).toBeNull();
  });

  it("admin đặt cho người khác", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const b = await makeMember(t.db, { role: "member" });
    const f = fakeStore();
    await setAvatar(t.db, actorOf(admin), b.id, await png(), f.store);
    expect(await urlOf(b.id)).not.toBeNull();
  });

  it("ảnh sai: VALIDATION, không ghi store, không đổi DB", async () => {
    const m = await makeMember(t.db, { role: "member" });
    const f = fakeStore();
    await expect(
      setAvatar(t.db, actorOf(m), m.id, Buffer.from("hello"), f.store),
    ).rejects.toMatchObject({ code: "VALIDATION", message: MESSAGES.avatarFormat });
    expect(f.puts).toHaveLength(0);
  });

  it("mem không tồn tại: NOT_FOUND và file vừa tải lên bị dọn", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const f = fakeStore();
    await expect(
      setAvatar(t.db, actorOf(admin), "00000000-0000-4000-8000-000000000000", await png(), f.store),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(f.removed).toEqual(f.puts.map((_, i) => `https://blob.test/avatars/${i + 1}.webp`));
  });

  it("lỗi xóa file cũ không làm hỏng thao tác", async () => {
    const m = await makeMember(t.db, { role: "member" });
    const f = fakeStore(true);
    await setAvatar(t.db, actorOf(m), m.id, await png(), f.store);
    await setAvatar(t.db, actorOf(m), m.id, await png(), f.store);
    expect(await urlOf(m.id)).toBe("https://blob.test/avatars/2.webp");
    await removeAvatar(t.db, actorOf(m), m.id, f.store);
    expect(await urlOf(m.id)).toBeNull();
  });

  it("removeAvatar: avatarUrl null và remove được gọi", async () => {
    const m = await makeMember(t.db, { role: "member" });
    const f = fakeStore();
    await setAvatar(t.db, actorOf(m), m.id, await png(), f.store);
    await removeAvatar(t.db, actorOf(m), m.id, f.store);
    expect(await urlOf(m.id)).toBeNull();
    expect(f.removed).toEqual(["https://blob.test/avatars/1.webp"]);
  });

  it("createMember có avatar", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const f = fakeStore();
    const { id } = await createMember(
      t.db,
      actorOf(admin),
      {
        username: "co.anh",
        displayName: "Có ảnh",
        password: "matkhau123",
        initialElo: 1000,
        avatar: await png(),
      },
      vn("2026-10-14T10:00"),
      f.store,
    );
    expect(await urlOf(id)).toBe("https://blob.test/avatars/1.webp");
  });

  it("createMember: ảnh sai thì không tạo mem", async () => {
    const admin = await makeMember(t.db, { role: "admin" });
    const f = fakeStore();
    await expect(
      createMember(
        t.db,
        actorOf(admin),
        {
          username: "anh.hong",
          displayName: "X",
          password: "matkhau123",
          initialElo: 1000,
          avatar: Buffer.from("hello"),
        },
        vn("2026-10-14T10:00"),
        f.store,
      ),
    ).rejects.toMatchObject({ message: MESSAGES.avatarFormat });
    const rows = await t.db.select().from(members).where(eq(members.username, "anh.hong"));
    expect(rows).toHaveLength(0);
  });
});

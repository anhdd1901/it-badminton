import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound, redirect } from "next/navigation";
import { AppError, MESSAGES } from "@/server/errors";

vi.mock("server-only", () => ({}));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));
const getActor = vi.fn();
vi.mock("./session", () => ({ getActor }));
vi.mock("./db", () => ({ getDb: () => ({}) }));
vi.mock("./clock", () => ({ now: () => new Date(0) }));

const { runAction, toActionResult } = await import("./action");

beforeEach(() => vi.clearAllMocks());

describe("toActionResult", () => {
  it("maps AppError", () => {
    expect(toActionResult(new AppError("LOCKED", MESSAGES.matchDayLocked))).toEqual({
      ok: false,
      code: "LOCKED",
      message: "Buổi đấu đã khóa, không thể thay đổi điểm danh",
    });
  });
  it("hides unexpected errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = toActionResult(new Error("postgres://u:HASH123@h/db"));
    expect(r).toEqual({
      ok: false,
      code: "UNEXPECTED",
      message: "Có lỗi không mong muốn, hãy thử lại",
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("HASH123");
    expect(spy).toHaveBeenCalledWith("Error");
  });
});

describe("runAction", () => {
  it("rejects when not logged in", async () => {
    getActor.mockResolvedValue(null);
    const fn = vi.fn();
    const r = await runAction(fn);
    expect(r).toEqual({
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Phiên đăng nhập đã hết, hãy đăng nhập lại",
    });
    expect(fn).not.toHaveBeenCalled();
  });
  it("revalidates on success", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member", sessionId: "s" });
    const r = await runAction(async () => 5);
    expect(r).toEqual({ ok: true, data: 5 });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("converts thrown errors", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member", sessionId: "s" });
    const r = await runAction(async () => {
      throw new AppError("FORBIDDEN", MESSAGES.forbidden);
    });
    expect(r).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("rethrows redirect after revalidating", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member", sessionId: "s" });
    await expect(runAction(async () => redirect("/toi"))).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
  it("rethrows notFound", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member", sessionId: "s" });
    await expect(runAction(async () => notFound())).rejects.toBeDefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("still maps a plain Error to UNEXPECTED", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member", sessionId: "s" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await runAction(async () => {
      throw new Error("boom");
    });
    expect(r).toMatchObject({ ok: false, code: "UNEXPECTED" });
  });
});

describe("runAction revalidate option", () => {
  it("skips revalidatePath when revalidate is false", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member" });
    const r = await runAction(async () => 1, { revalidate: false });
    expect(r).toEqual({ ok: true, data: 1 });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("revalidates by default", async () => {
    getActor.mockResolvedValue({ memberId: "m", role: "member" });
    await runAction(async () => 1);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

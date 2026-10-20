// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UNEXPECTED_MESSAGE, type ActionResult } from "@/ui/action-result";
import { useAppAction } from "./use-app-action";

const replace = vi.fn();
const toastError = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  // Stand-in with Next's behaviour: navigation errors carry a digest and are rethrown.
  unstable_rethrow: (e: unknown) => {
    const digest = (e as { digest?: unknown } | null)?.digest;
    if (
      typeof digest === "string" &&
      (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
    )
      throw e;
  },
}));
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m) } }));

beforeEach(() => {
  replace.mockReset();
  toastError.mockReset();
});

async function runWith(result: ActionResult<number>) {
  const { result: hook } = renderHook(() => useAppAction(async () => result));
  let out: ActionResult<number> | undefined;
  await act(async () => {
    out = await hook.current.run();
  });
  return out;
}

describe("useAppAction", () => {
  it("UNAUTHENTICATED chuyển về /dang-nhap và vẫn trả kết quả", async () => {
    const r: ActionResult<number> = { ok: false, code: "UNAUTHENTICATED", message: "hết phiên" };
    expect(await runWith(r)).toEqual(r);
    expect(replace).toHaveBeenCalledWith("/dang-nhap");
    expect(toastError).not.toHaveBeenCalled();
  });

  it.each(["FORBIDDEN", "UNEXPECTED"] as const)("%s hiện toast lỗi", async (code) => {
    const r: ActionResult<number> = { ok: false, code, message: "lỗi X" };
    expect(await runWith(r)).toEqual(r);
    expect(toastError).toHaveBeenCalledWith("lỗi X");
    expect(replace).not.toHaveBeenCalled();
  });

  it("thành công: không toast, không chuyển trang", async () => {
    const r: ActionResult<number> = { ok: true, data: 1 };
    expect(await runWith(r)).toEqual(r);
    expect(toastError).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("pending true khi đang chạy, false sau đó, kể cả khi ném lỗi", async () => {
    let release!: () => void;
    const gate = new Promise<void>((res) => (release = res));
    const { result: hook } = renderHook(() =>
      useAppAction(async (fail: boolean): Promise<ActionResult<number>> => {
        await gate;
        if (fail) throw new Error("boom");
        return { ok: true, data: 1 };
      }),
    );
    expect(hook.current.pending).toBe(false);
    let p!: Promise<unknown>;
    act(() => {
      p = hook.current.run(false);
    });
    expect(hook.current.pending).toBe(true);
    await act(async () => {
      release();
      await p;
    });
    expect(hook.current.pending).toBe(false);

    await act(async () => {
      const out = await hook.current.run(true);
      expect(out).toEqual({ ok: false, code: "UNEXPECTED", message: UNEXPECTED_MESSAGE });
    });
    expect(toastError).toHaveBeenCalledWith(UNEXPECTED_MESSAGE);
    expect(hook.current.pending).toBe(false);
  });

  it("lỗi chuyển hướng của Next được ném lại: không toast, pending false", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/dang-nhap;307;",
    });
    const { result: hook } = renderHook(() =>
      useAppAction(async (): Promise<ActionResult<number>> => {
        throw redirectError;
      }),
    );
    await act(async () => {
      await expect(hook.current.run()).rejects.toBe(redirectError);
    });
    expect(toastError).not.toHaveBeenCalled();
    expect(hook.current.pending).toBe(false);
  });
});

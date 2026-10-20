// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/ui/action-result";
import { useAppAction } from "./use-app-action";

const replace = vi.fn();
const toastError = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
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
      await expect(hook.current.run(true)).rejects.toThrow("boom");
    });
    expect(hook.current.pending).toBe(false);
  });
});

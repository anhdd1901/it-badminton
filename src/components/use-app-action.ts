"use client";
import { unstable_rethrow, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { UNEXPECTED_MESSAGE, type ActionResult } from "@/ui/action-result";

export function useAppAction<A extends unknown[], T>(
  action: (...args: A) => Promise<ActionResult<T>>,
): { run: (...args: A) => Promise<ActionResult<T>>; pending: boolean } {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (...args: A) => {
      setPending(true);
      try {
        const result = await action(...args);
        if (!result.ok) {
          if (result.code === "UNAUTHENTICATED") router.replace("/dang-nhap");
          else if (result.code === "FORBIDDEN" || result.code === "UNEXPECTED") {
            toast.error(result.message);
          }
        }
        return result;
      } catch (e) {
        // A Server Action's redirect() rejects the client promise with a redirect
        // error that the router must see, so Next navigation errors are rethrown.
        unstable_rethrow(e);
        // Anything else is a failed call (body over the limit, network drop).
        toast.error(UNEXPECTED_MESSAGE);
        return { ok: false, code: "UNEXPECTED", message: UNEXPECTED_MESSAGE } as ActionResult<T>;
      } finally {
        setPending(false);
      }
    },
    [action, router],
  );
  return { run, pending };
}

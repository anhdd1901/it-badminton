"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/ui/action-result";

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
      } finally {
        setPending(false);
      }
    },
    [action, router],
  );
  return { run, pending };
}

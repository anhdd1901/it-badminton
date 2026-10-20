"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-col items-center gap-4 p-8 text-center">
      <p role="alert">Có lỗi không mong muốn, hãy thử lại</p>
      <Button onClick={reset} className="rounded-full bg-accent text-on-accent">
        Thử lại
      </Button>
    </main>
  );
}

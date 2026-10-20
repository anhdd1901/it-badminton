import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p>Không tìm thấy trang</p>
      <Link href="/" className="inline-flex min-h-11 items-center text-accent-text underline">
        Về trang chủ
      </Link>
    </main>
  );
}

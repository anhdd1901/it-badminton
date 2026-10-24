import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const beVietnamPro = localFont({
  src: [
    { path: "../fonts/be-vietnam-pro/BeVietnamPro-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/be-vietnam-pro/BeVietnamPro-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/be-vietnam-pro/BeVietnamPro-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/be-vietnam-pro/BeVietnamPro-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

const barlowCondensed = localFont({
  src: [
    {
      path: "../fonts/barlow-condensed/BarlowCondensed-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../fonts/barlow-condensed/BarlowCondensed-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ANH EM IT",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get("theme")?.value;
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html
      lang="vi"
      data-theme={dataTheme}
      className={`${beVietnamPro.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

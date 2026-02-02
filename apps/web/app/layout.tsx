import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { TRPCProvider } from "./lib/trpc/provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "面试后 - 面试管理系统",
  description: "专业的面试题目和题库管理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}

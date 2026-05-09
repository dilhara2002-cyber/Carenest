import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CareNest - Midwifery and Maternal Care Management",
  description: "Web-Based Midwifery and Maternal Care Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-gray-50 overflow-x-hidden`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Marcellus } from "next/font/google";
import "./globals.css";

const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EMJ Sports | Premium FIFA Live TV",
  description: "Elite live sports broadcast player and match center powered by high-fidelity streams."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={marcellus.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

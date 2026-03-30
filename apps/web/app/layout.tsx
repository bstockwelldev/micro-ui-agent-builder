import type { Metadata } from "next";
import "streamdown/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Micro UI Agent Builder",
  description: "Prototype flow studio with AI SDK v6 and file-backed studio store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}

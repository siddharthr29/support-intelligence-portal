import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Avni Support Intelligence",
  description: "Weekly analytics and insights for Avni support data",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

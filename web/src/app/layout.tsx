import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Solcraft | The Voxel-Based Solana Metaverse",
  description:
    "Not another idle clicker. This is a living, breathing world where every block, trade, and death is immutably recorded on Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} scroll-smooth`}>
      <body className="antialiased bg-[#FAFAFA] text-[#09090B] overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}

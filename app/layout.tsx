import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project SILK - AI Companion',
  description: 'Cinematic AI companion web app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-rose-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

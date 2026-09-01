import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SILK AI Companion',
  description: 'Mobile-first SILK AI Voice & Chat Companion',
  manifest: '/manifest.json',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
  themeColor: '#0B0512',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0B0512' }}>
        {children}
      </body>
    </html>
  );
}
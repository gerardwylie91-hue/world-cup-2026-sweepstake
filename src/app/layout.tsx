import './globals.css';

export const metadata = {
  title: 'World Cup 2026 Sweepstake',
  description: 'Live World Cup 2026 sweepstake tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

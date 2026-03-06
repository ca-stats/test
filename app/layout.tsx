import type { Metadata } from 'next';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import './globals.css';

const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fira-sans',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fira-code',
});

export const metadata: Metadata = {
  title: 'CAHW Dashboard',
  description: 'AI-powered sales dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={`${firaSans.variable} ${firaCode.variable} font-sans bg-[var(--color-background)]`}>
        {children}
      </body>
    </html>
  );
}

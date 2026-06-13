import "./globals.css";

export const metadata = {
  title: "Employee Intake Contracts",
  description: "従業員誓約書・SNS誓約書の入社手続きアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}


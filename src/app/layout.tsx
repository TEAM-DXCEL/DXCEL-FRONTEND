import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DXCEL",
  description: "합성 데이터 연구의 실험 결과와 개선 과정을 기록하는 대시보드",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

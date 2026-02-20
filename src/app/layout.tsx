import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import ReduxProvider from "@/store/ReduxProvider";
import "./globals.css";
export const metadata: Metadata = { title: "DBA HRMS", description: "Department of Buddhist Affairs - HRMS" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 min-h-screen">
        <ReduxProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </ReduxProvider>
      </body>
    </html>
  );
}

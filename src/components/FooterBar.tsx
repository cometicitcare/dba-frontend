// app/components/FooterBar.tsx
"use client";

/**
 * FooterBar
 * - Ultra-small text, non-bold
 * - 3 fixed lines
 * - Underlined external link for "Cometic IT Care"
 */
import React from "react";

export function FooterBar() {
  const lines: React.ReactNode[] = [
    "© 2025 Department of Buddhist Affairs, Sri Lanka. All Rights Reserved. Tel: +94 (11) 230 7494 | Email: dba.gov.lk@gmail.com",
    <>
      Developed &amp; Maintained by{" "}
      <a
        href="https://cometicitcare.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 decoration-white/90 hover:decoration-white focus:outline-none focus:ring focus:ring-white/40 rounded-sm"
      >
        Cometic IT Care
      </a>{" "}
      | Support: info@cometicitcare.com
    </>,
    "Secure. Reliable. Government Standard.",
  ];

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 bg-blue-900 px-4 py-2 z-50 shadow-lg"
      role="contentinfo"
      aria-label="Department of Buddhist Affairs footer"
    >
      <div className="max-w-screen-xl mx-auto">
        {/* Why: explicit 3 lines; tiny; underlined link for clarity */}
        <div className="flex flex-col items-center gap-0.5 text-center leading-tight">
          {lines.map((text, idx) => (
            <p
              key={idx}
              className="text-white text-[10px] sm:text-[11px] md:text-xs font-normal break-words"
            >
              {text}
            </p>
          ))}
        </div>
      </div>
    </footer>
  );
}

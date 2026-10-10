"use client";

import { useEffect, useState } from "react";

/** Decorative rising embers. Generated client-side to avoid hydration mismatches. */
export function Embers({ count = 26 }: { count?: number }) {
  const [embers, setEmbers] = useState<{ left: number; delay: number; dur: number; drift: number; size: number }[]>([]);
  useEffect(() => {
    setEmbers(
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 8 + Math.random() * 10,
        drift: (Math.random() - 0.5) * 160,
        size: 2 + Math.random() * 4,
      }))
    );
  }, [count]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.dur}s`,
            ["--drift" as any]: `${e.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

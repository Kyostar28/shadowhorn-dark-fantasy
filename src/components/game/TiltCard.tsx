"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card that tilts in 3D following the mouse pointer. */
export function TiltCard({ children, className, max = 12 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * max}deg) rotateX(${-y * max}deg) translateZ(0)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = "rotateY(0deg) rotateX(0deg)";
  };
  return (
    <div className="tilt-scene">
      <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={cn("tilt-card", className)}>
        {children}
      </div>
    </div>
  );
}

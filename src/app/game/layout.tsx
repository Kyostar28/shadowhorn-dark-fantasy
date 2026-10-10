import type { ReactNode } from "react";
import { HeroProvider } from "@/components/game/HeroProvider";
import { GameShell } from "@/components/game/GameShell";

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <HeroProvider>
      <GameShell>{children}</GameShell>
    </HeroProvider>
  );
}

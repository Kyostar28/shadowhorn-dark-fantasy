"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useHero } from "@/components/game/HeroProvider";
import { PageTitle } from "@/components/game/PageTitle";
import type { PtcAd } from "@/lib/game/types";
import { ExternalLink, Loader2, X } from "lucide-react";

type Ad = PtcAd & { viewedAt: string | null; availableAt: number };
interface Viewing { viewId: string; duration: number; url: string; title: string; reward: number; startedAt: number }

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export default function PtcPage() {
  const { refresh } = useHero();
  const [data, setData] = useState<{ ads: Ad[]; earnedToday: number } | null>(null);
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const completing = useRef(false);

  const load = useCallback(async () => {
    const r = await api.get<{ ads: Ad[]; earnedToday: number }>("/api/ptc");
    if (r.ok && r.data) setData(r.data);
    else toast.error(String(r.error));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const start = async (ad: Ad) => {
    setBusy(true);
    console.log("[PTC] start", ad.title);
    const r = await api.post<Omit<Viewing, "startedAt">>("/api/ptc", { action: "start", adId: ad._id });
    setBusy(false);
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      return;
    }
    completing.current = false;
    setViewing({ ...r.data, startedAt: Date.now() });
  };

  const remaining = viewing ? viewing.duration * 1000 - (now - viewing.startedAt) : 0;
  const ready = !!viewing && remaining <= 0;

  const complete = async () => {
    if (!viewing || completing.current) return;
    completing.current = true;
    const r = await api.post<{ reward: number }>("/api/ptc", { action: "complete", viewId: viewing.viewId });
    if (!r.ok || !r.data) {
      toast.error(String(r.error));
      completing.current = false;
      return;
    }
    toast.success(`+${r.data.reward} SHC acreditados`);
    setViewing(null);
    await Promise.all([load(), refresh()]);
  };

  return (
    <div>
      <PageTitle
        kicker="Pago por clic"
        title="Anuncios PTC"
        subtitle="Visualiza anuncios de patrocinadores durante el tiempo indicado y gana Shadowcoins (SHC). Cada anuncio se puede ver una vez cada 24 horas."
        right={data && <span className="panel px-4 py-2 font-display text-[#67e8f9]">Hoy: +{data.earnedToday} SHC</span>}
      />

      {viewing && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/90 backdrop-blur">
          <div className="flex items-center gap-4 border-b border-white/10 bg-[#120e18] px-4 py-3">
            <div className="relative h-12 w-12 shrink-0">
              <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e0a84f" strokeWidth="3" strokeDasharray={100.5} strokeDashoffset={100.5 * Math.max(0, remaining) / (viewing.duration * 1000)} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold">{Math.max(0, Math.ceil(remaining / 1000))}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-bold text-[#fde7b0]">{viewing.title}</p>
              <p className="text-xs text-white/60">{ready ? "¡Listo! Reclama tu recompensa." : "Mantén esta ventana abierta hasta que termine el contador."}</p>
            </div>
            <a href={viewing.url} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-1 text-xs text-white/60 hover:text-white sm:flex"><ExternalLink className="h-3 w-3" /> Abrir</a>
            <button disabled={!ready} onClick={complete} className="btn-gold rounded-md px-4 py-2 font-display text-sm font-bold">Reclamar +{viewing.reward} SHC</button>
            <button onClick={() => setViewing(null)} className="text-white/50 hover:text-white" aria-label="Cerrar"><X className="h-5 w-5" /></button>
          </div>
          <iframe src={viewing.url} title={viewing.title} className="w-full flex-1 bg-white" sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
        </div>
      )}

      {!data ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.ads.map((ad) => {
            const locked = ad.availableAt > now;
            return (
              <div key={ad._id} className={`panel flex flex-col p-5 transition hover:-translate-y-1 ${locked ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-[#fde7b0]">{ad.title}</h3>
                  <span className="shrink-0 rounded-full bg-[#22d3ee]/15 px-2.5 py-0.5 text-sm font-bold text-[#67e8f9]">+{ad.reward_coins}</span>
                </div>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{ad.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-white/50">⏱ {ad.duration_seconds} s</span>
                  {locked ? (
                    <span className="text-xs text-white/60">Disponible en {fmt(ad.availableAt - now)}</span>
                  ) : (
                    <button disabled={busy} onClick={() => start(ad)} className="btn-forge rounded-md px-4 py-1.5 text-sm font-bold">👁 Ver anuncio</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

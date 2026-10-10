"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/game/AuthShell";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/game";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        console.error("[AUTH] login error", result.error);
        setError(result.error.message || "Credenciales incorrectas.");
        setLoading(false);
        return;
      }
      console.log("[AUTH] login ok, redirecting to", redirect);
      // Wait for the cookie to be set, then full reload
      setTimeout(() => {
        window.location.href = redirect;
      }, 500);
    } catch (err: any) {
      console.error("[AUTH] login exception:", err);
      setError(err.message || "Error al iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Regresa a Shadowhorn" subtitle="Inicia sesión para continuar tu leyenda.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="heroe@shadowhorn.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 bg-black/40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 bg-black/40" />
        </div>
        <button type="submit" disabled={loading} className="btn-forge flex h-11 w-full items-center justify-center gap-2 rounded-md font-display font-bold">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Entrando..." : "Entrar al reino"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-[#e0a84f] hover:underline">Crea tu héroe</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#e0a84f]" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

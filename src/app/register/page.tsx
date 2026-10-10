"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/game/AuthShell";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const result = await signUp.email({ email: form.email, password: form.password, name: form.name });
      if (result.error) {
        console.error("[AUTH] register error", result.error);
        setError(result.error.message || "No se pudo crear la cuenta.");
        setLoading(false);
        return;
      }
      console.log("[AUTH] register ok, going to hero creation");
      setTimeout(() => {
        window.location.href = "/game/create";
      }, 500);
    } catch (err: any) {
      console.error("[AUTH] register exception:", err);
      setError(err.message || "No se pudo crear la cuenta.");
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Únete a la batalla" subtitle="Crea tu cuenta y forja un héroe de la Alianza o de la Horda.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" placeholder="Tu nombre" value={form.name} onChange={set("name")} required className="h-11 bg-black/40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="heroe@shadowhorn.com" value={form.email} onChange={set("email")} required className="h-11 bg-black/40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" value={form.password} onChange={set("password")} required className="h-11 bg-black/40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirmar</Label>
            <Input id="confirm" type="password" value={form.confirm} onChange={set("confirm")} required className="h-11 bg-black/40" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-forge flex h-11 w-full items-center justify-center gap-2 rounded-md font-display font-bold">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-[#e0a84f] hover:underline">Inicia sesión</Link>
        </p>
      </form>
    </AuthShell>
  );
}

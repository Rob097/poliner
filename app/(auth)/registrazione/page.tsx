"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function RegistrazionePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError("Ops, non sono riuscita a creare l'account. Controlla i dati e riprova.");
      return;
    }
    if (data.user && !data.session) {
      setInfo("Controlla la tua casella email per confermare l'account!");
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center pb-6 gap-3">
        <div className="text-6xl">🥚</div>
        <PolinerLogo size="lg" />
        <p className="text-[15px] text-[var(--text-secondary)] mt-1">
          Crea il tuo pollaio digitale ✨
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <FormField label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.it"
            required
            autoComplete="email"
            autoFocus
          />
        </FormField>
        <FormField label="Password">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 8 caratteri"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </FormField>

        {error && (
          <p className="text-sm text-[#c0435a] mb-3 text-center">{error}</p>
        )}
        {info && (
          <p className="text-sm text-[var(--primary)] mb-3 text-center">{info}</p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={loading || !email || password.length < 8}>
          {loading ? "Creazione account..." : "Crea account"}
        </Button>
      </form>

      <div className="text-center mt-6 mb-2 text-sm text-[var(--text-secondary)]">
        Hai già un account?{" "}
        <Link href="/login" className="text-[var(--primary)] font-semibold">
          Accedi
        </Link>
      </div>
    </div>
  );
}

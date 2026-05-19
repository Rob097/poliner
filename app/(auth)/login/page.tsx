"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Ops, email o password non corrette — riprova!");
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center pb-6 gap-3">
        <div className="text-6xl">🐔</div>
        <PolinerLogo size="lg" />
        <p className="text-[15px] text-[var(--text-secondary)] mt-1">
          Bentornata nel tuo pollaio digitale
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col">
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
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            minLength={6}
          />
          <div className="text-right -mt-1">
            <Link href="/reset-password" className="text-[13px] text-[var(--text-secondary)]">
              Password dimenticata?
            </Link>
          </div>
        </FormField>

        {error && (
          <p className="text-sm text-[#c0435a] mb-3 text-center">{error}</p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={loading || !email || !password}>
          {loading ? "Accesso in corso..." : "Accedi"}
        </Button>
      </form>

      <div className="text-center mt-6 mb-2 text-sm text-[var(--text-secondary)]">
        Non hai ancora un account?{" "}
        <Link href="/registrazione" className="text-[var(--primary)] font-semibold">
          Registrati
        </Link>
      </div>
    </div>
  );
}

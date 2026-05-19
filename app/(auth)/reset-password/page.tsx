"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PolinerLogo } from "@/components/brand/PolinerLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setLoading(false);
    if (error) {
      setError("Ops, qualcosa non ha funzionato — riprova!");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center pb-8">
        <PolinerLogo size="lg" />
        <p className="text-[15px] text-[var(--text-secondary)] mt-4">
          Recupera la password
        </p>
      </div>

      {sent ? (
        <div className="text-center">
          <div className="text-5xl mb-4">📧</div>
          <p className="text-text mb-2 font-semibold">Email inviata!</p>
          <p className="text-[var(--text-secondary)] text-sm">
            Controlla la casella e clicca sul link per impostare una nuova password.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <FormField label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.it"
              required
              autoComplete="email"
            />
          </FormField>

          {error && (
            <p className="text-sm text-[#c0435a] mb-3 text-center">{error}</p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={loading}>
            {loading ? "Invio..." : "Invia link di reset"}
          </Button>
        </form>
      )}

      <div className="text-center mt-6 text-sm">
        <Link href="/login" className="text-[var(--text-secondary)]">
          ← Torna al login
        </Link>
      </div>
    </div>
  );
}

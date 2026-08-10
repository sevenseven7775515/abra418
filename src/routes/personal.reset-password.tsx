import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/personal/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nova senha — PERSONAL OS" },
      { name: "description", content: "Defina uma nova senha para acessar sua central pessoal PERSONAL OS." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Nova senha — PERSONAL OS" },
      { property: "og:description", content: "Redefinição de senha do PERSONAL OS." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else navigate({ to: "/personal/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background bg-grid px-6 text-foreground">
      <form onSubmit={onSubmit} className="panel w-full max-w-sm p-7">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">PERSONAL OS</p>
        <h1 className="mt-2 text-xl font-bold">Definir nova senha</h1>
        <div className="mt-6 space-y-2">
          <Label htmlFor="pw">Nova senha</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-6 h-11 w-full font-bold glow-neon">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} SALVAR SENHA
        </Button>
      </form>
    </div>
  );
}
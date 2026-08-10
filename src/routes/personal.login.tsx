import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/personal/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — PERSONAL OS" },
      { name: "description", content: "Acesse sua central pessoal de comando: rotina, tarefas, finanças, estudos e conhecimento em um só lugar." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Entrar — PERSONAL OS" },
      { property: "og:description", content: "Área pessoal privada do PERSONAL OS." },
    ],
  }),
  component: LoginPage,
});

const BENEFITS = [
  "Planejamento diário",
  "Gestão de tarefas",
  "Controle financeiro",
  "Biblioteca pessoal",
  "Diário inteligente",
  "Organização de práticas",
];

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/personal/dashboard", replace: true });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate({ to: "/personal/dashboard", replace: true });
    } catch (err) {
      setError(
        err instanceof Error && /invalid/i.test(err.message)
          ? "Credenciais inválidas."
          : "Não foi possível entrar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background bg-grid text-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <section className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Área pessoal privada
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Seu sistema operacional <span className="text-neon">pessoal.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            Organize sua rotina, negócios, estudos, finanças e conhecimento em um único ambiente
            inteligente.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-foreground/85">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <div className="panel p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">PERSONAL OS</p>
            <h2 className="mt-2 text-xl font-bold">Entrar na sua central</h2>
            <p className="mt-1 text-xs text-muted-foreground">Acesso privado autorizado.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" disabled={loading} className="h-11 w-full font-bold tracking-wide glow-neon">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                ENTRAR
              </Button>
            </form>

            <div className="mt-6 border-t border-border pt-4">
              <p className="text-[11px] text-muted-foreground">
                Ambiente restrito ao usuário autorizado. Sessão mantida até você sair.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
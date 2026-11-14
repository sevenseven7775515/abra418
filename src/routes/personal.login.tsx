import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { ALLOWED_EMAIL, isAllowedEmail } from "@/lib/allowed-user";
import { supabase } from "@/integrations/supabase/client";

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

const GOOGLE_SVG = (
  <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    if (isAllowedEmail(data.user.email)) navigate({ to: "/personal/dashboard", replace: true });
    else {
      await supabase.auth.signOut();
      setError("Acesso não autorizado.");
    }
  }

  useEffect(() => {
    check();
    const { data } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") check(); });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn() {
    setLoading(true);
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/personal/login`,
      extraParams: { login_hint: ALLOWED_EMAIL, prompt: "select_account" },
    });
    if (result.error) { setError("Não foi possível entrar."); setLoading(false); return; }
    if (result.redirected) return;
    await check();
    setLoading(false);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <div className="panel w-full max-w-sm p-8 text-center">
        <ShieldCheck className="mx-auto h-6 w-6 text-primary" />
        <h1 className="mt-4 text-lg font-bold">Acesso privado</h1>
        <button
          type="button"
          onClick={signIn}
          disabled={loading}
          className="mt-6 inline-flex h-10 w-full items-center justify-center gap-[10px] rounded-md border px-3 text-sm font-medium"
          style={{ background: "#131314", borderColor: "#8E918F", color: "#E3E3E3" }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : GOOGLE_SVG}
          Continuar com Google
        </button>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

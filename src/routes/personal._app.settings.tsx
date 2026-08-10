import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, LogOut, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, Opt, Select, Stat, useUserId } from "@/components/personal/kit";

export const Route = createFileRoute("/personal/_app/settings")({
  head: () => ({
    meta: [
      { title: "Configurações — PERSONAL OS" },
      { name: "description", content: "Gerencie perfil, preferências de tema e notificações, exporte seus dados e encerre a sessão." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Configurações — PERSONAL OS" },
      { property: "og:description", content: "Perfil, preferências e exportação de dados." },
    ],
  }),
  component: SettingsPage,
});

const EXPORT_TABLES = [
  "tasks", "missions", "events", "finance_transactions", "shopping_items", "brain_notes",
  "books", "journal_entries", "practices", "practice_logs", "companies", "business_projects",
  "clients", "documents", "thelema_texts", "thelema_journal", "life_goals", "personal_values",
] as const;

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const userId = useUserId();
  const [form, setForm] = useState({ display_name: "", bio: "", location: "", theme: "dark", notifications: true, avatar_url: "" });
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const { data: email } = useQuery({
    queryKey: ["auth-email"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.email ?? "",
  });

  const { data: settings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setForm({
        display_name: settings.display_name ?? "",
        bio: settings.bio ?? "",
        location: settings.location ?? "",
        theme: settings.theme ?? "dark",
        notifications: settings.notifications !== false,
        avatar_url: settings.avatar_url ?? "",
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_settings").upsert({ user_id: userId!, ...form }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      qc.invalidateQueries({ queryKey: ["user-settings"] });
    },
  });

  const exportData = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { exported_at: new Date().toISOString() };
      for (const table of EXPORT_TABLES) {
        const { data } = await supabase.from(table).select("*");
        payload[table] = data ?? [];
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personal-os-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/personal/login", replace: true });
  }

  async function pickAvatar(file: File) {
    setAvatarError(null);
    try {
      const bitmap = await createImageBitmap(file);
      const size = 320;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível processar a imagem.");
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
      setForm((f) => ({ ...f, avatar_url: canvas.toDataURL("image/jpeg", 0.85) }));
    } catch {
      setAvatarError("Não foi possível ler essa imagem. Use JPG ou PNG.");
    }
  }

  return (
    <PersonalShell title="Configurações" subtitle="Perfil, preferências e seus dados.">
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Stat label="Conta" value={email || "—"} />
        <Stat label="Tema" value={form.theme === "dark" ? "Escuro" : "Claro"} hint="Premium Dark é o padrão do sistema" />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="panel mb-6 grid gap-4 p-5 sm:grid-cols-2">
        <div className="flex items-center gap-4 sm:col-span-2">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-primary bg-secondary">
            {form.avatar_url
              ? <img src={form.avatar_url} alt="Foto de perfil" className="h-full w-full object-cover" />
              : <span className="text-xs text-muted-foreground">sem foto</span>}
          </div>
          <div className="grid gap-2">
            <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:border-primary hover:text-primary">
              <Upload className="h-4 w-4" /> Escolher foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickAvatar(f); }}
              />
            </label>
            {form.avatar_url && (
              <button type="button" onClick={() => setForm({ ...form, avatar_url: "" })} className="w-fit text-xs text-muted-foreground hover:text-destructive">
                Remover foto
              </button>
            )}
            {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
            <p className="text-xs text-muted-foreground">A foto aparece na sua Dashboard. Salve para aplicar.</p>
          </div>
        </div>
        <Field label="Nome de exibição"><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></Field>
        <Field label="Localização"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="São João del-Rei - MG" /></Field>
        <Field label="Tema">
          <Select value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            <Opt value="dark">Escuro (Premium Dark)</Opt>
            <Opt value="light">Claro</Opt>
          </Select>
        </Field>
        <Field label="Notificações">
          <Select value={form.notifications ? "on" : "off"} onChange={(e) => setForm({ ...form, notifications: e.target.value === "on" })}>
            <Opt value="on">Ativadas</Opt>
            <Opt value="off">Desativadas</Opt>
          </Select>
        </Field>
        <Field label="Bio" className="sm:col-span-2"><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={save.isPending} className="font-semibold glow-neon"><Save className="h-4 w-4" /> Salvar</Button>
          {saved && <span className="text-sm text-primary">Preferências salvas.</span>}
        </div>
      </form>

      <div className="panel mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold">Exportar dados</p>
          <p className="text-sm text-muted-foreground">Baixe um arquivo JSON com todos os seus registros do PERSONAL OS.</p>
        </div>
        <Button variant="outline" onClick={() => exportData.mutate()} disabled={exportData.isPending}>
          <Download className="h-4 w-4" /> {exportData.isPending ? "Gerando..." : "Exportar JSON"}
        </Button>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="font-semibold">Sessão</p>
          <p className="text-sm text-muted-foreground">Encerrar o acesso neste dispositivo.</p>
        </div>
        <Button variant="destructive" onClick={signOut}><LogOut className="h-4 w-4" /> Sair</Button>
      </div>
    </PersonalShell>
  );
}

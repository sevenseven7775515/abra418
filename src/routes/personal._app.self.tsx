import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ENNEAGRAM, MBTI_DEFAULT } from "@/lib/enneagram";

export const Route = createFileRoute("/personal/_app/self")({
  head: () => ({
    meta: [
      { title: "Meu Perfil — PERSONAL OS" },
      { name: "description", content: "Autoconhecimento: Eneagrama, MBTI, valores pessoais e objetivos de vida." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Meu Perfil — PERSONAL OS" },
      { property: "og:description", content: "Eneagrama, MBTI, valores e objetivos de vida." },
    ],
  }),
  component: SelfPage,
});

const TABS = [
  { key: "enneagram", label: "Eneagrama" },
  { key: "mbti", label: "MBTI" },
  { key: "values", label: "Valores" },
  { key: "goals", label: "Objetivos de vida" },
] as const;

type Tab = (typeof TABS)[number]["key"];

function Field({ id, label, value, onChange, rows = 3 }: { id: string; label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelfPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("enneagram");

  const { data: userId } = useQuery({
    queryKey: ["auth-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  /* -------- Perfil base -------- */
  const { data: profile } = useQuery({
    queryKey: ["self-profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("self_profile").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [profileForm, setProfileForm] = useState({ headline: "", mission: "", vision: "", principles: "", rules: "" });
  useEffect(() => {
    if (profile) setProfileForm({
      headline: profile.headline ?? "", mission: profile.mission ?? "", vision: profile.vision ?? "",
      principles: profile.principles ?? "", rules: profile.rules ?? "",
    });
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("self_profile").upsert({ user_id: userId!, ...profileForm });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["self-profile"] }),
  });

  /* -------- Eneagrama -------- */
  const { data: enn } = useQuery({
    queryKey: ["enneagram"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enneagram_profile").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [ennForm, setEnnForm] = useState({
    main_type: "5", wing: "", instinct: "", development_level: "",
    strengths: "", challenges: "", fears: "", desires: "", virtues: "",
  });
  useEffect(() => {
    if (enn) setEnnForm({
      main_type: enn.main_type ?? "5", wing: enn.wing ?? "", instinct: enn.instinct ?? "",
      development_level: enn.development_level ?? "", strengths: enn.strengths ?? "",
      challenges: enn.challenges ?? "", fears: enn.fears ?? "", desires: enn.desires ?? "", virtues: enn.virtues ?? "",
    });
  }, [enn]);
  const saveEnn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("enneagram_profile").upsert({ user_id: userId!, ...ennForm });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enneagram"] }),
  });

  /* -------- MBTI -------- */
  const { data: mbti } = useQuery({
    queryKey: ["mbti"],
    queryFn: async () => {
      const { data, error } = await supabase.from("mbti_profile").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [mbtiForm, setMbtiForm] = useState(MBTI_DEFAULT);
  useEffect(() => {
    if (mbti) setMbtiForm({
      mbti_type: mbti.mbti_type ?? "INTJ",
      characteristics: mbti.characteristics ?? MBTI_DEFAULT.characteristics,
      strengths: mbti.strengths ?? MBTI_DEFAULT.strengths,
      watchouts: mbti.watchouts ?? MBTI_DEFAULT.watchouts,
      communication: mbti.communication ?? MBTI_DEFAULT.communication,
      decision_making: mbti.decision_making ?? MBTI_DEFAULT.decision_making,
    });
  }, [mbti]);
  const saveMbti = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mbti_profile").upsert({ user_id: userId!, ...mbtiForm });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mbti"] }),
  });

  /* -------- Valores -------- */
  const { data: values = [] } = useQuery({
    queryKey: ["personal-values"],
    queryFn: async () => {
      const { data, error } = await supabase.from("personal_values").select("*").order("rank");
      if (error) throw error;
      return data;
    },
  });
  const [valueForm, setValueForm] = useState({ name: "", description: "" });
  const addValue = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("personal_values").insert({
        user_id: userId!, name: valueForm.name.trim(), description: valueForm.description.trim() || null,
        rank: values.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { setValueForm({ name: "", description: "" }); qc.invalidateQueries({ queryKey: ["personal-values"] }); },
  });
  const moveValue = useMutation({
    mutationFn: async ({ id, rank }: { id: string; rank: number }) => {
      const { error } = await supabase.from("personal_values").update({ rank }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-values"] }),
  });
  const removeValue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("personal_values").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal-values"] }),
  });

  /* -------- Objetivos -------- */
  const { data: goals = [] } = useQuery({
    queryKey: ["life-goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("life_goals").select("*").order("target_date", { nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const [goalForm, setGoalForm] = useState({ title: "", description: "", horizon: "medio", target_date: "" });
  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("life_goals").insert({
        user_id: userId!, title: goalForm.title.trim(), description: goalForm.description.trim() || null,
        horizon: goalForm.horizon, target_date: goalForm.target_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setGoalForm({ title: "", description: "", horizon: "medio", target_date: "" }); qc.invalidateQueries({ queryKey: ["life-goals"] }); },
  });
  const toggleGoal = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("life_goals").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["life-goals"] }),
  });
  const removeGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("life_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["life-goals"] }),
  });

  const info = ENNEAGRAM[ennForm.main_type];

  return (
    <PersonalShell title="Meu Perfil" subtitle="Autoconhecimento: eneagrama, MBTI, valores e objetivos.">
      <section className="panel mb-5 grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="headline">Como me defino hoje</Label>
          <Input id="headline" value={profileForm.headline} onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })} />
        </div>
        <Field id="mission" label="Missão pessoal" value={profileForm.mission} onChange={(v) => setProfileForm({ ...profileForm, mission: v })} />
        <Field id="vision" label="Visão de futuro" value={profileForm.vision} onChange={(v) => setProfileForm({ ...profileForm, vision: v })} />
        <Field id="principles" label="Princípios pessoais" value={profileForm.principles} onChange={(v) => setProfileForm({ ...profileForm, principles: v })} />
        <Field id="rules" label="Regras pessoais" value={profileForm.rules} onChange={(v) => setProfileForm({ ...profileForm, rules: v })} />
        <div className="sm:col-span-2">
          <Button onClick={() => saveProfile.mutate()} disabled={!userId || saveProfile.isPending} className="font-semibold glow-neon">
            <Save className="mr-1 h-4 w-4" /> Salvar perfil
          </Button>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs transition-colors",
              tab === t.key ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "enneagram" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="panel grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo principal</Label>
              <select
                value={ennForm.main_type}
                onChange={(e) => setEnnForm({ ...ennForm, main_type: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {Object.values(ENNEAGRAM).map((t) => (
                  <option key={t.type} value={t.type} className="bg-card">Tipo {t.type} — {t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wing">Asa</Label>
              <Input id="wing" placeholder="ex: 5w4" value={ennForm.wing} onChange={(e) => setEnnForm({ ...ennForm, wing: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instinct">Instinto</Label>
              <Input id="instinct" placeholder="sp / so / sx" value={ennForm.instinct} onChange={(e) => setEnnForm({ ...ennForm, instinct: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Nível de desenvolvimento</Label>
              <Input id="level" placeholder="1 a 9" value={ennForm.development_level} onChange={(e) => setEnnForm({ ...ennForm, development_level: e.target.value })} />
            </div>
            <Field id="strengths" label="Pontos fortes" value={ennForm.strengths} onChange={(v) => setEnnForm({ ...ennForm, strengths: v })} />
            <Field id="challenges" label="Desafios" value={ennForm.challenges} onChange={(v) => setEnnForm({ ...ennForm, challenges: v })} />
            <Field id="fears" label="Medos principais" value={ennForm.fears} onChange={(v) => setEnnForm({ ...ennForm, fears: v })} />
            <Field id="desires" label="Desejos principais" value={ennForm.desires} onChange={(v) => setEnnForm({ ...ennForm, desires: v })} />
            <Field id="virtues" label="Virtudes" value={ennForm.virtues} onChange={(v) => setEnnForm({ ...ennForm, virtues: v })} />
            <div className="sm:col-span-2">
              <Button onClick={() => saveEnn.mutate()} disabled={!userId || saveEnn.isPending} className="font-semibold glow-neon">
                <Save className="mr-1 h-4 w-4" /> Salvar eneagrama
              </Button>
            </div>
          </section>

          {info && (
            <aside className="panel h-fit p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Como funciona meu tipo</p>
              <h3 className="mt-1 text-lg font-black">Tipo {info.type} — {info.name}</h3>
              <p className="mt-2 text-sm text-foreground/80">{info.summary}</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div><dt className="text-[11px] uppercase text-muted-foreground">Medo básico</dt><dd>{info.fear}</dd></div>
                <div><dt className="text-[11px] uppercase text-muted-foreground">Desejo básico</dt><dd>{info.desire}</dd></div>
                <div><dt className="text-[11px] uppercase text-muted-foreground">Virtude</dt><dd>{info.virtue}</dd></div>
                <div><dt className="text-[11px] uppercase text-muted-foreground">Caminho de crescimento</dt><dd>{info.growth}</dd></div>
              </dl>
            </aside>
          )}
        </div>
      )}

      {tab === "mbti" && (
        <section className="panel grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mbti-type">Meu tipo</Label>
            <Input id="mbti-type" value={mbtiForm.mbti_type} onChange={(e) => setMbtiForm({ ...mbtiForm, mbti_type: e.target.value.toUpperCase() })} />
          </div>
          <div className="hidden sm:block" />
          <Field id="mbti-char" label="Características" value={mbtiForm.characteristics} onChange={(v) => setMbtiForm({ ...mbtiForm, characteristics: v })} />
          <Field id="mbti-str" label="Forças" value={mbtiForm.strengths} onChange={(v) => setMbtiForm({ ...mbtiForm, strengths: v })} />
          <Field id="mbti-watch" label="Pontos de atenção" value={mbtiForm.watchouts} onChange={(v) => setMbtiForm({ ...mbtiForm, watchouts: v })} />
          <Field id="mbti-comm" label="Forma de comunicação" value={mbtiForm.communication} onChange={(v) => setMbtiForm({ ...mbtiForm, communication: v })} />
          <Field id="mbti-dec" label="Forma de tomada de decisão" value={mbtiForm.decision_making} onChange={(v) => setMbtiForm({ ...mbtiForm, decision_making: v })} />
          <div className="sm:col-span-2">
            <Button onClick={() => saveMbti.mutate()} disabled={!userId || saveMbti.isPending} className="font-semibold glow-neon">
              <Save className="mr-1 h-4 w-4" /> Salvar MBTI
            </Button>
          </div>
        </section>
      )}

      {tab === "values" && (
        <section className="grid gap-4">
          <form onSubmit={(e) => { e.preventDefault(); addValue.mutate(); }} className="panel grid gap-3 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
            <Input placeholder="Valor (ex: Verdade)" required value={valueForm.name} onChange={(e) => setValueForm({ ...valueForm, name: e.target.value })} />
            <Input placeholder="O que significa para mim" value={valueForm.description} onChange={(e) => setValueForm({ ...valueForm, description: e.target.value })} />
            <Button type="submit" disabled={!userId} className="font-semibold glow-neon"><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
          </form>
          <ul className="grid gap-2">
            {values.length === 0 && <li className="panel p-8 text-center text-sm text-muted-foreground">Nenhum valor cadastrado.</li>}
            {values.map((v, i) => (
              <li key={v.id} className="panel grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-sm font-black text-primary">{i + 1}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.name}</p>
                  {v.description && <p className="truncate text-sm text-muted-foreground">{v.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    disabled={i === 0}
                    onClick={() => {
                      const prev = values[i - 1]!;
                      moveValue.mutate({ id: v.id, rank: prev.rank });
                      moveValue.mutate({ id: prev.id, rank: v.rank });
                    }}
                    className="rounded-lg px-2 py-1 text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >↑</button>
                  <button
                    disabled={i === values.length - 1}
                    onClick={() => {
                      const next = values[i + 1]!;
                      moveValue.mutate({ id: v.id, rank: next.rank });
                      moveValue.mutate({ id: next.id, rank: v.rank });
                    }}
                    className="rounded-lg px-2 py-1 text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >↓</button>
                  <button onClick={() => removeValue.mutate(v.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "goals" && (
        <section className="grid gap-4">
          <form onSubmit={(e) => { e.preventDefault(); addGoal.mutate(); }} className="panel grid gap-3 p-5 sm:grid-cols-2">
            <Input placeholder="Objetivo de vida" required value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} />
            <select value={goalForm.horizon} onChange={(e) => setGoalForm({ ...goalForm, horizon: e.target.value })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="curto" className="bg-card">Curto prazo</option>
              <option value="medio" className="bg-card">Médio prazo</option>
              <option value="longo" className="bg-card">Longo prazo</option>
            </select>
            <Textarea placeholder="Descrição" className="sm:col-span-2" value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} />
            <Input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} />
            <Button type="submit" disabled={!userId} className="font-semibold glow-neon"><Plus className="mr-1 h-4 w-4" /> Adicionar objetivo</Button>
          </form>
          <ul className="grid gap-2">
            {goals.length === 0 && <li className="panel p-8 text-center text-sm text-muted-foreground">Nenhum objetivo cadastrado.</li>}
            {goals.map((g) => (
              <li key={g.id} className="panel grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
                <div className="min-w-0">
                  <p className={cn("font-semibold", g.status === "concluida" && "text-muted-foreground line-through")}>{g.title}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {g.horizon === "curto" ? "Curto prazo" : g.horizon === "longo" ? "Longo prazo" : "Médio prazo"}
                    {g.target_date && ` · até ${new Date(`${g.target_date}T12:00:00`).toLocaleDateString("pt-BR")}`}
                  </p>
                  {g.description && <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="secondary" onClick={() => toggleGoal.mutate({ id: g.id, status: g.status === "concluida" ? "ativa" : "concluida" })}>
                    {g.status === "concluida" ? "Reabrir" : "Concluir"}
                  </Button>
                  <button onClick={() => removeGoal.mutate(g.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PersonalShell>
  );
}
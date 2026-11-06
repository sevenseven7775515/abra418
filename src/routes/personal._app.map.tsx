import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Brain, Sparkles, Star, Target } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserId } from "@/components/personal/kit";
import { ENNEAGRAM } from "@/lib/enneagram";
import { ENNEAGRAM_ASPECTS, ENNEAGRAM_QUESTIONS, scoreEnneagram } from "@/lib/enneagram-test";
import { natalReading } from "@/lib/natal";
import { deriveProfileFromJournal } from "@/lib/profile-derive.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/personal/_app/map")({
  head: () => ({
    meta: [
      { title: "Meu Mapa — PERSONAL OS" },
      { name: "description", content: "Testes de autoconhecimento, mapa natal com anjo e daimon, e perfil derivado do diário." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Meu Mapa — PERSONAL OS" },
      { property: "og:description", content: "Eneagrama, mapa natal e perfil derivado do diário." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MapPage,
});

function Section({ icon: Icon, kicker, title, children }: { icon: typeof Brain; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-5">
      <div className="flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <p className="text-[11px] uppercase tracking-[0.2em]">{kicker}</p>
      </div>
      <h2 className="mt-1 text-lg font-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MapPage() {
  const qc = useQueryClient();
  const userId = useUserId();
  const { data } = useQuery({
    queryKey: ["personal-map"],
    queryFn: async () => {
      const [profile, enn, values, goals] = await Promise.all([
        supabase.from("self_profile").select("*").maybeSingle(),
        supabase.from("enneagram_profile").select("*").maybeSingle(),
        supabase.from("personal_values").select("*").order("rank"),
        supabase.from("life_goals").select("*").order("created_at"),
      ]);
      return { profile: profile.data, enn: enn.data, values: values.data ?? [], goals: goals.data ?? [] };
    },
  });

  return (
    <PersonalShell title="Meu Mapa" subtitle="Testes rápidos e o que o seu diário revela sobre você.">
      <div className="grid gap-4 lg:grid-cols-2">
        <FromJournal data={data} onDone={() => qc.invalidateQueries({ queryKey: ["personal-map"] })} />
        <NatalTest birthAt={data?.profile?.birth_at ?? null} userId={userId} onSaved={() => qc.invalidateQueries({ queryKey: ["personal-map"] })} />
        <div className="lg:col-span-2">
          <EnneagramTest current={data?.enn?.main_type ?? null} currentWing={data?.enn?.wing ?? null} userId={userId}
            onSaved={() => qc.invalidateQueries({ queryKey: ["personal-map"] })} />
        </div>
      </div>
    </PersonalShell>
  );
}

type MapData = {
  profile: { mission: string | null } | null;
  values: { id: string; name: string; description: string | null }[];
  goals: { id: string; title: string; description: string | null; horizon: string }[];
} | undefined;

function FromJournal({ data, onDone }: { data: MapData; onDone: () => void }) {
  const derive = useServerFn(deriveProfileFromJournal);
  const run = useMutation({ mutationFn: () => derive(), onSuccess: onDone });
  const empty = !data?.profile?.mission && !data?.values.length && !data?.goals.length;
  const autoRan = useState(false);
  useEffect(() => {
    if (data && empty && !autoRan[0] && !run.isPending) { autoRan[1](true); run.mutate(); }
  }, [data, empty]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="lg:col-span-2">
      <Section icon={Target} kicker="Do seu diário" title="Missão, valores e objetivos">
        {run.isPending && <p className="text-sm text-muted-foreground">Lendo seu histórico de diário…</p>}
        {run.error && <p className="text-sm text-destructive">{(run.error as Error).message}</p>}
        {!run.isPending && empty && run.isSuccess && (
          <p className="text-sm text-muted-foreground">Não há dados suficientes registrados no diário para inferir isso.</p>
        )}
        {data?.profile?.mission && <p className="mb-4 text-base font-semibold text-primary">{data.profile.mission}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {!!data?.values.length && (
            <div>
              <p className="mb-2 text-[11px] uppercase text-muted-foreground">Valores que você demonstra</p>
              <ul className="grid gap-2 text-sm">
                {data.values.map((v) => <li key={v.id}><b>{v.name}</b><span className="block text-xs text-muted-foreground">{v.description}</span></li>)}
              </ul>
            </div>
          )}
          {!!data?.goals.length && (
            <div>
              <p className="mb-2 text-[11px] uppercase text-muted-foreground">Objetivos de vida</p>
              <ul className="grid gap-2 text-sm">
                {data.goals.map((g) => <li key={g.id}><b>{g.title}</b> <span className="text-[10px] uppercase text-muted-foreground">{g.horizon}</span><span className="block text-xs text-muted-foreground">{g.description}</span></li>)}
              </ul>
            </div>
          )}
        </div>
        {!empty && !run.isPending && (
          <p className="mt-3 text-[11px] text-muted-foreground">Gerado automaticamente a partir do diário, com datas como evidência.</p>
        )}
      </Section>
    </div>
  );
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function NatalTest({ birthAt, userId, onSaved }: { birthAt: string | null; userId: string | null; onSaved: () => void }) {
  const [value, setValue] = useState("");
  useEffect(() => { setValue(toLocalInput(birthAt)); }, [birthAt]);
  const date = value ? new Date(value) : null;
  const r = date && !isNaN(date.getTime()) ? natalReading(date) : null;
  const save = useMutation({
    mutationFn: async () => {
      if (!userId || !date) return;
      const { error } = await supabase.from("self_profile").upsert({ user_id: userId, birth_at: date.toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: onSaved,
  });

  return (
    <div className="lg:col-span-2">
      <Section icon={Star} kicker="Teste natal" title="Data e hora de nascimento: anjo e daimon">
        <div className="flex flex-wrap items-center gap-2">
          <Input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} className="max-w-xs" />
          {r && toLocalInput(birthAt) !== value && (
            <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
          )}
        </div>
        {r ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-[11px] uppercase text-muted-foreground">Sol natal</p>
              <p className="text-lg font-black">{r.sign.name} {r.degree.toFixed(1)}°</p>
              <p className="text-xs text-muted-foreground">{r.decan}º decanato · regente {r.decanRuler} · {r.sign.element}</p>
              <p className="mt-2 text-sm">{r.sign.traits}</p>
            </div>
            <div className="rounded-xl border border-primary/40 p-4">
              <p className="text-[11px] uppercase text-muted-foreground">Anjo (Shem ha-Mephorash)</p>
              <p className="text-lg font-black text-primary">{r.angel.name}</p>
              <p className="text-xs text-muted-foreground">Nº {r.angel.number} de 72 · quinário do Sol</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-[11px] uppercase text-muted-foreground">Daimon (Goetia)</p>
              <p className={cn("text-lg font-black", r.isDay && "text-primary")}>{r.daimonDay.name} <span className="text-xs font-normal text-muted-foreground">diurno · nº {r.daimonDay.number}</span></p>
              <p className={cn("text-lg font-black", !r.isDay && "text-primary")}>{r.daimonNight.name} <span className="text-xs font-normal text-muted-foreground">noturno · nº {r.daimonNight.number}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">Destacado conforme o horário de nascimento (6h–18h = dia).</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Informe data e hora para calcular.</p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Atribuição do Liber 777 (Golden Dawn): quinários e decanatos contados a partir de 0° de Leão. Cálculo do Sol com precisão aproximada (±0,1°).</p>
      </Section>
    </div>
  );
}

function EnneagramTest({ current, currentWing, userId, onSaved }: { current: string | null; currentWing: string | null; userId: string | null; onSaved: () => void }) {
  const [answers, setAnswers] = useState<number[]>(() => Array(ENNEAGRAM_QUESTIONS.length).fill(0));
  const [open, setOpen] = useState(false);
  const done = answers.every((a) => a > 0);
  const result = done ? scoreEnneagram(answers) : null;
  const shown = result?.main ?? current;
  const wing = result?.wing ?? currentWing;
  const info = shown ? ENNEAGRAM[shown] : undefined;
  const aspects = shown ? ENNEAGRAM_ASPECTS[shown] : undefined;

  const save = useMutation({
    mutationFn: async () => {
      if (!userId || !result) return;
      const a = ENNEAGRAM_ASPECTS[result.main];
      const i = ENNEAGRAM[result.main];
      if (!a || !i) return;
      const { error } = await supabase.from("enneagram_profile").upsert({
        user_id: userId, main_type: result.main, wing: result.wing,
        strengths: a.positivos.join("; "), challenges: a.negativos.join("; "),
        fears: i.fear, desires: i.desire, virtues: i.virtue,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); onSaved(); },
  });

  return (
    <Section icon={Brain} kicker="Teste" title="Eneagrama">
      {info && aspects && (
        <div className="mb-4">
          <p className="text-base font-black text-primary">Tipo {info.type}{wing ? `w${wing}` : ""} — {info.name}</p>
          <p className="text-sm text-muted-foreground">{info.summary}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/40 p-3">
              <p className="text-[11px] uppercase text-primary">Aspectos positivos</p>
              <ul className="mt-1 list-disc pl-4 text-sm">{aspects.positivos.map((p) => <li key={p}>{p}</li>)}</ul>
              <p className="mt-2 text-xs text-muted-foreground">Virtude: {info.virtue}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-[11px] uppercase text-destructive">Pontos de atenção</p>
              <ul className="mt-1 list-disc pl-4 text-sm">{aspects.negativos.map((p) => <li key={p}>{p}</li>)}</ul>
              <p className="mt-2 text-xs text-muted-foreground">Medo central: {info.fear}</p>
            </div>
          </div>
          <p className="mt-2 text-sm"><span className="text-primary">Caminho de crescimento:</span> {info.growth}</p>
          {result && (
            <Button className="mt-3" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Guardar resultado</Button>
          )}
        </div>
      )}

      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Sparkles className="h-4 w-4" /> {current ? "Refazer teste" : "Fazer teste (18 perguntas)"}
        </Button>
      ) : (
        <ol className="grid gap-3">
          {ENNEAGRAM_QUESTIONS.map((q, i) => (
            <li key={i} className="rounded-xl border border-border p-3">
              <p className="text-sm">{i + 1}. {q.text}</p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Nada</span>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? v : x)))}
                    className={cn("h-8 w-8 rounded-lg border text-xs", answers[i] === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground")}>
                    {v}
                  </button>
                ))}
                <span>Muito</span>
              </div>
            </li>
          ))}
          {!done && <p className="text-xs text-muted-foreground">Responda todas para ver o resultado acima.</p>}
        </ol>
      )}
    </Section>
  );
}

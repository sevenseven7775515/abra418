import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Brain, Compass, Library, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { ENNEAGRAM } from "@/lib/enneagram";

export const Route = createFileRoute("/personal/_app/map")({
  head: () => ({
    meta: [
      { title: "Meu Mapa — PERSONAL OS" },
      { name: "description", content: "Visão integrada de quem sou, o que faço, o que estudo e onde quero chegar." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Meu Mapa — PERSONAL OS" },
      { property: "og:description", content: "Dashboard integrado de perfil, projetos, estudos e metas." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { data } = useQuery({
    queryKey: ["personal-map"],
    queryFn: async () => {
      const [profile, enn, mbti, values, goals, missions, texts, journal] = await Promise.all([
        supabase.from("self_profile").select("*").maybeSingle(),
        supabase.from("enneagram_profile").select("*").maybeSingle(),
        supabase.from("mbti_profile").select("*").maybeSingle(),
        supabase.from("personal_values").select("*").order("rank"),
        supabase.from("life_goals").select("*").order("target_date", { nullsFirst: false }),
        supabase.from("missions").select("*").order("deadline", { nullsFirst: false }),
        supabase.from("thelema_texts").select("*"),
        supabase.from("thelema_journal").select("id, entry_date").order("entry_date", { ascending: false }).limit(1),
      ]);
      return {
        profile: profile.data, enn: enn.data, mbti: mbti.data,
        values: values.data ?? [], goals: goals.data ?? [], missions: missions.data ?? [],
        texts: texts.data ?? [], lastJournal: journal.data?.[0] ?? null,
      };
    },
  });

  const enneagramInfo = data?.enn?.main_type ? ENNEAGRAM[data.enn.main_type] : undefined;
  const finished = data?.texts.filter((t) => t.status === "finalizado").length ?? 0;
  const reading = data?.texts.filter((t) => t.status === "lendo").length ?? 0;
  const studyMinutes = data?.texts.reduce((a, t) => a + (t.study_minutes ?? 0), 0) ?? 0;

  return (
    <PersonalShell title="Meu Mapa" subtitle="Quem sou, o que faço, o que estudo e onde quero chegar.">
      {data?.profile?.headline && (
        <p className="panel mb-4 p-5 text-base font-semibold text-primary">{data.profile.headline}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center gap-2 text-primary">
            <Brain className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.2em]">Quem sou</p>
          </div>
          <h2 className="mt-1 text-lg font-black">Perfil psicológico</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Eneagrama</dt>
              <dd>
                {enneagramInfo ? `Tipo ${enneagramInfo.type} — ${enneagramInfo.name}` : "Não definido"}
                {data?.enn?.wing && ` · Asa ${data.enn.wing}`}
                {data?.enn?.instinct && ` · Instinto ${data.enn.instinct}`}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">MBTI</dt>
              <dd>{data?.mbti?.mbti_type ?? "Não definido"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Valores centrais</dt>
              <dd>{data?.values.length ? data.values.slice(0, 5).map((v) => v.name).join(" · ") : "Nenhum valor cadastrado"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase text-muted-foreground">Missão pessoal</dt>
              <dd className="whitespace-pre-wrap">{data?.profile?.mission ?? "Não definida"}</dd>
            </div>
          </dl>
          <Link to="/personal/self" className="mt-4 inline-block text-xs text-primary underline">Editar perfil</Link>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2 text-primary">
            <Compass className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.2em]">O que faço</p>
          </div>
          <h2 className="mt-1 text-lg font-black">Projetos e missões</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {(data?.missions.length ?? 0) === 0 && <li className="text-muted-foreground">Nenhuma missão ativa.</li>}
            {data?.missions.slice(0, 6).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                <span className="truncate">{m.name}</span>
                <span className="shrink-0 text-[11px] uppercase text-muted-foreground">{m.status}</span>
              </li>
            ))}
          </ul>
          <Link to="/personal/missions" className="mt-4 inline-block text-xs text-primary underline">Ver missões</Link>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2 text-primary">
            <Library className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.2em]">O que estudo</p>
          </div>
          <h2 className="mt-1 text-lg font-black">Biblioteca Thelema</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { l: "Concluídos", v: finished },
              { l: "Lendo", v: reading },
              { l: "Horas", v: Math.floor(studyMinutes / 60) },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-xl font-black text-primary">{s.v}</p>
                <p className="text-[11px] uppercase text-muted-foreground">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Último registro no diário:{" "}
            {data?.lastJournal ? new Date(`${data.lastJournal.entry_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}
          </p>
          <Link to="/personal/thelema" className="mt-4 inline-block text-xs text-primary underline">Abrir biblioteca</Link>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.2em]">Onde quero chegar</p>
          </div>
          <h2 className="mt-1 text-lg font-black">Metas de vida</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {(data?.goals.length ?? 0) === 0 && <li className="text-muted-foreground">Nenhum objetivo cadastrado.</li>}
            {data?.goals.slice(0, 6).map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                <span className="truncate">{g.title}</span>
                <span className="shrink-0 text-[11px] uppercase text-muted-foreground">
                  {g.target_date ? new Date(`${g.target_date}T12:00:00`).toLocaleDateString("pt-BR") : g.horizon}
                </span>
              </li>
            ))}
          </ul>
          {data?.profile?.vision && <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{data.profile.vision}</p>}
        </section>
      </div>
    </PersonalShell>
  );
}
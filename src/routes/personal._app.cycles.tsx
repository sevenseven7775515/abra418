import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PersonalShell } from "@/components/personal/PersonalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  LOCATION, PLANET_SYMBOL, currentPlanetaryHour, dayRuler, fmtDate, fmtTime,
  moonAgeDays, moonIllumination, moonPhase, moonSign, nextPhaseDate, planetaryHours, sunTimes,
} from "@/lib/astro";

export const Route = createFileRoute("/personal/_app/cycles")({
  head: () => ({
    meta: [
      { title: "Ciclos — PERSONAL OS" },
      { name: "description", content: "Painel de ciclos lunares, horas planetárias e eventos astronômicos." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Ciclos — PERSONAL OS" },
      { property: "og:description", content: "Lua, horas planetárias e eventos astronômicos." },
    ],
  }),
  component: CyclesPage,
});

const KINDS = ["eclipse", "solsticio", "equinocio", "retrogradacao", "evento"] as const;
const KIND_LABEL: Record<string, string> = {
  eclipse: "Eclipse",
  solsticio: "Solstício",
  equinocio: "Equinócio",
  retrogradacao: "Retrogradação",
  evento: "Evento",
};

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CyclesPage() {
  const now = useNow();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [form, setForm] = useState({ title: "", kind: "retrogradacao", event_date: "", end_date: "", description: "" });

  const { data: events = [] } = useQuery({
    queryKey: ["astro-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("astronomical_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("astronomical_events").insert({
        user_id: auth.user!.id,
        title: form.title.trim(),
        kind: form.kind,
        event_date: form.event_date,
        end_date: form.end_date || null,
        description: form.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ title: "", kind: "retrogradacao", event_date: "", end_date: "", description: "" });
      qc.invalidateQueries({ queryKey: ["astro-events"] });
    },
  });

  const removeEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("astronomical_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["astro-events"] }),
  });

  const calendar = useMemo(() => {
    if (!now) return null;
    const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const first = base.getDay();
    const total = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= total; d++) cells.push(new Date(base.getFullYear(), base.getMonth(), d, 12));
    return { base, cells };
  }, [now, monthOffset]);

  if (!now) {
    return (
      <PersonalShell title="Ciclos" subtitle="Lua, horas planetárias e eventos astronômicos.">
        <div className="panel h-40 animate-pulse" />
      </PersonalShell>
    );
  }

  const phase = moonPhase(now);
  const sign = moonSign(now);
  const sun = sunTimes(now);
  const hours = planetaryHours(now);
  const current = currentPlanetaryHour(now);
  const ruler = dayRuler(now);
  const upcoming = events.filter((e) => e.event_date >= now.toISOString().slice(0, 10));

  return (
    <PersonalShell
      title="Ciclos"
      subtitle={`Lua, horas planetárias e eventos — ${LOCATION.name}`}
      actions={
        <Button onClick={() => setOpen((v) => !v)} className="hidden font-semibold glow-neon sm:inline-flex">
          <Plus className="mr-1 h-4 w-4" /> Evento
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-3">
        {/* LUA ATUAL */}
        <section className="panel p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-secondary/60 text-4xl">
              {phase.symbol}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Lua atual</p>
              <h2 className="text-xl font-black sm:text-2xl">{phase.label}</h2>
              <p className="text-sm text-muted-foreground">
                {(moonIllumination(now) * 100).toFixed(1)}% iluminada · {moonAgeDays(now).toFixed(1)} dias de idade
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Próxima Lua Nova" value={fmtDate(nextPhaseDate(now, 0))} hint={fmtTime(nextPhaseDate(now, 0))} />
            <Stat label="Próxima Lua Cheia" value={fmtDate(nextPhaseDate(now, 0.5))} hint={fmtTime(nextPhaseDate(now, 0.5))} />
            <Stat label="Quarto Crescente" value={fmtDate(nextPhaseDate(now, 0.25))} hint={fmtTime(nextPhaseDate(now, 0.25))} />
            <Stat label="Quarto Minguante" value={fmtDate(nextPhaseDate(now, 0.75))} hint={fmtTime(nextPhaseDate(now, 0.75))} />
          </div>
        </section>

        {/* SIGNO LUNAR */}
        <section className="panel p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Informações da Lua</p>
          <h3 className="mt-1 text-xl font-black">Lua em {sign.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Elemento: {sign.element}</p>
          <p className="mt-3 text-sm text-foreground/80">{sign.traits}</p>
        </section>

        {/* HORAS PLANETÁRIAS */}
        <section className="panel p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Horas planetárias</p>
              <h3 className="text-lg font-bold">
                Agora: hora de {current.planet} {PLANET_SYMBOL[current.planet]}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Dia regido por {ruler} {PLANET_SYMBOL[ruler]}
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Nascer do sol" value={fmtTime(sun.sunrise)} />
            <Stat label="Pôr do sol" value={fmtTime(sun.sunset)} />
            <Stat label="Hora atual" value={`${fmtTime(current.start)} – ${fmtTime(current.end)}`} hint={current.night ? "Hora noturna" : "Hora diurna"} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {hours.map((h) => {
              const active = h.index === current.index;
              return (
                <div
                  key={h.index}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs",
                    active ? "border-primary bg-primary/15 text-primary glow-neon" : "border-border text-muted-foreground",
                    !active && h.night && "bg-secondary/30",
                  )}
                >
                  <p className="font-bold">
                    {PLANET_SYMBOL[h.planet]} {h.planet}
                  </p>
                  <p>{fmtTime(h.start)} – {fmtTime(h.end)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* EVENTOS */}
        <section className="panel p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Eventos astronômicos</p>
            <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} className="sm:hidden">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {upcoming.slice(0, 3).map((e) => {
            const days = Math.ceil((new Date(`${e.event_date}T12:00:00`).getTime() - now.getTime()) / 86400000);
            if (days > 30) return null;
            return (
              <div key={`alert-${e.id}`} className="mt-3 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs text-primary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{e.title} {days <= 0 ? "acontece hoje" : `inicia em ${days} dia${days > 1 ? "s" : ""}`}</span>
              </div>
            );
          })}

          <ul className="mt-3 grid gap-2">
            {events.length === 0 && <li className="text-sm text-muted-foreground">Nenhum evento cadastrado.</li>}
            {events.map((e) => (
              <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.title}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {KIND_LABEL[e.kind] ?? e.kind} · {new Date(`${e.event_date}T12:00:00`).toLocaleDateString("pt-BR")}
                    {e.end_date && ` → ${new Date(`${e.end_date}T12:00:00`).toLocaleDateString("pt-BR")}`}
                  </p>
                  {e.description && <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>}
                </div>
                <button onClick={() => removeEvent.mutate(e.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {open && (
        <form
          onSubmit={(e) => { e.preventDefault(); createEvent.mutate(); }}
          className="panel mt-4 grid gap-4 p-5 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ev-title">Evento</Label>
            <Input id="ev-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Mercúrio retrógrado" />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm">
              {KINDS.map((k) => <option key={k} value={k} className="bg-card">{KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-date">Início</Label>
            <Input id="ev-date" type="date" required value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-end">Fim (opcional)</Label>
            <Input id="ev-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ev-desc">Descrição</Label>
            <Textarea id="ev-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={createEvent.isPending} className="font-semibold glow-neon">Salvar evento</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          </div>
        </form>
      )}

      {/* CALENDÁRIO LUNAR */}
      {calendar && (
        <section className="panel mt-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-primary">Calendário lunar</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setMonthOffset((v) => v - 1)}>‹</Button>
              <span className="min-w-32 text-center text-sm font-semibold capitalize">
                {calendar.base.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setMonthOffset((v) => v + 1)}>›</Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendar.cells.map((day, i) => {
              if (!day) return <span key={`e${i}`} />;
              const p = moonPhase(day);
              const isToday = day.toDateString() === now.toDateString();
              return (
                <div
                  key={day.toISOString()}
                  title={`${p.label} · ${(moonIllumination(day) * 100).toFixed(0)}% · Lua em ${moonSign(day).name}`}
                  className={cn(
                    "rounded-lg border p-1 text-center sm:p-2",
                    isToday ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <p className="text-[10px] text-muted-foreground sm:text-xs">{day.getDate()}</p>
                  <p className="text-base leading-none sm:text-xl">{p.symbol}</p>
                  <p className="hidden text-[9px] text-muted-foreground sm:block">{(moonIllumination(day) * 100).toFixed(0)}%</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </PersonalShell>
  );
}
// Cálculos astronômicos locais (sem dependências externas).
// Localização fixa: São João del-Rei - MG
export const LOCATION = { name: "São João del-Rei - MG", lat: -21.136, lon: -44.2619 };

const SYNODIC = 29.530588853;
const RAD = Math.PI / 180;

function julianDay(date: Date) {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Fração do ciclo lunar (0 = nova, 0.5 = cheia). */
export function moonPhaseFraction(date: Date) {
  const jd = julianDay(date);
  const days = jd - 2451550.1;
  const f = (days / SYNODIC) % 1;
  return f < 0 ? f + 1 : f;
}

export function moonAgeDays(date: Date) {
  return moonPhaseFraction(date) * SYNODIC;
}

export function moonIllumination(date: Date) {
  return (1 - Math.cos(2 * Math.PI * moonPhaseFraction(date))) / 2;
}

export const PHASES = [
  { key: "nova", label: "Lua Nova", symbol: "🌑" },
  { key: "crescente_concava", label: "Crescente Côncava", symbol: "🌒" },
  { key: "quarto_crescente", label: "Quarto Crescente", symbol: "🌓" },
  { key: "crescente_gibosa", label: "Crescente Gibosa", symbol: "🌔" },
  { key: "cheia", label: "Lua Cheia", symbol: "🌕" },
  { key: "minguante_gibosa", label: "Minguante Gibosa", symbol: "🌖" },
  { key: "quarto_minguante", label: "Quarto Minguante", symbol: "🌗" },
  { key: "minguante_concava", label: "Minguante Côncava", symbol: "🌘" },
] as const;

export function moonPhase(date: Date) {
  const f = moonPhaseFraction(date);
  const idx = Math.floor(f * 8 + 0.5) % 8;
  return PHASES[idx]!;
}

/** Próxima data em que a fase atinge a fração alvo. */
export function nextPhaseDate(from: Date, target: number) {
  const current = moonPhaseFraction(from);
  let delta = target - current;
  if (delta <= 0.0005) delta += 1;
  return new Date(from.getTime() + delta * SYNODIC * 86400000);
}

export const ZODIAC = [
  { name: "Áries", element: "Fogo", traits: "Impulso, iniciativa, coragem e ação direta." },
  { name: "Touro", element: "Terra", traits: "Estabilidade, prazer sensorial, construção lenta e firme." },
  { name: "Gêmeos", element: "Ar", traits: "Curiosidade, estudo, comunicação e trocas rápidas." },
  { name: "Câncer", element: "Água", traits: "Memória, cuidado, raízes emocionais e intuição." },
  { name: "Leão", element: "Fogo", traits: "Expressão, criatividade, vontade e autoridade solar." },
  { name: "Virgem", element: "Terra", traits: "Análise, método, refinamento e serviço." },
  { name: "Libra", element: "Ar", traits: "Equilíbrio, estética, vínculos e diplomacia." },
  { name: "Escorpião", element: "Água", traits: "Profundidade, transformação, mistério e poder oculto." },
  { name: "Sagitário", element: "Fogo", traits: "Expansão, filosofia, viagem e sentido." },
  { name: "Capricórnio", element: "Terra", traits: "Disciplina, estrutura, ambição e tempo (Saturno)." },
  { name: "Aquário", element: "Ar", traits: "Visão, ruptura, coletivo e originalidade." },
  { name: "Peixes", element: "Água", traits: "Dissolução, sonho, misticismo e sensibilidade." },
] as const;

/** Longitude eclíptica aproximada da Lua (baixa precisão, ~1-2°). */
export function moonLongitude(date: Date) {
  const d = julianDay(date) - 2451545.0;
  const L = 218.316 + 13.176396 * d;
  const M = 134.963 + 13.064993 * d;
  const F = 93.272 + 13.22935 * d;
  const lambda =
    L + 6.289 * Math.sin(M * RAD) - 1.274 * Math.sin((2 * F - M) * RAD) + 0.658 * Math.sin(2 * F * RAD);
  return ((lambda % 360) + 360) % 360;
}

export function moonSign(date: Date) {
  return ZODIAC[Math.floor(moonLongitude(date) / 30) % 12]!;
}

/* ---------------- Sol: nascer e pôr ---------------- */

function toDays(date: Date) {
  return julianDay(date) - 2451545.0;
}

/** Retorna { sunrise, sunset } em horário local para a data informada. */
export function sunTimes(date: Date, lat = LOCATION.lat, lon = LOCATION.lon) {
  const noonUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const n = Math.round(toDays(new Date(noonUTC)) - lon / 360);
  const Jstar = 2451545.0 + 0.0009 + lon / -360 + n;
  const M = (357.5291 + 0.98560028 * (Jstar - 2451545)) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const Jtransit = Jstar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const decl = Math.asin(Math.sin(lambda * RAD) * Math.sin(23.44 * RAD));
  const cosH =
    (Math.sin(-0.83 * RAD) - Math.sin(lat * RAD) * Math.sin(decl)) / (Math.cos(lat * RAD) * Math.cos(decl));
  const clamped = Math.max(-1, Math.min(1, cosH));
  const H = Math.acos(clamped) / RAD;
  const Jset = Jtransit + H / 360;
  const Jrise = Jtransit - H / 360;
  const fromJD = (jd: number) => new Date((jd - 2440587.5) * 86400000);
  return { sunrise: fromJD(Jrise), sunset: fromJD(Jset) };
}

/* ---------------- Horas planetárias ---------------- */

export const CHALDEAN = ["Saturno", "Júpiter", "Marte", "Sol", "Vênus", "Mercúrio", "Lua"] as const;
export type Planet = (typeof CHALDEAN)[number];

export const PLANET_SYMBOL: Record<Planet, string> = {
  Saturno: "♄",
  "Júpiter": "♃",
  Marte: "♂",
  Sol: "☉",
  "Vênus": "♀",
  "Mercúrio": "☿",
  Lua: "☾",
};

// Domingo -> Sol, Segunda -> Lua, ...
const DAY_RULERS: Planet[] = ["Sol", "Lua", "Marte", "Mercúrio", "Júpiter", "Vênus", "Saturno"];

export function dayRuler(date: Date): Planet {
  return DAY_RULERS[date.getDay()]!;
}

export type PlanetaryHour = {
  index: number;
  planet: Planet;
  start: Date;
  end: Date;
  night: boolean;
};

/**
 * As 24 horas planetárias do dia astrológico (nascer do sol -> próximo nascer).
 */
export function planetaryHours(reference: Date): PlanetaryHour[] {
  const today = sunTimes(reference);
  let dayStartDate = reference;
  let rise = today.sunrise;
  let set = today.sunset;

  if (reference < today.sunrise) {
    dayStartDate = new Date(reference.getTime() - 86400000);
    const prev = sunTimes(dayStartDate);
    rise = prev.sunrise;
    set = prev.sunset;
  }
  const nextRise = sunTimes(new Date(dayStartDate.getTime() + 86400000)).sunrise;

  const dayHour = (set.getTime() - rise.getTime()) / 12;
  const nightHour = (nextRise.getTime() - set.getTime()) / 12;

  const ruler = dayRuler(dayStartDate);
  const startIdx = CHALDEAN.indexOf(ruler);
  const hours: PlanetaryHour[] = [];
  for (let i = 0; i < 24; i++) {
    const night = i >= 12;
    const base = night ? set.getTime() + (i - 12) * nightHour : rise.getTime() + i * dayHour;
    const len = night ? nightHour : dayHour;
    hours.push({
      index: i,
      planet: CHALDEAN[(startIdx + i) % 7]!,
      start: new Date(base),
      end: new Date(base + len),
      night,
    });
  }
  return hours;
}

export function currentPlanetaryHour(reference: Date) {
  const hours = planetaryHours(reference);
  return hours.find((h) => reference >= h.start && reference < h.end) ?? hours[0]!;
}

export function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}
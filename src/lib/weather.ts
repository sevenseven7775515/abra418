import { LOCATION } from "./astro";

export type Weather = {
  temperature: number;
  apparent: number;
  code: number;
  label: string;
  max: number;
  min: number;
  sunrise: string;
  sunset: string;
};

const CODES: Record<number, string> = {
  0: "Céu limpo", 1: "Predomínio de sol", 2: "Parcialmente nublado", 3: "Nublado",
  45: "Névoa", 48: "Névoa gelada", 51: "Garoa fraca", 53: "Garoa", 55: "Garoa forte",
  61: "Chuva fraca", 63: "Chuva", 65: "Chuva forte", 66: "Chuva congelante", 67: "Chuva congelante",
  71: "Neve fraca", 73: "Neve", 75: "Neve forte", 80: "Pancadas isoladas", 81: "Pancadas",
  82: "Pancadas fortes", 95: "Tempestade", 96: "Tempestade com granizo", 99: "Tempestade com granizo",
};

export function weatherLabel(code: number) {
  return CODES[code] ?? "Tempo instável";
}

export async function fetchWeather(): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&timezone=America%2FSao_Paulo&forecast_days=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Não foi possível carregar o clima.");
  const json = (await res.json()) as {
    current: { temperature_2m: number; apparent_temperature: number; weather_code: number };
    daily: {
      temperature_2m_max: number[]; temperature_2m_min: number[];
      sunrise: string[]; sunset: string[];
    };
  };
  return {
    temperature: Math.round(json.current.temperature_2m),
    apparent: Math.round(json.current.apparent_temperature),
    code: json.current.weather_code,
    label: weatherLabel(json.current.weather_code),
    max: Math.round(json.daily.temperature_2m_max[0] ?? 0),
    min: Math.round(json.daily.temperature_2m_min[0] ?? 0),
    sunrise: (json.daily.sunrise[0] ?? "").slice(11, 16),
    sunset: (json.daily.sunset[0] ?? "").slice(11, 16),
  };
}

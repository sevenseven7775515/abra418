/** Sol natal, decanato, anjo do Shem ha-Mephorash e daimon goético (atribuição do Liber 777 / Golden Dawn: quinários a partir de 0° Leão). */
import { ZODIAC } from "./astro";

export function sunLongitude(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180;
  return (((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) + 360) % 360;
}

export const SHEM_ANGELS = [
  "Vehuiah","Jeliel","Sitael","Elemiah","Mahasiah","Lelahel","Achaiah","Cahetel","Haziel","Aladiah","Lauviah","Hahaiah",
  "Iezalel","Mebahel","Hariel","Hakamiah","Lauviah","Caliel","Leuviah","Pahaliah","Nelchael","Ieiaiel","Melahel","Haheuiah",
  "Nith-Haiah","Haaiah","Ierathel","Seheiah","Reiiel","Omael","Lecabel","Vasariah","Iehuiah","Lehahiah","Chavakiah","Menadel",
  "Aniel","Haamiah","Rehael","Ieiazel","Hahahel","Mikael","Veuliah","Ielahiah","Sealiah","Ariel","Asaliah","Mihael",
  "Vehuel","Daniel","Hahasiah","Imamiah","Nanael","Nithael","Mebahiah","Poiel","Nemamiah","Ieialel","Harahel","Mitzrael",
  "Umabel","Iahhel","Anauel","Mehiel","Damabiah","Manakel","Eiael","Habuhiah","Rochel","Jabamiah","Haiaiel","Mumiah",
];

export const GOETIA = [
  "Bael","Agares","Vassago","Samigina","Marbas","Valefor","Amon","Barbatos","Paimon","Buer","Gusion","Sitri",
  "Beleth","Leraje","Eligos","Zepar","Botis","Bathin","Sallos","Purson","Marax","Ipos","Aim","Naberius",
  "Glasya-Labolas","Bune","Ronove","Berith","Astaroth","Forneus","Foras","Asmoday","Gaap","Furfur","Marchosias","Stolas",
  "Phenex","Halphas","Malphas","Raum","Focalor","Vepar","Sabnock","Shax","Vine","Bifrons","Vual","Haagenti",
  "Crocell","Furcas","Balam","Alloces","Caim","Murmur","Orobas","Gremory","Ose","Amy","Orias","Vapula",
  "Zagan","Valac","Andras","Flauros","Andrealphus","Kimaris","Amdusias","Belial","Decarabia","Seere","Dantalion","Andromalius",
];

const DECAN_RULERS = ["Marte", "Sol", "Vênus", "Mercúrio", "Lua", "Saturno", "Júpiter"];

export function natalReading(date: Date) {
  const lon = sunLongitude(date);
  const signIdx = Math.floor(lon / 30);
  const degInSign = lon - signIdx * 30;
  const decanAbs = Math.floor(lon / 10); // 0..35 a partir de Áries
  const fromLeo = (((lon - 120) % 360) + 360) % 360;
  const quinance = Math.floor(fromLeo / 5); // 0..71
  const decanFromLeo = Math.floor(fromLeo / 10); // 0..35
  const hour = date.getHours();
  const isDay = hour >= 6 && hour < 18;
  return {
    longitude: lon,
    sign: ZODIAC[signIdx] ?? ZODIAC[0],
    degree: degInSign,
    decan: Math.floor(degInSign / 10) + 1,
    decanRuler: DECAN_RULERS[decanAbs % 7],
    angel: { number: quinance + 1, name: SHEM_ANGELS[quinance] },
    daimonDay: { number: decanFromLeo + 1, name: GOETIA[decanFromLeo] },
    daimonNight: { number: decanFromLeo + 37, name: GOETIA[decanFromLeo + 36] },
    isDay,
  };
}

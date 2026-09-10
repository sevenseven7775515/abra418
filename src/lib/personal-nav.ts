import {
  Home, CalendarDays, CheckSquare, Target, Briefcase, Wallet, ShoppingCart,
  FolderOpen, Brain, Library, BookOpen, Moon, Flame, ScrollText, Bot, Settings,
  UserCircle, Map, Radar, History, Compass, ClipboardPaste,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  slug: string;
  label: string;
  icon: LucideIcon;
  ready?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { slug: "dashboard", label: "Dashboard", icon: Home, ready: true },
  { slug: "hermes", label: "Hermes", icon: Compass, ready: true },
  { slug: "capture", label: "Captura", icon: ClipboardPaste, ready: true },
  { slug: "agenda", label: "Agenda", icon: CalendarDays, ready: true },
  { slug: "tasks", label: "Tarefas", icon: CheckSquare, ready: true },
  { slug: "missions", label: "Missões", icon: Target, ready: true },
  { slug: "business", label: "Negócios", icon: Briefcase, ready: true },
  { slug: "finance", label: "Financeiro", icon: Wallet, ready: true },
  { slug: "shopping", label: "Compras", icon: ShoppingCart, ready: true },
  { slug: "documents", label: "Documentos", icon: FolderOpen, ready: true },
  { slug: "brain", label: "Segundo Cérebro", icon: Brain, ready: true },
  { slug: "library", label: "Biblioteca", icon: Library, ready: true },
  { slug: "journal", label: "Diário", icon: BookOpen, ready: true },
  { slug: "cycles", label: "Ciclos", icon: Moon, ready: true },
  { slug: "practices", label: "Práticas", icon: Flame, ready: true },
  { slug: "patterns", label: "Padrões", icon: Radar, ready: true },
  { slug: "timeline", label: "Linha do Tempo", icon: History, ready: true },
  { slug: "thelema", label: "Thelema", icon: ScrollText, ready: true },
  { slug: "self", label: "Meu Perfil", icon: UserCircle, ready: true },
  { slug: "map", label: "Meu Mapa", icon: Map, ready: true },
  { slug: "ai", label: "Assistente IA", icon: Bot, ready: true },
  { slug: "settings", label: "Configurações", icon: Settings, ready: true },
];

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.slug, item.label]),
);
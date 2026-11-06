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
  /** Essencial: sempre visível. O resto fica em "Mais". */
  essential?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { essential: true, slug: "dashboard", label: "Início", icon: Home, ready: true },
  { essential: true, slug: "journal", label: "Diário", icon: BookOpen, ready: true },
  { essential: true, slug: "finance", label: "Financeiro", icon: Wallet, ready: true },
  { essential: true, slug: "hermes", label: "Hermes", icon: Compass, ready: true },
  { essential: true, slug: "timeline", label: "Memória", icon: History, ready: true },
  { slug: "business", label: "Negócios", icon: Briefcase, ready: true },
  { slug: "patterns", label: "Padrões", icon: Radar, ready: true },
  { slug: "cycles", label: "Ciclos", icon: Moon, ready: true },
  { slug: "thelema", label: "Thelema", icon: ScrollText, ready: true },
  { slug: "self", label: "Meu Perfil", icon: UserCircle, ready: true },
  { slug: "map", label: "Meu Mapa", icon: Map, ready: true },
  { slug: "ai", label: "Assistente IA", icon: Bot, ready: true },
  { slug: "settings", label: "Configurações", icon: Settings, ready: true },
];

/** Memória unificada: abas dentro da mesma área. */
export const MEMORY_TABS = [
  { slug: "timeline", label: "Linha do Tempo" },
  { slug: "brain", label: "Notas" },
  { slug: "library", label: "Livros" },
  { slug: "practices", label: "Práticas" },
];

const HIDDEN_LABELS: Record<string, string> = {
  agenda: "Agenda", tasks: "Tarefas", missions: "Missões", shopping: "Compras",
  documents: "Documentos", capture: "Captura", brain: "Segundo Cérebro",
  library: "Biblioteca", practices: "Práticas",
};


export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  [...Object.entries(HIDDEN_LABELS), ...NAV_ITEMS.map((item) => [item.slug, item.label])],
);
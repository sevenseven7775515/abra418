import {
  Home, CalendarDays, CheckSquare, Target, Briefcase, Wallet, ShoppingCart,
  FolderOpen, Brain, Library, BookOpen, Moon, Flame, ScrollText, Bot, Settings,
  UserCircle, Map,
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
  { slug: "agenda", label: "Agenda", icon: CalendarDays },
  { slug: "tasks", label: "Tarefas", icon: CheckSquare, ready: true },
  { slug: "missions", label: "Missões", icon: Target, ready: true },
  { slug: "business", label: "Negócios", icon: Briefcase },
  { slug: "finance", label: "Financeiro", icon: Wallet },
  { slug: "shopping", label: "Compras", icon: ShoppingCart },
  { slug: "documents", label: "Documentos", icon: FolderOpen },
  { slug: "brain", label: "Segundo Cérebro", icon: Brain },
  { slug: "library", label: "Biblioteca", icon: Library },
  { slug: "journal", label: "Diário", icon: BookOpen },
  { slug: "cycles", label: "Ciclos", icon: Moon, ready: true },
  { slug: "practices", label: "Práticas", icon: Flame },
  { slug: "thelema", label: "Thelema", icon: ScrollText, ready: true },
  { slug: "self", label: "Meu Perfil", icon: UserCircle, ready: true },
  { slug: "map", label: "Meu Mapa", icon: Map, ready: true },
  { slug: "ai", label: "Assistente IA", icon: Bot, ready: true },
  { slug: "settings", label: "Configurações", icon: Settings },
];

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.slug, item.label]),
);
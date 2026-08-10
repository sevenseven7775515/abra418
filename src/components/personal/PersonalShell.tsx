import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell, CheckSquare, Home, LogOut, Menu, Plus, BookOpen, User, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NAV_ITEMS } from "@/lib/personal-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1 px-3 pb-6">
      {NAV_ITEMS.map((item) => {
        const active = pathname === `/personal/${item.slug}`;
        return (
          <Link
            key={item.slug}
            to="/personal/$module"
            params={{ module: item.slug }}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {!item.ready && (
              <span className="ml-auto shrink-0 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                em breve
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground glow-neon">
        <span className="text-sm font-black">P</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black tracking-[0.18em] text-foreground">PERSONAL OS</p>
        <p className="truncate text-[11px] text-muted-foreground">central de comando</p>
      </div>
    </div>
  );
}

const MOBILE_TABS = [
  { slug: "dashboard", label: "Início", icon: Home },
  { slug: "tasks", label: "Tarefas", icon: CheckSquare },
  { slug: "journal", label: "Diário", icon: BookOpen },
  { slug: "settings", label: "Perfil", icon: User },
];

export function PersonalShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/personal/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background bg-grid text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <button
          onClick={signOut}
          className="m-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-muted-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setOpen(true)} className="rounded-lg border border-border p-2 lg:hidden">
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Link
              to="/personal/$module"
              params={{ module: "notifications" }}
              className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
            >
              <Bell className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="px-4 pb-32 pt-6 sm:px-8 lg:pb-12">{children}</main>
      </div>

      <Link
        to="/personal/$module"
        params={{ module: "tasks" }}
        search={{ new: true }}
        className="fixed bottom-24 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground glow-neon lg:hidden"
        aria-label="Adicionar rapidamente"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur-xl lg:hidden">
        {MOBILE_TABS.map((tab) => {
          const active = pathname === `/personal/${tab.slug}`;
          return (
            <Link
              key={tab.slug}
              to="/personal/$module"
              params={{ module: tab.slug }}
              className={cn(
                "flex flex-col items-center gap-1 py-3 text-[11px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export { Button };
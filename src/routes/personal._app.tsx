import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedEmail } from "@/lib/allowed-user";

export const Route = createFileRoute("/personal/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/personal/login" });
    if (!isAllowedEmail(data.user.email)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/personal/login" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/personal/")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/personal/dashboard" });
  },
});
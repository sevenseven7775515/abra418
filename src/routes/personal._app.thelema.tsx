import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/personal/_app/thelema")({
  component: () => <Outlet />,
});
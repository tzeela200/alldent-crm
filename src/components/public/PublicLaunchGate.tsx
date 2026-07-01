import React from "react";
import { ComingSoonPage } from "./ComingSoonPage";

type PublicLaunchGateProps = {
  children: React.ReactNode;
};

/**
 * מסתיר את האתר הציבורי עד ההשקה.
 * לא מסתיר אזורי ניהול/התחברות.
 *
 * כדי לפתוח את האתר לציבור:
 * VITE_PUBLIC_SITE_LIVE=true
 */
export function PublicLaunchGate({ children }: PublicLaunchGateProps) {
  const isPublicLive = import.meta.env.VITE_PUBLIC_SITE_LIVE === "true";
  const path = window.location.pathname;

  const allowedPrivateRoutes = [
    "/admin",
    "/login",
    "/auth",
    "/dashboard",
    "/candidate",
    "/profile",
    "/employer-profile",
  ];

  const isPrivateRoute = allowedPrivateRoutes.some((route) =>
    path.startsWith(route)
  );

  if (isPublicLive || isPrivateRoute) {
    return <>{children}</>;
  }

  return <ComingSoonPage />;
}

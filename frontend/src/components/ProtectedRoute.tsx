import { Navigate, Outlet, useMatches } from "react-router-dom";
import { useUser } from "../contexts/UserContext";
import type { UserRole } from "../types";

interface RouteHandle {
  roles?: UserRole[];
}

export default function ProtectedRoute() {
  const { user, loading } = useUser();
  const matches = useMatches();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentMatch = matches.find(
    (m) => (m.handle as RouteHandle)?.roles
  );
  const allowedRoles = (currentMatch?.handle as RouteHandle)?.roles;

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

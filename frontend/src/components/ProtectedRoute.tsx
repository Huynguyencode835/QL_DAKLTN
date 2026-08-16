// components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../contexts/UserContext";


export default function ProtectedRoute() {
    const { user, loading } = useUser();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
    const { currentUser, authLoading } = useAuth();

    if (authLoading) {
        return null;
    }

    // Check if user is logged in
    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    // Check if user has admin role
    if (currentUser.role !== 'admin') {
        // Redirect non-admins to dashboard
        return <Navigate to="/" />;
    }

    return children;
}

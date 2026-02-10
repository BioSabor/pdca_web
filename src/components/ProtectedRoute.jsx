import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { currentUser, authLoading } = useAuth();

    if (authLoading) {
        return null;
    }

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    return children;
}

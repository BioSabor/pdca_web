import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./ui/Spinner";

export default function ProtectedRoute({ children }) {
    const { currentUser, authLoading } = useAuth();

    if (authLoading) {
        return (
            <div className="flex h-dvh items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

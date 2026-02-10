import { useAuth } from "../context/AuthContext";

export default function Header({ title }) {
    const { currentUser } = useAuth();
    const name = currentUser?.displayName || currentUser?.email;
    const initial = name?.[0]?.toUpperCase() || "?";

    return (
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <span className="text-sm font-medium text-gray-800 block">{currentUser?.displayName || "Usuario"}</span>
                    <span className="text-xs text-gray-500">{currentUser?.email}</span>
                </div>
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {initial}
                </div>
            </div>
        </header>
    );
}

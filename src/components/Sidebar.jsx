import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FolderOpen, LogOut, Shield, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ collapsed, onToggle }) {
    const { logout, currentUser } = useAuth();
    const location = useLocation();

    const menuItems = [
        { name: "Panel Principal", icon: LayoutDashboard, path: "/" },
    ];

    if (currentUser?.role === 'admin') {
        menuItems.push({ name: "Configuración", icon: Settings, path: "/admin" });
    }

    const isActive = (path) => location.pathname === path;

    return (
        <div className={`h-screen ${collapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col fixed left-0 top-0 transition-all duration-300 z-40`}>
            <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-center'} relative`}>
                {!collapsed && (
                    <div className="flex flex-col items-center gap-2 mt-2">
                        <img src="/BIOSABOR_NOCLAIM-01.png" alt="Biosabor" className="h-12 object-contain" />
                    </div>
                )}
                {!collapsed ? (
                    <button
                        onClick={onToggle}
                        className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
                        title="Contraer menú"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                ) : (
                    <div className="w-full flex flex-col items-center gap-4">
                        <img src="/BIOSABOR_NOCLAIM-01.png" alt="Biosabor" className="h-6 object-contain" />
                        <button
                            onClick={onToggle}
                            className="absolute right-2 top-2 p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition"
                            title="Expandir menú"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
                {menuItems.map((item, i) => (
                    <Link
                        key={item.path + i}
                        to={item.path}
                        className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-4'} py-3 rounded-lg transition-colors ${isActive(item.path)
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            }`}
                        title={collapsed ? item.name : ""}
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="font-medium ml-3">{item.name}</span>}
                    </Link>
                ))}
            </nav>

            <div className="p-2 border-t border-gray-800">
                <button
                    onClick={logout}
                    className={`flex items-center w-full ${collapsed ? 'justify-center px-2' : 'px-4'} py-3 text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-lg transition-colors`}
                    title={collapsed ? "Cerrar Sesión" : ""}
                >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium ml-3">Cerrar Sesión</span>}
                </button>
            </div>
        </div>
    );
}

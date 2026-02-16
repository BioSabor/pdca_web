import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, LogOut, Menu, X, Sun, Moon, BarChart3, CalendarDays } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function TopNav() {
    const { logout, currentUser } = useAuth();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState("light");

    const menuItems = [
        { name: "Panel Principal", icon: LayoutDashboard, path: "/" },
        { name: "Calendario", icon: CalendarDays, path: "/calendar" }
    ];

    if (currentUser?.role === "admin") {
        menuItems.push({ name: "Informes", icon: BarChart3, path: "/reports" });
        menuItems.push({ name: "Configuracion", icon: Settings, path: "/admin" });
    }

    const isActive = (path) => location.pathname === path;
    const themeKey = currentUser?.uid ? `pdca_theme_${currentUser.uid}` : "pdca_theme_guest";

    useEffect(() => {
        const storedTheme = localStorage.getItem(themeKey) || "light";
        setTheme(storedTheme);
        document.documentElement.classList.toggle("dark", storedTheme === "dark");
    }, [themeKey]);

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        localStorage.setItem(themeKey, nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }

    return (
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
            <div className="px-4 md:px-8 h-16 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3">
                    <img src="/BIOSABOR_NOCLAIM-01.png" alt="Biosabor" className="h-9 object-contain" />
                    <span className="hidden sm:inline text-sm font-semibold text-gray-700 dark:text-gray-200">PDCA Manager</span>
                </Link>

                <nav className="hidden md:flex items-center gap-2">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive(item.path)
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-100 block">
                            {currentUser?.displayName || "Usuario"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.email}</span>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition"
                        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {theme === "dark" ? "Modo claro" : "Modo oscuro"}
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesion
                    </button>
                </div>

                <button
                    onClick={() => setOpen(!open)}
                    className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="Toggle menu"
                >
                    {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>

            {open && (
                <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-2 bg-white dark:bg-gray-900">
                    <div className="pb-2">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{currentUser?.displayName || "Usuario"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{currentUser?.email}</div>
                    </div>
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive(item.path)
                                ? "bg-blue-600 text-white"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.name}
                        </Link>
                    ))}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg transition"
                    >
                        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {theme === "dark" ? "Modo claro" : "Modo oscuro"}
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesion
                    </button>
                </div>
            )}
        </header>
    );
}

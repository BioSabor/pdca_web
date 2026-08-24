import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, LogOut, Menu, X, Sun, Moon, BarChart3, CalendarDays, ListTodo, Search } from "lucide-react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import useModalBehavior from "../hooks/useModalBehavior";
import NotificationBell from "./notifications/NotificationBell";
import { OPEN_PALETTE_EVENT } from "./search/CommandPalette";
import { cn } from "../lib/utils";

function openPalette() {
    window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

const THEME_KEY = "pdca_theme";

export function getNavItems(currentUser) {
    const items = [
        { name: "Mis Tareas", icon: ListTodo, path: "/my-tasks" },
        { name: "Panel Principal", icon: LayoutDashboard, path: "/" },
        { name: "Calendario", icon: CalendarDays, path: "/calendar" },
        { name: "Informes", icon: BarChart3, path: "/reports" },
    ];
    if (currentUser?.role === "admin") {
        items.push({ name: "Configuración", icon: Settings, path: "/admin" });
    }
    return items;
}

export default function TopNav() {
    const { logout, currentUser } = useAuth();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [theme, setTheme] = useState(() =>
        document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
    const drawerRef = useRef(null);

    const menuItems = getNavItems(currentUser);
    const isActive = (path) => location.pathname === path;

    // Migración desde la clave antigua por-usuario a la clave global
    useEffect(() => {
        if (!currentUser?.uid) return;
        if (localStorage.getItem(THEME_KEY) !== null) return;
        const legacy = localStorage.getItem(`pdca_theme_${currentUser.uid}`);
        if (legacy) {
            localStorage.setItem(THEME_KEY, legacy);
            setTheme(legacy);
            document.documentElement.classList.toggle("dark", legacy === "dark");
        }
    }, [currentUser?.uid]);

    // Cerrar el drawer al navegar
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    useModalBehavior({ open, onClose: () => setOpen(false), panelRef: drawerRef });

    function toggleTheme() {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        localStorage.setItem(THEME_KEY, nextTheme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
    }

    const navLinkClasses = (path) =>
        cn(
            "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors",
            isActive(path)
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-surface-2 dark:text-gray-300"
        );

    return (
        <header className="z-nav flex-shrink-0 border-b border-line bg-surface/80 backdrop-blur-xl supports-[not(backdrop-filter:blur(0))]:bg-surface">
            <div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-4 md:px-8">
                <Link to="/" className="flex min-w-0 items-center gap-3">
                    <img src="/BIOSABOR_NOCLAIM-01.png" alt="BioSabor" className="h-9 object-contain" />
                    <span className="hidden whitespace-nowrap text-sm font-semibold text-gray-700 dark:text-gray-200 sm:inline lg:hidden xl:inline">
                        PDCA Manager
                    </span>
                </Link>

                <nav className="hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Navegación principal">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            aria-current={isActive(item.path) ? "page" : undefined}
                            className={navLinkClasses(item.path)}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="hidden flex-shrink-0 items-center gap-1 lg:flex">
                    <button
                        type="button"
                        onClick={openPalette}
                        className="flex h-9 flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border border-line bg-surface-2 px-3 text-sm text-gray-400 transition-colors hover:border-brand-400 hover:text-gray-500 dark:hover:text-gray-300"
                        aria-label="Buscar (Ctrl+K)"
                    >
                        <Search className="h-4 w-4" />
                        <span className="hidden xl:inline">Buscar…</span>
                        <kbd className="hidden rounded border border-line bg-surface px-1.5 text-[11px] xl:inline">
                            Ctrl K
                        </kbd>
                    </button>
                    <NotificationBell />
                    <div className="mr-1 hidden max-w-[12rem] text-right xl:block">
                        <span className="block truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                            {currentUser?.displayName || "Usuario"}
                        </span>
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                            {currentUser?.email}
                        </span>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="btn-icon btn-ghost"
                        aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                        title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                    >
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={logout}
                        className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                        title="Cerrar sesión"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden xl:inline">Cerrar sesión</span>
                    </button>
                </div>

                <div className="flex items-center gap-1 lg:hidden">
                    <button
                        type="button"
                        onClick={openPalette}
                        className="btn-icon btn-ghost"
                        aria-label="Buscar"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                    <NotificationBell />
                    <button
                        onClick={() => setOpen(true)}
                        className="btn-icon btn-ghost"
                        aria-label="Abrir menú"
                        aria-expanded={open}
                        aria-controls="mobile-drawer"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Drawer móvil */}
            {open &&
                createPortal(
                    <div className="fixed inset-0 z-modal lg:hidden">
                        <div
                            className="absolute inset-0 bg-black/40"
                            onMouseDown={() => setOpen(false)}
                            aria-hidden="true"
                        />
                        <div
                            ref={drawerRef}
                            id="mobile-drawer"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Menú"
                            className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col rounded-l-2xl bg-surface shadow-overlay"
                        >
                            <div className="flex items-center justify-between border-b border-line px-4 py-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                        {currentUser?.displayName || "Usuario"}
                                    </div>
                                    <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                        {currentUser?.email}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="btn-icon btn-ghost"
                                    aria-label="Cerrar menú"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación principal">
                                {menuItems.map((item) => (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        aria-current={isActive(item.path) ? "page" : undefined}
                                        className={navLinkClasses(item.path)}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                ))}
                            </nav>
                            <div className="space-y-1 border-t border-line p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                                <button
                                    onClick={toggleTheme}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-surface-2 dark:text-gray-300"
                                >
                                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                    {theme === "dark" ? "Modo claro" : "Modo oscuro"}
                                </button>
                                <button
                                    onClick={logout}
                                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </header>
    );
}

import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import CommandPalette from "./search/CommandPalette";

export default function Layout() {
    return (
        // El fondo lo pinta <body> (degradado fijo): aquí transparente
        <div className="flex h-dvh flex-col">
            <TopNav />
            <CommandPalette />
            <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 pb-[calc(1rem+env(safe-area-inset-bottom)+var(--pwa-banner-h,0px))] sm:px-4 md:p-8 md:pb-[calc(2rem+env(safe-area-inset-bottom)+var(--pwa-banner-h,0px))]">
                <Outlet />
            </main>
        </div>
    );
}

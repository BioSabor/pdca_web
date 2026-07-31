import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";
import CommandPalette from "./search/CommandPalette";

export default function Layout() {
    return (
        <div className="flex h-dvh flex-col bg-canvas">
            <TopNav />
            <CommandPalette />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[calc(1rem+env(safe-area-inset-bottom)+var(--pwa-banner-h,0px))] md:p-8 md:pb-[calc(2rem+env(safe-area-inset-bottom)+var(--pwa-banner-h,0px))]">
                <Outlet />
            </main>
        </div>
    );
}

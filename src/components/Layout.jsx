import { Outlet } from "react-router-dom";
import TopNav from "./TopNav";

export default function Layout() {
    return (
        <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
            <TopNav />
            <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden">
                <Outlet />
            </main>
        </div>
    );
}

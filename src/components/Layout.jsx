import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 768);

    useEffect(() => {
        function handleResize() {
            if (window.innerWidth < 768) {
                setSidebarCollapsed(true);
            }
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className={`flex-1 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} flex flex-col transition-all duration-300`}>
                <Header title="PDCA Manager" />
                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

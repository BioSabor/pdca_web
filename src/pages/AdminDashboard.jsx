import { useState } from "react";
import { Users, Settings, Building2, LayoutTemplate } from "lucide-react";
import UserManagement from "../components/UserManagement";
import StatusConfig from "../components/StatusConfig";
import DepartmentConfig from "../components/DepartmentConfig";
import TemplateManager from "../components/templates/TemplateManager";
import PageContainer from "../components/ui/PageContainer";
import { cn } from "../lib/utils";

const TABS = [
    { id: "users", label: "Usuarios", icon: Users },
    { id: "statuses", label: "Estados", icon: Settings },
    { id: "departments", label: "Departamentos", icon: Building2 },
    { id: "templates", label: "Plantillas", icon: LayoutTemplate },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("users");

    return (
        <PageContainer maxWidth="6xl" title="Panel de Administración" backTo="/">
            {/* Pestañas */}
            <div
                role="tablist"
                aria-label="Secciones de administración"
                className="mb-6 flex overflow-x-auto border-b border-line"
            >
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            "flex flex-shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors md:px-6",
                            activeTab === id
                                ? "border-brand-600 text-brand-600 dark:text-brand-400"
                                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                        )}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div className="min-h-[500px]">
                {activeTab === "users" && <UserManagement />}
                {activeTab === "statuses" && <StatusConfig />}
                {activeTab === "departments" && <DepartmentConfig />}
                {activeTab === "templates" && <TemplateManager />}
            </div>
        </PageContainer>
    );
}

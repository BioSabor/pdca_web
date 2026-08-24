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
            {/* Control segmentado que se pliega en móvil: ninguna pestaña
                queda fuera de pantalla */}
            <div
                role="tablist"
                aria-label="Secciones de administración"
                className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1"
            >
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            "flex min-w-[7.5rem] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors sm:px-4",
                            activeTab === id
                                ? "bg-surface text-brand-600 shadow-card dark:text-brand-300"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        )}
                    >
                        <Icon className="h-4 w-4 flex-shrink-0" />
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

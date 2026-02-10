import { useState } from "react";
import { Users, Settings, Building2, LayoutDashboard } from "lucide-react";
import UserManagement from "../components/UserManagement";
import StatusConfig from "../components/StatusConfig";
import DepartmentConfig from "../components/DepartmentConfig";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("users");

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Panel de Administración</h1>
                <Link to="/" className="flex items-center text-gray-500 hover:text-gray-700">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Volver al Dashboard
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    onClick={() => setActiveTab("users")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "users" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                >
                    <Users className="w-4 h-4" />
                    Usuarios
                </button>
                <button
                    onClick={() => setActiveTab("statuses")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "statuses" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                >
                    <Settings className="w-4 h-4" />
                    Estados
                </button>
                <button
                    onClick={() => setActiveTab("departments")}
                    className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === "departments" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                >
                    <Building2 className="w-4 h-4" />
                    Departamentos
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
                {activeTab === "users" && <UserManagement />}
                {activeTab === "statuses" && <StatusConfig />}
                {activeTab === "departments" && <DepartmentConfig />}
            </div>
        </div>
    );
}

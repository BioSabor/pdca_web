import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/ui/Toast";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import AdminRoute from "./components/AdminRoute";
import InstallPWA from "./components/InstallPWA";
import UpdatePrompt from "./components/UpdatePrompt";
import Spinner from "./components/ui/Spinner";

// Code splitting: las páginas pesadas (jsPDF, calendario, tabla) se cargan
// bajo demanda y no viajan en el bundle inicial
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const CreateProject = lazy(() => import("./pages/CreateProject"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const MyTasks = lazy(() => import("./pages/MyTasks"));

function PageFallback() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
        <ConfirmProvider>
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/projects/new" element={<CreateProject />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <InstallPWA />
        <UpdatePrompt />
        </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

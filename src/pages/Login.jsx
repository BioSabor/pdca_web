import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Field from "../components/ui/Field";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, currentUser, authLoading } = useAuth();
    const navigate = useNavigate();

    // Si ya hay sesión, no tiene sentido ver el login
    useEffect(() => {
        if (!authLoading && currentUser) navigate("/", { replace: true });
    }, [currentUser, authLoading, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError("");
            setLoading(true);
            await login(email, password);
            navigate("/");
        } catch (err) {
            const friendly =
                err?.code === "auth/invalid-credential" || err?.code === "auth/wrong-password"
                    ? "Correo o contraseña incorrectos."
                    : err?.code === "auth/too-many-requests"
                        ? "Demasiados intentos. Espera unos minutos e inténtalo de nuevo."
                        : "No se pudo iniciar sesión. Inténtalo de nuevo.";
            setError(friendly);
            setLoading(false);
        }
    }

    return (
        // Fondo: el degradado global de <body>
        <div className="flex min-h-dvh items-center justify-center px-4 py-8">
            <div className="card w-full max-w-sm p-6 shadow-card-hover md:p-8">
                <img
                    src="/BIOSABOR_NOCLAIM-01.png"
                    alt="BioSabor"
                    className="mx-auto mb-4 h-12 max-w-full object-contain"
                />
                <h1 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100">
                    Iniciar sesión
                </h1>
                <p className="mb-6 mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
                    Gestión de proyectos PDCA
                </p>
                {error && (
                    <div role="alert" className="mb-4 rounded-xl bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Correo electrónico">
                        <input
                            type="email"
                            autoComplete="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </Field>
                    <Field label="Contraseña">
                        <input
                            type="password"
                            autoComplete="current-password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </Field>
                    <button disabled={loading} className="btn-primary w-full" type="submit">
                        {loading ? "Entrando…" : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}

import { useState } from "react";
import { auth, db, secondaryAuth } from "../firebase";
import { doc, updateDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { UserPlus, KeyRound, X, Pencil, Check, UserX, UserCheck, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import useRealtimeUsers from "../hooks/useRealtimeUsers";
import Modal from "./ui/Modal";
import Field from "./ui/Field";
import EmptyState from "./ui/EmptyState";
import { SkeletonRows } from "./ui/Skeleton";
import { useToast } from "./ui/Toast";
import { useConfirm } from "./ui/ConfirmDialog";
import { cn } from "../lib/utils";

export default function UserManagement() {
    const { users, loading, error, retry } = useRealtimeUsers();
    const { currentUser } = useAuth();
    const toast = useToast();
    const confirm = useConfirm();

    const [showInactive, setShowInactive] = useState(false);

    // Modal crear usuario
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUserName, setNewUserName] = useState("");
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState("user");
    const [creating, setCreating] = useState(false);

    // Edición de nombre
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState("");

    const inactiveCount = users.filter((u) => u.disabled).length;
    const visibleUsers = showInactive ? users : users.filter((u) => !u.disabled);

    async function handleRoleChange(userId, newRole) {
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
            toast.success("Rol actualizado");
        } catch (err) {
            console.error("Error al actualizar rol:", err);
            toast.error("Error al actualizar el rol");
        }
    }

    function startEditing(user) {
        setEditingId(user.id);
        setEditName(user.displayName || "");
    }

    async function saveEditName(userId) {
        try {
            await updateDoc(doc(db, "users", userId), { displayName: editName });
            setEditingId(null);
            toast.success("Nombre actualizado");
        } catch (err) {
            console.error("Error al actualizar nombre:", err);
            toast.error("Error al actualizar el nombre");
        }
    }

    async function handleSendPasswordReset(user) {
        if (!user.email) return;
        const ok = await confirm({
            title: "Restablecer contraseña",
            message: `Se enviará un correo con instrucciones para restablecer la contraseña a ${user.email}.`,
            confirmLabel: "Enviar correo",
        });
        if (!ok) return;
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast.success(`Correo de restablecimiento enviado a ${user.email}`);
        } catch (err) {
            console.error("Error al enviar correo de restablecimiento:", err);
            toast.error("No se pudo enviar el correo de restablecimiento");
        }
    }

    async function handleToggleDisabled(user) {
        const name = user.displayName || user.email || "este usuario";
        if (!user.disabled) {
            const ok = await confirm({
                title: "Desactivar usuario",
                message: `${name} quedará marcado como inactivo y no aparecerá en los listados. Sus datos y su historial se conservan, y podrás reactivarlo cuando quieras.`,
                confirmLabel: "Desactivar",
                tone: "danger",
            });
            if (!ok) return;
        }
        try {
            await updateDoc(doc(db, "users", user.id), {
                disabled: !user.disabled,
                disabledAt: serverTimestamp(),
            });
            toast.success(user.disabled ? "Usuario reactivado" : "Usuario desactivado");
        } catch (err) {
            console.error("Error al cambiar el estado del usuario:", err);
            toast.error("No se pudo actualizar el estado del usuario");
        }
    }

    function closeCreateModal() {
        setShowCreateModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("user");
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        setCreating(true);
        try {
            let uid;
            const email = newUserEmail.trim();

            if (email) {
                // Crear usuario en Firebase Auth usando la app secundaria
                // (no cierra la sesión del administrador actual)
                const userCredential = await createUserWithEmailAndPassword(
                    secondaryAuth,
                    email,
                    newUserPassword
                );
                uid = userCredential.user.uid;
                await secondaryAuth.signOut();
            } else {
                // Sin email: entidad sin acceso, solo documento en Firestore
                uid = doc(collection(db, "users")).id;
            }

            await setDoc(doc(db, "users", uid), {
                uid,
                email,
                displayName: newUserName,
                role: newUserRole,
                createdAt: serverTimestamp(),
            });

            closeCreateModal();
            toast.success("Usuario creado correctamente");
        } catch (err) {
            console.error("Error al crear usuario:", err);
            toast.error("Error al crear usuario: " + (err.message || "inténtalo de nuevo"));
        } finally {
            setCreating(false);
        }
    }

    function renderAvatar(user) {
        return (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                {(user.displayName || user.email || "?")[0]?.toUpperCase()}
            </div>
        );
    }

    function renderName(user) {
        if (editingId === user.id) {
            return (
                <div className="flex items-center gap-1">
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                saveEditName(user.id);
                            }
                            if (e.key === "Escape") setEditingId(null);
                        }}
                        className="input"
                        aria-label="Nuevo nombre"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => saveEditName(user.id)}
                        className="btn-icon btn-ghost text-green-600 dark:text-green-400"
                        aria-label="Guardar nombre"
                    >
                        <Check className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="btn-icon btn-ghost"
                        aria-label="Cancelar edición"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            );
        }
        return (
            <div className="flex min-w-0 items-center gap-1">
                <span className="truncate text-sm text-gray-800 dark:text-gray-100">
                    {user.displayName || (
                        <span className="italic text-gray-400 dark:text-gray-500">Sin nombre</span>
                    )}
                </span>
                <button
                    type="button"
                    onClick={() => startEditing(user)}
                    className="btn-icon btn-ghost flex-shrink-0 text-gray-400 hover:text-brand-600 dark:hover:text-brand-300"
                    aria-label={`Editar nombre de ${user.displayName || user.email || "usuario"}`}
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }

    function renderRoleSelect(user, id) {
        return (
            <select
                id={id}
                value={user.role || "user"}
                onChange={(e) => handleRoleChange(user.id, e.target.value)}
                className="input"
                disabled={user.id === currentUser.uid}
                aria-label={id ? undefined : `Rol de ${user.displayName || user.email || "usuario"}`}
            >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
            </select>
        );
    }

    function renderActions(user) {
        const name = user.displayName || user.email || "usuario";
        return (
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => handleSendPasswordReset(user)}
                    disabled={!user.email}
                    className="btn-icon btn-ghost text-brand-600 dark:text-brand-400"
                    aria-label={`Restablecer contraseña de ${name}`}
                    title={
                        user.email
                            ? "Enviar correo de restablecimiento de contraseña"
                            : "No disponible para entidades sin correo"
                    }
                >
                    <KeyRound className="h-4 w-4" />
                </button>
                {user.disabled ? (
                    <button
                        type="button"
                        onClick={() => handleToggleDisabled(user)}
                        className="btn-icon btn-ghost text-green-600 dark:text-green-400"
                        aria-label={`Reactivar a ${name}`}
                        title="Reactivar usuario"
                    >
                        <UserCheck className="h-4 w-4" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => handleToggleDisabled(user)}
                        disabled={user.id === currentUser.uid}
                        className="btn-icon btn-ghost text-red-500 dark:text-red-400"
                        aria-label={`Desactivar a ${name}`}
                        title="Desactivar usuario"
                    >
                        <UserX className="h-4 w-4" />
                    </button>
                )}
            </div>
        );
    }

    if (loading) return <SkeletonRows rows={5} />;

    if (error) {
        return (
            <EmptyState
                icon={Users}
                title="No se pudieron cargar los usuarios"
                description="Comprueba tu conexión e inténtalo de nuevo."
                action={
                    <button type="button" className="btn-secondary" onClick={retry}>
                        Reintentar
                    </button>
                }
            />
        );
    }

    return (
        <div>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Gestión de Usuarios
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Administra usuarios, roles y accesos.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="h-4 w-4 accent-brand-600"
                        />
                        Mostrar inactivos{inactiveCount > 0 ? ` (${inactiveCount})` : ""}
                    </label>
                    <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
                        <UserPlus className="h-4 w-4" />
                        Crear usuario
                    </button>
                </div>
            </div>

            {visibleUsers.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No hay usuarios que mostrar"
                    description={
                        inactiveCount > 0
                            ? "Todos los usuarios están inactivos. Activa «Mostrar inactivos» para verlos."
                            : "Crea el primer usuario para empezar."
                    }
                />
            ) : (
                <>
                    {/* Tarjetas apiladas en móvil */}
                    <div className="space-y-3 md:hidden">
                        {visibleUsers.map((user) => (
                            <div
                                key={user.id}
                                className={cn("card p-4", user.disabled && "opacity-60")}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    {renderAvatar(user)}
                                    <div className="min-w-0 flex-1">
                                        {renderName(user)}
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                            {user.email || "Sin acceso (Entidad)"}
                                        </p>
                                        {user.disabled && (
                                            <span className="badge mt-1 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                Inactivo
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 flex items-end justify-between gap-3">
                                    <Field label="Rol" className="flex-1">
                                        {(id) => renderRoleSelect(user, id)}
                                    </Field>
                                    {renderActions(user)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabla en escritorio */}
                    <div className="card hidden scroll-x md:block">
                        <table className="w-full min-w-[720px] divide-y divide-line">
                            <thead className="bg-surface-2">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                        Usuario
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                        Nombre
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                        Rol
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                                {visibleUsers.map((user) => (
                                    <tr key={user.id} className={cn(user.disabled && "opacity-60")}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {renderAvatar(user)}
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm text-gray-900 dark:text-gray-100">
                                                        {user.email || <span className="chip">Sin acceso (Entidad)</span>}
                                                    </div>
                                                    {user.disabled && (
                                                        <span className="badge mt-1 bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                            Inactivo
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{renderName(user)}</td>
                                        <td className="px-4 py-3">
                                            <div className="max-w-[180px]">{renderRoleSelect(user)}</div>
                                        </td>
                                        <td className="px-4 py-3">{renderActions(user)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Modal Crear Usuario */}
            <Modal
                open={showCreateModal}
                onClose={closeCreateModal}
                title="Crear nuevo usuario"
                footer={
                    <>
                        <button type="button" className="btn-secondary" onClick={closeCreateModal}>
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="create-user-form"
                            className="btn-primary"
                            disabled={creating}
                        >
                            {creating ? "Creando..." : "Crear usuario"}
                        </button>
                    </>
                }
            >
                <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4">
                    <Field label="Nombre completo" required>
                        <input
                            type="text"
                            required
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            className="input"
                            placeholder="Nombre del usuario"
                        />
                    </Field>
                    <Field
                        label="Correo electrónico"
                        hint="Déjalo vacío para crear una entidad sin acceso a la aplicación."
                    >
                        <input
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="input"
                            placeholder="usuario@empresa.com"
                        />
                    </Field>
                    {newUserEmail && (
                        <Field label="Contraseña" required>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                className="input"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </Field>
                    )}
                    <Field label="Rol">
                        <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            className="input"
                        >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </Field>
                </form>
            </Modal>
        </div>
    );
}

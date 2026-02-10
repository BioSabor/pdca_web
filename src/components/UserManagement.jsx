import { useState, useEffect } from "react";
import { db, secondaryAuth } from "../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword } from "firebase/auth";
import { Trash2, UserPlus, KeyRound, X, Pencil, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser } = useAuth();

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

    // Modal restablecer contraseña
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetCurrentPwd, setResetCurrentPwd] = useState("");
    const [resetNewPwd, setResetNewPwd] = useState("");
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        try {
            const querySnapshot = await getDocs(collection(db, "users"));
            const usersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUsers(usersList);
        } catch (error) {
            console.error("Error al obtener usuarios:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleRoleChange(userId, newRole) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { role: newRole });

            setUsers(users.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            ));
        } catch (error) {
            console.error("Error al actualizar rol:", error);
            alert("Error al actualizar el rol");
        }
    }

    async function startEditing(user) {
        setEditingId(user.id);
        setEditName(user.displayName || "");
    }

    async function saveEditName(userId) {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { displayName: editName });

            setUsers(users.map(user =>
                user.id === userId ? { ...user, displayName: editName } : user
            ));
            setEditingId(null);
        } catch (error) {
            console.error("Error al actualizar nombre:", error);
            alert("Error al actualizar el nombre");
        }
    }

    async function handleDeleteUser(userId) {
        if (!confirm("¿Estás seguro de que quieres eliminar los datos de este usuario?")) return;

        try {
            await deleteDoc(doc(db, "users", userId));
            setUsers(users.filter(user => user.id !== userId));
        } catch (error) {
            console.error("Error al eliminar usuario:", error);
            alert("Error al eliminar los datos del usuario");
        }
    }

    function openResetModal(email) {
        setResetEmail(email);
        setResetCurrentPwd("");
        setResetNewPwd("");
        setShowResetModal(true);
    }

    async function handleResetPassword(e) {
        e.preventDefault();
        if (resetNewPwd.length < 6) return alert("La nueva contraseña debe tener al menos 6 caracteres.");
        setResetting(true);
        try {
            // Iniciar sesión como el usuario en la app secundaria
            const cred = await signInWithEmailAndPassword(secondaryAuth, resetEmail, resetCurrentPwd);
            // Actualizar contraseña
            await updatePassword(cred.user, resetNewPwd);
            // Cerrar sesión secundaria
            await secondaryAuth.signOut();
            setShowResetModal(false);
            alert("Contraseña actualizada correctamente.");
        } catch (error) {
            console.error("Error al restablecer contraseña:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                alert("La contraseña actual es incorrecta.");
            } else {
                alert("Error: " + error.message);
            }
        } finally {
            setResetting(false);
        }
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        setCreating(true);
        try {
            let uid = "";
            let email = newUserEmail;

            // Si hay email, crear en Auth
            if (newUserEmail.trim()) {
                // Crear usuario en Firebase Auth usando la app secundaria
                const userCredential = await createUserWithEmailAndPassword(
                    secondaryAuth, newUserEmail, newUserPassword
                );
                uid = userCredential.user.uid;
                // Cerrar sesión de la app secundaria (no afecta al admin)
                await secondaryAuth.signOut();
            } else {
                // Si no hay email, generar ID único para Firestore
                const newDocRef = doc(collection(db, "users"));
                uid = newDocRef.id;
            }

            // Crear documento en Firestore
            await setDoc(doc(db, "users", uid), {
                uid: uid,
                email: email,
                displayName: newUserName,
                role: newUserRole,
                createdAt: new Date()
            });

            // Actualizar lista local
            setUsers([...users, {
                id: uid,
                uid: uid,
                email: email,
                displayName: newUserName,
                role: newUserRole
            }]);

            // Limpiar y cerrar modal
            setNewUserName("");
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserRole("user");
            setShowCreateModal(false);
            alert("Usuario creado correctamente");
        } catch (error) {
            console.error("Error al crear usuario:", error);
            alert("Error al crear usuario: " + error.message);
        } finally {
            setCreating(false);
        }
    }

    if (loading) return <div className="p-8">Cargando usuarios...</div>;

    return (
        <div className="max-w-6xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Gestión de Usuarios</h2>
                    <p className="text-gray-500 text-sm">Administra usuarios, roles y contraseñas.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Crear Usuario
                </button>
            </div>

            {/* Tabla de usuarios */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-visible">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-4">
                                            {(user.displayName || user.email || "?")[0]?.toUpperCase()}
                                        </div>
                                        <div className="text-sm text-gray-900">{user.email || <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">Sin acceso (Entidad)</span>}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    {editingId === user.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="border rounded px-2 py-1 text-sm w-full"
                                                autoFocus
                                            />
                                            <button onClick={() => saveEditName(user.id)} className="text-green-600 hover:text-green-800">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            {user.displayName || <span className="text-gray-400 italic">Sin nombre</span>}
                                            <button
                                                onClick={() => startEditing(user)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition"
                                                title="Editar nombre"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.role || 'user'}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                                        disabled={user.id === currentUser.uid}
                                    >
                                        <option value="user">Usuario</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                                    {user.email && (
                                        <button
                                            onClick={() => openResetModal(user.email)}
                                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            title="Restablecer contraseña"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="text-red-600 hover:text-red-900"
                                        disabled={user.id === currentUser.uid}
                                        title="Eliminar usuario"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear Usuario */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Crear Nuevo Usuario</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Nombre del usuario"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Opcional - Dejar vacío para usuario virtual"
                                />
                            </div>
                            {newUserEmail && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                >
                                    <option value="user">Usuario</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {creating ? "Creando..." : "Crear Usuario"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Reset Password */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Restablecer Contraseña</h2>
                            <button onClick={() => setShowResetModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Para el usuario: <strong>{resetEmail}</strong>
                        </p>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Actual (del usuario)</label>
                                <input
                                    type="password"
                                    required
                                    value={resetCurrentPwd}
                                    onChange={(e) => setResetCurrentPwd(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Necesaria para verificar identidad"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Debes conocer la contraseña actual del usuario para cambiarla. Si no la recuerdas, elimina el usuario y créalo de nuevo.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={resetNewPwd}
                                    onChange={(e) => setResetNewPwd(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowResetModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetting}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                                >
                                    {resetting ? "Guardando..." : "Guardar Contraseña"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

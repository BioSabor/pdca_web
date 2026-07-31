import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth } from "../firebase";
import { subscriptions } from "../services/projectService";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

// Objeto de usuario plano y estable (no se hace spread del User de Firebase:
// perdería los métodos del prototipo y cambia de identidad en cada snapshot)
function buildCurrentUser(authUser, profile, profileError = false) {
    return {
        uid: authUser.uid,
        email: authUser.email,
        ...profile,
        displayName: profile?.displayName ?? authUser.displayName ?? null,
        role: profile?.role ?? "user",
        disabled: profile?.disabled ?? false,
        profileError
    };
}

function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => a[k] === b[k]);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUserState] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [authenticating, setAuthenticating] = useState(false);
    const userProfileUnsub = useRef(null);
    const currentUserRef = useRef(null);

    function setCurrentUser(next) {
        // Guardia de identidad: los snapshots repetidos no re-renderizan la app
        if (shallowEqual(currentUserRef.current, next)) return;
        currentUserRef.current = next;
        setCurrentUserState(next);
    }

    // Suscribirse al perfil del usuario en Firestore en tiempo real
    function subscribeToUserProfile(authUser, onFirstLoad) {
        if (userProfileUnsub.current) {
            userProfileUnsub.current();
            userProfileUnsub.current = null;
        }

        if (!authUser) {
            setCurrentUser(null);
            return;
        }

        let firstSnapshot = true;
        function resolveFirst() {
            if (firstSnapshot) {
                firstSnapshot = false;
                onFirstLoad?.();
            }
        }

        userProfileUnsub.current = subscriptions.subscribeToUser(
            authUser.uid,
            (profileData) => {
                setCurrentUser(buildCurrentUser(authUser, profileData));
                resolveFirst();
            },
            (error) => {
                // Un fallo leyendo el perfil NUNCA deja la app en blanco:
                // se resuelve initializing con un perfil mínimo y se marca el error
                console.error("Error al cargar el perfil de usuario:", error);
                setCurrentUser(buildCurrentUser(authUser, null, true));
                resolveFirst();
            }
        );
    }

    async function signup(email, password) {
        try {
            setAuthenticating(true);
            return await createUserWithEmailAndPassword(auth, email, password);
        } finally {
            setAuthenticating(false);
        }
    }

    async function login(email, password) {
        try {
            setAuthenticating(true);
            return await signInWithEmailAndPassword(auth, email, password);
        } finally {
            setAuthenticating(false);
        }
    }

    async function logout() {
        try {
            setAuthenticating(true);
            if (userProfileUnsub.current) {
                userProfileUnsub.current();
                userProfileUnsub.current = null;
            }
            return await signOut(auth);
        } finally {
            setAuthenticating(false);
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                subscribeToUserProfile(user, () => setInitializing(false));
            } else {
                if (userProfileUnsub.current) {
                    userProfileUnsub.current();
                    userProfileUnsub.current = null;
                }
                setCurrentUser(null);
                setInitializing(false);
            }
        });

        return () => {
            unsubscribe();
            if (userProfileUnsub.current) {
                userProfileUnsub.current();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        authLoading: initializing || authenticating
    };

    return (
        <AuthContext.Provider value={value}>
            {!initializing && children}
        </AuthContext.Provider>
    );
}

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

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [authenticating, setAuthenticating] = useState(false);
    const userProfileUnsub = useRef(null);

    // Suscribirse al perfil del usuario en Firestore en tiempo real
    function subscribeToUserProfile(authUser, onFirstLoad) {
        // Limpiar suscripción anterior
        if (userProfileUnsub.current) {
            userProfileUnsub.current();
            userProfileUnsub.current = null;
        }

        if (!authUser) {
            setCurrentUser(null);
            return;
        }

        let firstSnapshot = true;
        userProfileUnsub.current = subscriptions.subscribeToUser(authUser.uid, (profileData) => {
            if (profileData) {
                setCurrentUser({ ...authUser, ...profileData });
            } else {
                setCurrentUser({ ...authUser, role: "user" });
            }
            if (firstSnapshot) {
                firstSnapshot = false;
                onFirstLoad?.();
            }
        });
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
            const credential = await signInWithEmailAndPassword(auth, email, password);
            // La suscripción se activará via onAuthStateChanged
            return credential;
        } finally {
            setAuthenticating(false);
        }
    }

    async function logout() {
        try {
            setAuthenticating(true);
            // Limpiar suscripción al perfil
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
                // No marcar initializing=false hasta que el perfil se cargue
                subscribeToUserProfile(user, () => setInitializing(false));
            } else {
                // Limpiar suscripción al perfil
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

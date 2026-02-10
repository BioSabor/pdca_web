import { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [initializing, setInitializing] = useState(true);
    const [authenticating, setAuthenticating] = useState(false);

    async function buildUserProfile(user) {
        if (!user) return null;
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { ...user, ...docSnap.data() };
            }
            return { ...user, role: "user" };
        } catch (error) {
            console.warn("Could not fetch user profile from Firestore:", error.message);
            return { ...user, role: "user" };
        }
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
            const hydrated = await buildUserProfile(credential.user);
            setCurrentUser(hydrated);
            return credential;
        } finally {
            setAuthenticating(false);
        }
    }

    async function logout() {
        try {
            setAuthenticating(true);
            return await signOut(auth);
        } finally {
            setAuthenticating(false);
        }
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const hydrated = await buildUserProfile(user);
                setCurrentUser(hydrated);
            } else {
                setCurrentUser(null);
            }
            setInitializing(false);
        });

        return unsubscribe;
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

import { User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { useEffect, useState } from 'react';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            setLoading(true);
            await auth.signInWithEmailAndPassword(email, password);
        } catch (error: any) {
            console.error("Sign in error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signUp = async (email: string, password: string) => {
        try {
            setLoading(true);
            await auth.createUserWithEmailAndPassword(email, password);
        } catch (error: any) {
            console.error("Sign up error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            await auth.signOut();
        } catch (error) {
            console.error("Sign out error:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        signIn,
        signUp,
        signOut,
        loading,
    };
};

import { User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { useEffect, useState } from 'react';
import { ErrorHandler } from '../utils/errorHandler';

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
            ErrorHandler.handleError(error, "useAuth:signIn");
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
            ErrorHandler.handleError(error, "useAuth:signUp");
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
            ErrorHandler.handleError(error, "useAuth:signOut");
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

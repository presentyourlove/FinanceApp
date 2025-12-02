import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { useEffect, useState } from 'react';


// 注意：這些 Client ID 需要從 Google Cloud Console 申請
// 為了在 Expo Go 中測試，我們通常需要 Web Client ID
const webClientId = '424327050612-k6r6rn9pl5qc4aj94a5tb38a9484pqkh.apps.googleusercontent.com';
const iosClientId = webClientId; // '424327050612-vmbb681u6f3dasrqvpnncsj17kltgef5.apps.googleusercontent.com'目前先留空，若有需要再申請
const androidClientId = webClientId; // ''目前先留空，若有需要再申請

export const useGoogleAuth = () => {
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: webClientId,
        iosClientId,
        androidClientId,
        // 改回硬寫的網址，因為這能通過 Google 驗證
        redirectUri: 'https://auth.expo.io/@jasonwth/AIFinanceApp',
    });

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (response?.type === 'success') {
            setLoading(true);
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            signInWithCredential(auth, credential)
                .catch((error) => {
                    console.error("Firebase sign in error:", error);
                    setLoading(false);
                });
        } else if (response?.type === 'error') {
            console.error("Google sign in error:", response.error);
            setLoading(false);
        }
    }, [response]);

    const signIn = () => {
        setLoading(true);
        promptAsync();
    };

    const signOut = async () => {
        try {
            setLoading(true);
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Sign out error:", error);
        } finally {
            setLoading(false);
        }
    };

    return {
        user,
        signIn,
        signOut,
        loading,
        request,
    };
};

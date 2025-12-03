import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { makeRedirectUri } from 'expo-auth-session';
import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

// 注意：這些 Client ID 需要從 Google Cloud Console 申請
const webClientId = '424327050612-k6r6rn9pl5qc4aj94a5tb38a9484pqkh.apps.googleusercontent.com';

export const useGoogleAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    // 監聽 Deep Link (當瀏覽器轉址回 App 時觸發)
    useEffect(() => {
        const handleUrl = (event: { url: string }) => {
            console.log("Deep link received:", event.url);
            handleAuthResponse(event.url);
        };

        // 註冊監聽器
        const subscription = Linking.addEventListener('url', handleUrl);

        return () => {
            subscription.remove();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 處理回傳的 URL，解析 Token 並登入
    const handleAuthResponse = async (url: string) => {
        // 簡單過濾
        if (!url.includes('id_token') && !url.includes('access_token')) {
            return;
        }

        try {
            setLoading(true);
            WebBrowser.dismissBrowser(); // 嘗試關閉瀏覽器視窗

            let params: Record<string, string> = {};

            // 解析 Hash (#)
            const hashIndex = url.indexOf('#');
            if (hashIndex !== -1) {
                const hash = url.substring(hashIndex + 1);
                hash.split('&').forEach(part => {
                    const [key, value] = part.split('=');
                    if (key && value) params[key] = decodeURIComponent(value);
                });
            }

            // 解析 Query (?)
            const queryParams = Linking.parse(url).queryParams;
            if (queryParams) {
                if (queryParams.id_token) params.id_token = Array.isArray(queryParams.id_token) ? queryParams.id_token[0] : queryParams.id_token;
            }

            const { id_token } = params;

            if (id_token) {
                console.log("Got id_token, signing in to Firebase...");
                const credential = GoogleAuthProvider.credential(id_token);
                await signInWithCredential(auth, credential);
                console.log("Firebase sign in success!");
            } else {
                console.log("No id_token found in URL");
            }
        } catch (error) {
            console.error("Handle auth response error:", error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async () => {
        try {
            setLoading(true);

            // 1. 取得 Tunnel URL (回程地址)
            // 強制使用從終端機取得的正確 Tunnel URL
            let returnUrl = 'exp://t9ksac4-jasonwth-8081.exp.direct';

            // 移除結尾的斜線
            if (returnUrl.endsWith('/')) {
                returnUrl = returnUrl.slice(0, -1);
            }

            console.log("Debug - Return URL (Tunnel):", returnUrl);
            await Clipboard.setStringAsync(returnUrl);

            // 2. 定義 Proxy URL (Google 認識的地址)
            const proxyUrl = 'https://auth.expo.io/@jasonwth/AIFinanceApp';

            // 3. 建構 Google 登入網址
            // 嘗試將 state 格式化為 JSON，這是 Expo Proxy 的標準格式
            const state = JSON.stringify({ returnUrl: returnUrl });

            const params = new URLSearchParams({
                client_id: webClientId.trim(),
                redirect_uri: proxyUrl,
                response_type: 'id_token',
                scope: 'openid profile email',
                state: state, // 傳遞 JSON 字串
                prompt: 'select_account',
                nonce: Math.random().toString(36).substring(7),
            });

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

            console.log("Debug - Auth URL:", authUrl);

            // 4. 使用 openBrowserAsync (替代 openAuthSessionAsync)
            // 這會開啟一個標準的 Safari 視窗，行為跟您手動貼上網址一樣
            // 這樣可以避開 ASWebAuthenticationSession 的限制
            await WebBrowser.openBrowserAsync(authUrl);

        } catch (error) {
            console.error("Sign in error:", error);
            setLoading(false);
        }
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
        request: null,
    };
};

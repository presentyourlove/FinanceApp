import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 檢查是否有設定 Firebase 環境變數
const hasFirebaseConfig = Boolean(
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY &&
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID
);

// Firebase 設定
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'dummy-api-key',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy-project.firebaseapp.com',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dummy-project.appspot.com',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000'
};

// 顯示警告訊息
if (!hasFirebaseConfig) {
    console.warn('⚠️ Firebase 環境變數未設定,雲端同步功能將無法使用');
    console.warn('💡 如需啟用雲端同步,請建立 .env 檔案並設定 Firebase 設定');
}

// Initialize Firebase
let app;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;

try {
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }

    // Compat Auth automatically handles persistence with AsyncStorage if detected,
    // or we can strictly set it if needed, but usually compat is smarter.
    auth = firebase.auth();
    db = firebase.firestore();

} catch (error) {
    console.error('Firebase 全局初始化失敗:', error);
    // 建立假的實例以避免應用程式崩潰
    app = {} as any;
    auth = {} as any;
    db = {} as any;
}

export { auth, db, hasFirebaseConfig };

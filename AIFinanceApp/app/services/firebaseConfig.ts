import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyAr7v9ipPqSwnDh3zsjkoOkd7zpMEQujf8",
    authDomain: "aifinanceapp-2ce60.firebaseapp.com",
    projectId: "aifinanceapp-2ce60",
    storageBucket: "aifinanceapp-2ce60.firebasestorage.app",
    messagingSenderId: "424327050612",
    appId: "1:424327050612:web:ff1ac72a1c5fa4ae3fe821"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);

export { auth, db };

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyACN7V3zi8oCdxuIo_41MtNoqJK8oEo-8U",
  authDomain: "lilnest-new.firebaseapp.com",
  projectId: "lilnest-new",
  storageBucket: "lilnest-new.firebasestorage.app",
  messagingSenderId: "826606306019",
  appId: "1:826606306019:web:9a69c84dd5d852c8e17bd6",
  measurementId: "G-5YMVTTWEK7",
};

// Initialize Firebase
let app;
let auth;
let db;
let googleProvider;
let storage;
let analytics;

try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  storage = getStorage(app);

  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
  }

  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
}

export { auth, db, googleProvider, storage, analytics };
export default app;

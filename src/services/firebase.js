import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAORangV__ppRKdN-iQkYMReGFeK6oz_K8",
  authDomain: "family-16f5c.firebaseapp.com",
  projectId: "family-16f5c",
  storageBucket: "family-16f5c.firebasestorage.app",
  messagingSenderId: "697428837767",
  appId: "1:697428837767:web:895895a3c8bed5b4b57f22",
  measurementId: "G-BTMFV7L28F"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Enable Auth persistence for iOS Safari / WebKit
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (e) {
  console.warn("Auth persistence warning:", e);
}

// Enable offline persistence for Firestore (IndexedDB cache)
let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.warn("Firestore offline persistence init fallback to standard Firestore:", e);
  dbInstance = getFirestore(app);
}

export const db = dbInstance;

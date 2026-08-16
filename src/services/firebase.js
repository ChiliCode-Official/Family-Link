import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);

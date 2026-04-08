import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeEwQpToU-ZGKhDYUgWnUCdCPzowDkLX0",
  authDomain: "combat-performance-lab.firebaseapp.com",
  projectId: "combat-performance-lab",
  storageBucket: "combat-performance-lab.firebasestorage.app",
  messagingSenderId: "717366906385",
  appId: "1:717366906385:web:2f2eabfeed8e2e7876abb0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

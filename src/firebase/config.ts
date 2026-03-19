import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDnp3lzQgVK-ikTP8Xbf18HUcGrch2b54Y",
  authDomain: "referee-cef17.firebaseapp.com",
  projectId: "referee-cef17",
  storageBucket: "referee-cef17.firebasestorage.app",
  messagingSenderId: "351577515580",
  appId: "1:351577515580:web:cecf18f3a75cd4ca458539"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

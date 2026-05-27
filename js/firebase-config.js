// ============================================
// firebase-config.js — PeLoot
// Inicialización del SDK de Firebase (CDN ESM)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCkxXf93VlfWb9F6MtYk0FYpPFoBMMqBGA",
  authDomain: "pelootdata.firebaseapp.com",
  projectId: "pelootdata",
  storageBucket: "pelootdata.firebasestorage.app",
  messagingSenderId: "1037452690351",
  appId: "1:1037452690351:web:1948106ea9204b34a8255a"
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

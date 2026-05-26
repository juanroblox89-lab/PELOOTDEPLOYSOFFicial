/**
 * PeLoot — Configuración centralizada
 * ⚠️  Este archivo es público (frontend). NO guardes contraseñas aquí.
 *    Las Firebase API keys son seguras en frontend — la seguridad real
 *    la dan las Firestore Security Rules en la consola de Firebase.
 */

export const CONFIG = {
  // ── Firebase (mismos valores que firebase-config.js)
  firebase: {
    apiKey:            "AIzaSyCkxXf93VlfWb9F6MtYk0FYpPFoBMMqBGA",
    authDomain:        "pelootdata.firebaseapp.com",
    projectId:         "pelootdata",
    storageBucket:     "pelootdata.firebasestorage.app",
    messagingSenderId: "1037452690351",
    appId:             "1:1037452690351:web:1948106ea9204b34a8255a"
  },

  // ── Admin (credenciales de panel admin — sesión local solamente)
  admin: {
    username: 'JuanAdmin',
    // ⚠️  Cambiar antes de subir a producción
    password: '123Supersli.'
  },

  // ── Contacto
  whatsapp: '+3136374267',

  // ── Moneda base
  currency: {
    base: 'COP',
    locale: 'es-CO'
  },

  // ── Redes sociales
  social: {
    instagram: 'https://www.instagram.com/peloot.plushies/',
    tiktok:    'https://www.tiktok.com/@peloot.accesorios'
  }
};

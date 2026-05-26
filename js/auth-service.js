// auth-service.js — PeLoot
import { auth, db } from './firebase-config.js';
import { 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ---- PERFIL DE USUARIO ----
async function syncUserProfile(user, customName = null) {
  if (!user) return null;
  
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  const displayName = (customName && customName.length < 20) ? customName : (user.displayName || user.email?.split('@')[0] || 'Gamer');

  if (!userSnap.exists()) {
    const userData = {
      uid: user.uid,
      displayName: displayName,
      email: user.email,
      photoURL: user.photoURL || 'assets/images/logo/favicon.png',
      phoneNumber: user.phoneNumber || '',
      currency: 'USD',
      orderCount: 0,
      usedCoupon: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      role: 'customer'
    };
    await setDoc(userRef, userData);
    return userData;
  } else {
    await setDoc(userRef, { 
      lastLogin: serverTimestamp(),
      displayName: customName ? customName : userSnap.data().displayName || displayName 
    }, { merge: true });
    return userSnap.data();
  }
}

// ---- MÉTODOS DE AUTH ----
export async function loginWithGoogle() {
  try {
    return await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    console.error("Error Google Login:", error);
    throw error;
  }
}

export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return await syncUserProfile(result.user);
  } catch (error) {
    console.error("Error Email Login:", error);
    throw error;
  }
}

export async function registerWithEmail(email, password, name) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name) {
      try {
        await updateProfile(result.user, { displayName: name });
      } catch (e) {
        console.error("Error updating profile name:", e);
      }
    }
    return await syncUserProfile(result.user, name);
  } catch (error) {
    console.error("Error Email Register:", error);
    throw error;
  }
}

export async function logout() {
  return await signOut(auth);
}

export function onAuth(callback) {
  getRedirectResult(auth).then(async (result) => {
    if (result) await syncUserProfile(result.user);
  }).catch(e => console.error("Error Redirect Result:", e));

  return onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        // Intentamos sincronizar pero no bloqueamos el callback si falla
        const profile = await syncUserProfile(user).catch(e => {
          console.error("[PeLoot Auth] Error syncing profile:", e);
          return null;
        });
        callback({ ...user, profile });
      } else {
        callback(null);
      }
    } catch (criticalError) {
      console.error("[PeLoot Auth] Critical error in onAuth state handler:", criticalError);
      callback(null);
    }
  });
}

// ---- ACTUALIZAR PREFERENCIAS ----
export async function updateUserPreference(uid, data) {
  const userRef = doc(db, 'users', uid);
  return await setDoc(userRef, data, { merge: true });
}

// firebase-service.js — PeLoot

import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const PRODUCTS_COL = collection(db, 'products');
const ORDERS_COL   = collection(db, 'orders');

function docToObj(d) { return { id: d.id, ...d.data() }; }

export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const s = await getDoc(doc(db, 'users', uid));
    return s.exists() ? s.data() : null;
  } catch(e) {
    console.error('[PeLoot] Error fetching user profile:', e);
    return null;
  }
}

// ---- PRODUCTOS: Lectura ----
export async function getAllProducts() {
  try { const s = await getDocs(PRODUCTS_COL); return s.docs.map(docToObj); }
  catch(e) { console.error('[PeLoot]', e); return []; }
}
export async function getProductsByCategory(cat) {
  if (!cat) return getAllProducts();
  try { const s = await getDocs(query(PRODUCTS_COL, where('category','==',cat))); return s.docs.map(docToObj); }
  catch(e) { console.error('[PeLoot]', e); return []; }
}
export async function getProductById(id) {
  try { const s = await getDoc(doc(db,'products',id)); return s.exists() ? docToObj(s) : null; }
  catch(e) { console.error('[PeLoot]', e); return null; }
}

// ---- PRODUCTOS: Escritura (Admin) ----
export async function updateProduct(id, data) {
  await updateDoc(doc(db,'products',id), { ...data, updatedAt: serverTimestamp() });
}
export async function createProduct(data) {
  const ref = await addDoc(PRODUCTS_COL, { ...data, active:true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}
export async function deleteProduct(id) {
  await deleteDoc(doc(db,'products',id));
}

// ---- PEDIDOS ----
export async function saveOrder(orderData) {
  const finalData = { 
    ...orderData, 
    status: orderData.status || 'pending', 
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  const ref = await addDoc(ORDERS_COL, finalData);
  return ref.id;
}
export async function getOrders(statusFilter = null) {
  try {
    const q = statusFilter
      ? query(ORDERS_COL, where('status','==',statusFilter), orderBy('createdAt','desc'))
      : query(ORDERS_COL, orderBy('createdAt','desc'));
    const s = await getDocs(q);
    return s.docs.map(docToObj);
  } catch(e) { console.error('[PeLoot]', e); return []; }
}
export function subscribeToOrders(statusFilter, callback) {
  const q = statusFilter
    ? query(ORDERS_COL, where('status','==',statusFilter), orderBy('createdAt','desc'))
    : query(ORDERS_COL, orderBy('createdAt','desc'));
  return onSnapshot(q, s => callback(s.docs.map(docToObj)));
}
export async function confirmOrder(id) {
  await updateDoc(doc(db,'orders',id), { status:'confirmed', confirmedAt: serverTimestamp() });
}
export async function deleteOrder(id) {
  await deleteDoc(doc(db,'orders',id));
}
export async function updateOrderShipping(id, shippingData) {
  await updateDoc(doc(db,'orders',id), {
    status: 'shipped',
    shippedAt: serverTimestamp(),
    shippingCompany: shippingData.shippingCompany,
    trackingNumber: shippingData.trackingNumber,
    trackingUrl: shippingData.trackingUrl
  });
}
export async function getOrderById(id) {
  try {
    const s = await getDoc(doc(db, 'orders', id));
    return s.exists() ? docToObj(s) : null;
  } catch(e) {
    console.error('[PeLoot]', e);
    return null;
  }
}

export async function getOrdersByUser(uid) {
  if (!uid) return [];
  try {
    const q = query(ORDERS_COL, where('userId', '==', uid));
    const s = await getDocs(q);
    return s.docs.map(docToObj);
  } catch(e) {
    console.error('[PeLoot] Error fetching user orders:', e.message);
    throw e; // Lanzamos el error para que la UI pueda diagnosticarlo (ej: falta de índice)
  }
}

export async function cancelOrder(id) {
  await updateDoc(doc(db, 'orders', id), { 
    status: 'cancelled', 
    updatedAt: serverTimestamp() 
  });
}

// ---- CARRITO ----
export async function getCartFromFirebase(uid) {
  if (!uid) return [];
  try {
    const s = await getDoc(doc(db, 'carts', uid));
    return s.exists() ? s.data().items || [] : [];
  } catch(e) {
    console.error('[PeLoot] Error fetching cart:', e);
    return [];
  }
}

export async function saveCartToFirebase(uid, cart) {
  if (!uid) return;
  try {
    await updateDoc(doc(db, 'carts', uid), {
      items: cart,
      updatedAt: serverTimestamp()
    });
  } catch(e) {
    // Si el documento no existe, lo creamos
    try {
      await setDoc(doc(db, 'carts', uid), {
        items: cart,
        updatedAt: serverTimestamp()
      });
    } catch(err) {
      console.error('[PeLoot] Error saving cart:', err);
    }
  }
}

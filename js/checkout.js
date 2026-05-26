/**
 * PeLoot - Checkout System v3 (Full Rewrite)
 * Simple, robust, and prioritizes immediate rendering.
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { loginWithGoogle } from './auth-service.js';
import { CURRENCIES, convertPrice, getGlobalSettings, validateCoupon } from './store-service.js';

// --- Configuration ---
const CART_KEY = "peloot-cart";
let currentUser = null;
let globalSettings = null;

// --- UI Elements ---
const el = {
  list: document.getElementById('checkout-items-list'),
  subtotal: document.getElementById('chk-subtotal'),
  total: document.getElementById('chk-total'),
  btnConfirm: document.getElementById('btn-confirm-order'),
  authWarning: document.getElementById('auth-warning'),
  btnForceLogin: document.getElementById('btn-force-login'),
  // Form fields
  fName: document.getElementById('chk-name'),
  fEmail: document.getElementById('chk-email'),
  fPhone: document.getElementById('chk-phone'),
  fId: document.getElementById('chk-id'),
  fAddress: document.getElementById('chk-address'),
  fNeighborhood: document.getElementById('chk-neighborhood'),
  fCity: document.getElementById('chk-city'),
  fState: document.getElementById('chk-state'),
  fZip: document.getElementById('chk-zip'),
  fCountry: document.getElementById('chk-country'),
  fNotes: document.getElementById('chk-notes')
};

// --- Helper Functions ---
function getActiveCurrency() {
  const code = localStorage.getItem('peloot_currency') || 'COP';
  return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
}

function formatPrice(amount, currency, settings) {
  const maxDigits = (currency.code === 'COP' || currency.code === 'CLP' || currency.code === 'PYG') ? 0 : 2;
  if (!settings || !settings.exchangeRates) {
    return `${currency.symbol}${amount.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: maxDigits })} ${currency.code}`;
  }
  const converted = convertPrice(amount, currency.code, settings.exchangeRates, 'COP');
  const formatted = converted.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: maxDigits });
  return `${currency.symbol}${formatted} ${currency.code}`;
}

async function getProductPrice(id) {
  try {
    const s = await getDoc(doc(db, 'products', id));
    return s.exists() ? s.data().price || 0 : 0;
  } catch (e) { return 0; }
}

// --- Main Logic ---
async function renderSummary() {
  console.log('[PeLoot] 🚀 Renderizando resumen del pedido...');
  
  // 1. Obtener carrito (Directo de localStorage para evitar fallos de importación)
  let cart = [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) { console.error('[PeLoot] Error parseando cart:', e); }

  console.log('[PeLoot] Carrito detectado:', cart);

  // 2. Cargar settings (Tasa de cambio)
  globalSettings = await getGlobalSettings();
  const activeCurrency = getActiveCurrency();

  if (!cart || cart.length === 0) {
    if (el.list) el.list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">Tu carrito está vacío</p>';
    if (el.subtotal) el.subtotal.textContent = formatPrice(0, activeCurrency, globalSettings);
    if (el.total) el.total.textContent = formatPrice(0, activeCurrency, globalSettings);
    return;
  }

  // 3. Renderizar items y calcular total
  if (el.list) el.list.innerHTML = '';
  let subtotal = 0;

  for (const item of cart) {
    let price = Number(String(item.price || item.priceCOP || 0).replace(/[^\d]/g, ''));
    
    // Si el precio es 0, intentamos recuperarlo de Firestore
    if (price === 0 && item.id) {
      console.log(`[PeLoot] Precio 0 para ${item.name}, recuperando de DB...`);
      price = await getProductPrice(item.id);
    }

    const qty = Math.max(1, Number(item.qty) || 1);
    const itemTotal = price * qty;
    subtotal += itemTotal;

    if (el.list) {
      el.list.innerHTML += `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 12px 0;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:40px; height:40px; background:var(--bg-section); border-radius:8px; display:flex; align-items:center; justify-content:center;">
               <img src="${item.image || item.imageUrl}" style="max-width:80%; max-height:80%; object-fit:contain;">
            </div>
            <div>
              <p style="font-weight:700; font-size:0.9rem; margin:0;">${item.name}</p>
              <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">Cant: ${qty}</p>
            </div>
          </div>
          <span style="font-weight:800; font-size:0.95rem;">${formatPrice(itemTotal, activeCurrency, globalSettings)}</span>
        </div>
      `;
    }
  }

  // 4. Calcular cupón y descuento
  let discount = 0;
  let discountPercent = 0;
  const savedCoupon = localStorage.getItem('peloot_applied_coupon');
  if (savedCoupon) {
    const couponData = await validateCoupon(savedCoupon, currentUser || {});
    if (couponData && couponData.valid) {
      discountPercent = Number(couponData.discount) || 0;
      discount = subtotal * (discountPercent / 100);
      console.log(`[PeLoot] Cupón aplicado en Checkout: ${savedCoupon} (-${discountPercent}%)`);
    }
  }
  const finalTotal = subtotal - discount;

  // 5. Actualizar UI final
  if (el.subtotal) el.subtotal.textContent = formatPrice(subtotal, activeCurrency, globalSettings);
  if (el.total) el.total.textContent = formatPrice(finalTotal, activeCurrency, globalSettings);
  
  console.log('[PeLoot] ✅ Resumen renderizado con éxito. Total:', finalTotal);
}

// --- Event Handlers ---
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  console.log('[PeLoot] Estado Auth:', user ? user.email : 'Sin sesión');

  if (user) {
    if (el.authWarning) el.authWarning.style.display = 'none';
    if (el.btnConfirm) {
      el.btnConfirm.disabled = false;
      el.btnConfirm.style.opacity = '1';
    }
    // Auto-fill
    if (el.fName && !el.fName.value) el.fName.value = user.displayName || '';
    if (el.fEmail && !el.fEmail.value) el.fEmail.value = user.email || '';

    // OPCIONAL: Sincronizar carrito de Firebase a Local solo si Local está vacío
    try {
      const s = await getDoc(doc(db, 'carts', user.uid));
      if (s.exists()) {
        const fbItems = s.data().items || [];
        const localRaw = localStorage.getItem(CART_KEY);
        if (!localRaw || JSON.parse(localRaw).length === 0) {
          if (fbItems.length > 0) {
            console.log('[PeLoot] Sincronizando carrito desde Firebase...');
            localStorage.setItem(CART_KEY, JSON.stringify(fbItems));
            renderSummary();
          }
        }
      }
    } catch (e) { console.error(e); }

  } else {
    if (el.authWarning) el.authWarning.style.display = 'block';
    if (el.btnConfirm) {
      el.btnConfirm.disabled = true;
      el.btnConfirm.style.opacity = '0.5';
    }
  }
  
  renderSummary();
});

if (el.btnForceLogin) {
  el.btnForceLogin.onclick = () => loginWithGoogle();
}

if (el.btnConfirm) {
  el.btnConfirm.onclick = async () => {
    if (!currentUser) {
      alert('Debes iniciar sesión para confirmar tu pedido.');
      return;
    }

    // 1. Validación de Formulario
    const fields = ['fName', 'fEmail', 'fPhone', 'fId', 'fAddress', 'fNeighborhood', 'fCity', 'fState'];
    for (const f of fields) {
      if (!el[f] || !el[f].value) {
        alert('Por favor completa todos los campos obligatorios (*)');
        el[f]?.focus();
        return;
      }
    }

    // 2. Validación de Integridad del Carrito (Robustez)
    const raw = localStorage.getItem(CART_KEY);
    const items = raw ? JSON.parse(raw) : [];
    
    if (items.length === 0) {
      alert('Tu carrito está vacío. No podemos procesar el pedido.');
      window.location.href = 'products.html';
      return;
    }

    // Verificar que todos los items tengan ID y Nombre
    const invalidItems = items.filter(i => !i.id || !i.name);
    if (invalidItems.length > 0) {
      console.error('[PeLoot] Carrito corrupto detectado:', invalidItems);
      alert('Se detectó un error en los datos de tus productos. Por favor, limpia tu carrito e intenta de nuevo.');
      return;
    }

    // UI Feedback: Iniciando proceso
    el.btnConfirm.disabled = true;
    el.btnConfirm.innerHTML = `
      <span style="display: flex; align-items: center; gap: 10px; justify-content: center;">
        <svg class="spinner" width="20" height="20" viewBox="0 0 50 50" style="animation: rotate 2s linear infinite;">
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="90, 150" stroke-linecap="round"></circle>
        </svg>
        Procesando Pedido...
      </span>
    `;

    try {
      console.log('[PeLoot] Iniciando guardado robusto de pedido...');
      
      const mainItem = items[0];
      const mainPrice = Number(String(mainItem.price || mainItem.priceCOP || 0).replace(/[^\d]/g, ''));
      const finalTotal = Number(el.total.textContent.replace(/[^\d]/g, '')) || (mainPrice * (mainItem.qty || 1));

      // Construcción segura del objeto Order
      const orderData = {
        userId: currentUser.uid,
        fullName: el.fName.value.trim(),
        email: el.fEmail.value.trim(),
        phone: el.fPhone.value.trim(),
        cedula: el.fId.value.trim(),
        address: el.fAddress.value.trim(),
        neighborhood: el.fNeighborhood.value.trim(),
        city: el.fCity.value.trim(),
        department: el.fState.value.trim(),
        zip: el.fZip.value.trim() || '',
        country: el.fCountry.value,
        notes: el.fNotes.value.trim() || '',
        
        // Datos Legacy
        productId: mainItem.id,
        productName: mainItem.name,
        productPrice: mainPrice,
        qty: mainItem.qty || 1,
        
        // Datos Extendidos
        items: items.map(i => ({
          id: i.id,
          name: i.name,
          price: Number(String(i.price || i.priceCOP || 0).replace(/[^\d]/g, '')) || 0,
          qty: Number(i.qty) || 1,
          image: i.image || i.imageUrl || ''
        })),
        total: finalTotal,
        currency: getActiveCurrency().code,
        status: 'pending',
        platform: 'web_v3',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Guardado en Firestore
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      console.log('[PeLoot] ✅ Pedido guardado con ID:', docRef.id);

      // Generar link de pago seguro en Mercado Pago
      let paymentUrl = '';
      try {
        console.log('[PeLoot] Generando link de pago en Mercado Pago...');
        let discountPercent = 0;
        const savedCoupon = localStorage.getItem('peloot_applied_coupon');
        if (savedCoupon) {
          const couponData = await validateCoupon(savedCoupon, currentUser || {});
          if (couponData && couponData.valid) {
            discountPercent = Number(couponData.discount) || 0;
          }
        }

        const mpRes = await fetch('/api/create-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: docRef.id,
            fullName: orderData.fullName,
            email: orderData.email,
            items: orderData.items,
            currency: orderData.currency,
            discountPercent: discountPercent
          })
        });

        if (mpRes.ok) {
          const mpData = await mpRes.json();
          paymentUrl = mpData.init_point;
          console.log('[PeLoot] ✅ Link de Mercado Pago generado:', paymentUrl);
          // Actualizar pedido en Firestore con la URL del link de pago
          await updateDoc(doc(db, 'orders', docRef.id), { paymentUrl });
        } else {
          console.warn('[PeLoot] No se pudo generar la preferencia de Mercado Pago:', await mpRes.text());
        }
      } catch (e) {
        console.error('[PeLoot] Error al conectar con Mercado Pago:', e);
      }

      // ÉXITO: Limpiar carrito (Local y Firebase) y cupón
      localStorage.removeItem(CART_KEY);
      localStorage.removeItem('peloot_applied_coupon');
      if (currentUser) {
        try {
          await saveCartToFirebase(currentUser.uid, []);
          console.log('[PeLoot] Carrito en la nube limpiado.');
        } catch (e) { console.error('[PeLoot] Error limpiando nube:', e); }
      }
      
      // Animación de éxito opcional (simple delay para que se vea el cambio)
      el.btnConfirm.style.background = 'var(--accent-green)';
      el.btnConfirm.innerHTML = '¡Pedido Confirmado! 🎉';
      
      setTimeout(() => {
        const nextUrl = paymentUrl 
          ? `success?order_id=${docRef.id}&payment_url=${encodeURIComponent(paymentUrl)}`
          : `success?order_id=${docRef.id}`;
        window.location.href = nextUrl;
      }, 800);

    } catch (error) {
      console.error('[PeLoot] ERROR FATAL al guardar pedido:', error);
      
      // UI de Error Robusta
      el.btnConfirm.disabled = false;
      el.btnConfirm.style.background = '#ff4d4d';
      el.btnConfirm.innerHTML = 'Error al Guardar. Reintentar 🔄';
      
      alert(`Hubo un error al procesar tu compra:\n${error.message}\n\nPor favor intenta de nuevo. Si el error persiste, contacta a soporte PeLoot.`);
    }
  };
}

// Inicialización inmediata
renderSummary();

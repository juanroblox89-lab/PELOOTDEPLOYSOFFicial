import { onAuth } from './auth-service.js';
import { CURRENCIES, convertPrice, getGlobalSettings, validateCoupon } from './store-service.js';
import { getCartFromFirebase, saveCartToFirebase } from './firebase-service.js';

// ==========================
// CARRITO GLOBAL PeLoot PRO
// ==========================

export const CART_KEY = "peloot-cart";
const LEGACY_CART_KEY = "peloot_cart";

let currentUser = null;
let globalSettings = null;
const activeCurrencyCode = localStorage.getItem('peloot_currency') || 'USD';
const activeCurrency = CURRENCIES.find(c => c.code === activeCurrencyCode) || CURRENCIES[0];

onAuth(async user => { 
  currentUser = user; 
  if (user) {
    // Sincronizar al iniciar sesión
    const firebaseCart = await getCartFromFirebase(user.uid);
    if (firebaseCart && firebaseCart.length > 0) {
      const localCart = getCart();
      
      // Fusionar: Si el producto ya está en local, mantenemos el local (o sumamos qty)
      // Para simplificar, si hay algo en Firebase, lo mezclamos con lo local
      const mergedCart = [...localCart];
      firebaseCart.forEach(fItem => {
        const exists = mergedCart.find(lItem => lItem.id === fItem.id);
        if (!exists) {
          mergedCart.push(fItem);
        }
      });
      
      localStorage.setItem(CART_KEY, JSON.stringify(mergedCart));
      updateCartCount();
    } else {
      // Si Firebase está vacío, subimos lo local
      const localCart = getCart();
      if (localCart.length > 0) {
        saveCartToFirebase(user.uid, localCart);
      }
    }
  }
});

// ==========================
// STORAGE
// ==========================

function migrateLegacyCartKey() {
  const legacyRaw = localStorage.getItem(LEGACY_CART_KEY);
  const currentRaw = localStorage.getItem(CART_KEY);
  if (!legacyRaw || currentRaw) return;
  localStorage.setItem(CART_KEY, legacyRaw);
  localStorage.removeItem(LEGACY_CART_KEY);
}

export function getCart() {
  migrateLegacyCartKey();
  return JSON.parse(localStorage.getItem(CART_KEY)) || [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  if (currentUser) {
    saveCartToFirebase(currentUser.uid, cart);
  }
}

// ==========================
// FORMATO PRECIO
// ==========================
function formatPrice(n){
  if (!globalSettings) return n.toLocaleString("es-CO");
  const converted = convertPrice(n, activeCurrency.code, globalSettings.exchangeRates, 'COP');
  const formatted = converted.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${activeCurrency.symbol}${formatted} ${activeCurrency.code}`;
}

// ==========================
// AGREGAR
// ==========================

function showCartToast(name) {
  let toastEl = document.getElementById("peloot-toast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "peloot-toast";
    toastEl.className = "toast-gaming";
    document.body.appendChild(toastEl);
  }
  toastEl.innerHTML = `
    <span class="toast-icon">🚀</span>
    <div class="toast-info">
      <strong>${name}</strong>
      <span>Añadido al Loot</span>
    </div>
  `;
  
  toastEl.classList.add('show');
  
  clearTimeout(toastEl._hideTimer);
  toastEl._hideTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3000);
}

export function addToCart(product) {
  const cart = getCart();
  // Asegurar que el precio sea número para evitar el error del total en 0
  let rawPrice = product.price;
  if (typeof rawPrice === 'string') rawPrice = rawPrice.replace(/[^\d]/g, '');
  const cleanProduct = {
    ...product,
    price: Number(rawPrice) || 0,
    qty: Number(product.qty) || 1
  };
  
  const existing = cart.find(p => p.id === cleanProduct.id);
  if (existing) {
    existing.qty += cleanProduct.qty;
  } else {
    cart.push(cleanProduct);
  }
  saveCart(cart);
  updateCartCount();
  showCartToast(cleanProduct.name);
}

// ==========================
// RENDER
// ==========================

async function renderCart(containerId){
  const container = document.getElementById(containerId);
  if(!container) return;

  const subtotalEl = document.getElementById("subtotal");
  const totalValEl = document.getElementById("total-val");

  let cart = getCart();
  container.innerHTML = "<div class='loading-cart'>⌛ Cargando Loot...</div>";

  if (!globalSettings) globalSettings = await getGlobalSettings();

  const totalLegacy = document.getElementById("total");
  const clearBtn = document.getElementById("clear");
  const checkoutBtn = document.getElementById("whatsapp");

  container.innerHTML = "";

  if(cart.length === 0){
    container.innerHTML = `
      <div class='empty-cart-gaming'>
        <h3>Tu Loot está vacío 🛒</h3>
        <p>Busca algo épico para tu colección.</p>
        <a href='products.html' class='btn-primary-gaming'>Ver Productos</a>
      </div>
    `;
    if (totalLegacy) totalLegacy.textContent = formatPrice(0);
    if (subtotalEl) subtotalEl.textContent = formatPrice(0);
    if (totalValEl) totalValEl.textContent = formatPrice(0);
    return;
  }

  let subtotal = 0;
  cart.forEach(item => {
    let rawPrice = item.price;
    if (typeof rawPrice === 'string') rawPrice = rawPrice.replace(/[^\d]/g, '');
    const price = Number(rawPrice) || 0;
    const qty = Number(item.qty) || 0;
    subtotal += price * qty;
    const div = document.createElement("div");
    div.className = "cart-item-premium";
    div.innerHTML = `
      <div class="cart-item-img-box">
        <img src="${item.image || item.imageUrl}" alt="${item.name}">
      </div>
      <div class="cart-item-main">
        <h4>${item.name}</h4>
        <p class="cart-item-price">${formatPrice((Number(item.price) || 0) * (Number(item.qty) || 0))}</p>
      </div>
      <div class="cart-item-actions">
        <div class="cart-qty-pill">
          <button class="minus" data-id="${item.id}">−</button>
          <span>${item.qty}</span>
          <button class="plus" data-id="${item.id}">+</button>
        </div>
        <button class="remove-cart-item" data-id="${item.id}" aria-label="Eliminar">✕</button>
      </div>
    `;
    container.appendChild(div);
  });

  // Coupon Logic
  const savedCoupon = localStorage.getItem('peloot_applied_coupon');
  let discount = 0;
  if (savedCoupon) {
    const couponData = await validateCoupon(savedCoupon, currentUser || {});
    if (couponData && couponData.valid) {
      discount = subtotal * (couponData.discount / 100);
    } else {
      localStorage.removeItem('peloot_applied_coupon');
    }
  }

  const finalTotal = subtotal - discount;
  if (totalLegacy) totalLegacy.textContent = formatPrice(finalTotal);
  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalValEl) totalValEl.textContent = formatPrice(finalTotal);

  // Events
  container.querySelectorAll(".remove-cart-item").forEach(btn=>{
    btn.onclick = () => {
      const cart = getCart().filter(p => p.id !== btn.dataset.id);
      saveCart(cart);
      renderCart(containerId);
      updateCartCount();
    };
  });

  container.querySelectorAll(".plus").forEach(btn=>{
    btn.onclick = () => {
      const cart = getCart();
      const item = cart.find(p => p.id === btn.dataset.id);
      item.qty++;
      saveCart(cart);
      renderCart(containerId);
      updateCartCount();
    };
  });

  container.querySelectorAll(".minus").forEach(btn=>{
    btn.onclick = () => {
      const cart = getCart();
      const item = cart.find(p => p.id === btn.dataset.id);
      if(item.qty > 1){
        item.qty--;
        saveCart(cart);
        renderCart(containerId);
        updateCartCount();
      }
    };
  });

  if (clearBtn) clearBtn.onclick = () => {
    localStorage.removeItem(CART_KEY);
    renderCart(containerId);
    updateCartCount();
  };

  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      const cart = getCart();
      if (cart.length === 0) return;
      window.location.href = "checkout";
    };
  }
}

export function updateCartCount(){
  const countEls = document.querySelectorAll("#cart-count");
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  countEls.forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? "flex" : "none";
  });
}

// Initial call
updateCartCount();

window.renderCart = renderCart;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;

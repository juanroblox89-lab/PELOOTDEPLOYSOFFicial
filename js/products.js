import { getAllProducts, getProductsByCategory } from './firebase-service.js';
import { CURRENCIES, convertPrice, getGlobalSettings } from './store-service.js';

const filterSelect = document.getElementById("categoryFilter");
const container = document.getElementById("products-container");
const searchInput = document.getElementById("search");     
const searchBtn = document.getElementById("searchBtn");    

let products = [];
let filtered = [];
let globalSettings = null;
const activeCurrencyCode = localStorage.getItem('peloot_currency') || 'COP';
const activeCurrency = CURRENCIES.find(c => c.code === activeCurrencyCode) || CURRENCIES[0];

function getCategoryFromSearch(search) {
  const params = new URLSearchParams(search || "");
  return params.get("cat") || params.get("game");
}

const category = getCategoryFromSearch(window.location.search);

// ===========================
// FORMATO PRECIO
// ===========================
function formatPrice(n){
  if (!globalSettings) return n.toLocaleString("es-CO");
  
  const converted = convertPrice(n, activeCurrency.code, globalSettings.exchangeRates, 'COP');
  const formatted = converted.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  
  // Clean formatting for specific currencies
  if (activeCurrency.code === 'COP' || activeCurrency.code === 'CLP') {
    return `${activeCurrency.symbol}${formatted}`;
  }
  return `${activeCurrency.symbol}${formatted} ${activeCurrency.code}`;
}

// ===========================
// CREAR CARD
// ===========================
let _cardIndex = 0;
function createCard(p){
  const card = document.createElement("div");
  card.className = "product-card-gaming";
  const isFirst = _cardIndex < 4;
  _cardIndex++;

  const isOutOfStock = p.stock !== undefined && p.stock <= 0;
  const discountBadge = p.discount ? `<div class="product-badge-premium" style="background:#EF4444;">-${p.discount}%</div>` : '';
  const categoryBadge = p.category ? `<div class="product-badge-premium">${p.category}</div>` : '';

  card.innerHTML = `
    ${discountBadge || categoryBadge}
    <a href="product?id=${p.id}" class="product-image-container" style="display:flex; cursor:pointer; text-decoration:none;">
      <img src="${p.imageUrl || p.image}" class="product-img" alt="${p.name}"
        loading="${isFirst ? 'eager' : 'lazy'}" decoding="async"
        ${isFirst ? 'fetchpriority="high"' : ''}
        onerror="this.src='assets/images/logo/peloot.png'">
    </a>
    <div class="product-info-gaming">
      <a href="product?id=${p.id}" style="text-decoration:none; color:inherit;">
        <h4 style="font-size: 0.95rem; margin: 0 0 6px; color: var(--text-main); font-weight: 700;">${p.name}</h4>
      </a>
      <div style="font-weight: 900; font-size: 1rem; color: var(--text-main); margin-bottom: 8px;">${formatPrice(p.price)}</div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <span style="color: var(--secondary-yellow); font-size: 0.75rem;">★</span>
          <span style="font-weight: 700; font-size: 0.75rem; color: var(--text-main);">4.${Math.floor(Math.random()*3)+7}</span>
          <span style="font-size: 0.7rem; color: var(--text-muted);">(${Math.floor(Math.random()*150)+20})</span>
        </div>
        <button class="btn-cart-icon quick-add ${isOutOfStock ? 'disabled' : ''}" data-id="${p.id}" ${isOutOfStock ? 'disabled' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </button>
      </div>
      <a href="product?id=${p.id}" style="display:block; margin-top:10px; text-align:center; font-weight:700; font-size:0.8rem; color:var(--primary-blue); text-decoration:none;">Ver detalles →</a>
    </div>
  `;
  return card;
}



// ===========================
// RENDER
// ===========================
function renderProducts(list, limit = 0){
  if(!container) return;
  container.innerHTML = "";
  _cardIndex = 0;

  // Filter out products without images
  const withImages = list.filter(p => p.active !== false && (p.imageUrl || p.image));

  if(withImages.length === 0){
    container.innerHTML = "<p style='grid-column: 1/-1; text-align: center; padding: 100px 0; font-weight: 600; color: var(--text-muted);'>No encontramos lo que buscas 😢</p>";
    return;
  }

  const toRender = limit > 0 ? withImages.slice(0, limit) : withImages;

  toRender.forEach(p=>{
    const card = createCard(p);
    container.appendChild(card);
    
    card.querySelector('.quick-add')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      import('./cart.js').then(m => m.addToCart({ ...p, qty: 1 }));
    });
  });
}

// ===========================
// CARGA DESDE FIREBASE
// ===========================
async function loadProducts() {
  if (!container) return;
  globalSettings = await getGlobalSettings();

  container.innerHTML = `
    <div class="product-card-gaming skeleton" style="height: 400px; background: #eee; border-radius: 20px;"></div>
    <div class="product-card-gaming skeleton" style="height: 400px; background: #eee; border-radius: 20px;"></div>
    <div class="product-card-gaming skeleton" style="height: 400px; background: #eee; border-radius: 20px;"></div>
  `;

  // Detect if we are on the home page (no categoryFilter select = home)
  const isHomePage = !document.getElementById('categoryFilter');

  try {
    if (category) {
      products = await getProductsByCategory(category);
    } else {
      products = await getAllProducts();
    }
    filtered = [...products];
    renderProducts(filtered, isHomePage ? 4 : 0);
  } catch (error) {
    console.error("Error cargando productos:", error);
    container.innerHTML = "<p>Error cargando los productos.</p>";
  }
}

loadProducts();

// ===========================
// BUSCADOR
// ===========================
function doSearch(){
  const term = (searchInput?.value || "").toLowerCase();
  if(!container) {
    if (term) window.location.href = `products?search=${encodeURIComponent(term)}`;
    return;
  }
  const result = products.filter(p => (p.name || "").toLowerCase().includes(term) || (p.category || "").toLowerCase().includes(term));
  renderProducts(result);
}

searchInput?.addEventListener("input", doSearch);
searchBtn?.addEventListener("click", doSearch);

if(filterSelect){
  filterSelect.addEventListener("change", () => {
    const cat = filterSelect.value;
    filtered = cat ? products.filter(p => p.category === cat) : [...products];
    renderProducts(filtered);
  });
}

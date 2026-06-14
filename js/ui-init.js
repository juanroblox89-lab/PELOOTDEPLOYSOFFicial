// ui-init.js — PeLoot
// Premium Dynamic UI Injection & Auth Wiring

import { onAuth, loginWithGoogle, logout } from './auth-service.js';
import { getOrdersByUser, cancelOrder } from './firebase-service.js?v=1.11';
import { CURRENCIES, getGlobalSettings } from './store-service.js';

// —————————————————————————————————————————————————————————————————————————————————————
// DYNAMIC COMPONENT INJECTOR
// —————————————————————————————————————————————————————————————————————————————————————
function ensureDynamicUIComponents() {
  const oldAuth = document.getElementById('auth-overlay');
  if (oldAuth) oldAuth.remove();

  if (document.getElementById('peloot-dynamic-containers')) return;

  const container = document.createElement('div');
  container.id = 'peloot-dynamic-containers';
  container.innerHTML = `
    <!-- SIDEBAR OVERLAY -->
    <div class="sidebar-overlay" id="sidebar-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); z-index:1500; display:none; opacity:0; transition:all 0.3s ease;"></div>

    <!-- USER SIDEBAR -->
    <div class="user-sidebar" id="user-sidebar">
      <div style="padding: 32px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
          <h2 style="font-size:1.5rem; font-weight:800;">Mi Cuenta</h2>
          <button id="sidebar-close-btn" style="background:none; border:none; cursor:pointer; font-size:1.5rem;">&times;</button>
        </div>

        <div id="sidebar-profile-box" style="display:none; margin-bottom:40px; padding:24px; background:var(--bg-section); border-radius:var(--radius-lg);">
          <div style="display:flex; align-items:center; gap:16px;">
            <img id="sidebar-user-img" src="assets/images/logo/favicon.png" style="width:64px; height:64px; border-radius:50%; border:3px solid white;">
            <div>
              <h4 id="sidebar-user-name" style="font-size:1.1rem; margin-bottom:2px;">Gamer</h4>
              <p style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">Miembro Premium</p>
            </div>
          </div>
        </div>

        <div class="sidebar-menu" style="display:flex; flex-direction:column; gap:12px;">
          <a href="orders" class="btn-secondary-gaming" style="width:100%; justify-content:flex-start; padding:16px 24px; border-color:var(--bg-section); color:var(--text-main);">📦 Mis Pedidos</a>
          
          <div style="margin: 24px 0; height:1px; background:var(--bg-section);"></div>
          
          <label for="currency-selector" style="font-weight:800; font-size:0.75rem; color:var(--text-muted); margin-bottom:12px; display:block; text-transform:uppercase;">Cambiar Moneda</label>
          <select id="currency-selector" style="width:100%; padding:14px; border-radius:12px; border:2px solid var(--bg-section); font-weight:700; background:white; cursor:pointer;">
            ${CURRENCIES.map(c => `<option value="${c.code}" ${(localStorage.getItem('peloot_currency') || 'USD') === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}
          </select>

          <button id="sidebar-logout" style="margin-top:40px; background:none; border:none; color:#EF4444; font-weight:800; cursor:pointer; display:none; align-items:center; gap:8px;">
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>
    </div>

    <!-- AUTH OVERLAY -->
    <div class="premium-auth-overlay" id="auth-overlay">
      <div class="premium-auth-modal">
        <div style="padding:48px; text-align:center;">
          <h2 style="font-size:2rem; margin-bottom:12px;">¡Hola Coleccionista!</h2>
          <p style="color:var(--text-muted); font-weight:600; margin-bottom:30px;">Únete a PeLoot para guardar tu carrito y ver tus pedidos.</p>
          
          <button id="btn-google-login" class="btn-secondary-gaming" style="width:100%; gap:12px; margin-bottom:20px; border-color:var(--bg-section); color:var(--text-main);">
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" width="20">
            Continuar con Google
          </button>

          <div style="background: #FFF5F5; border: 1px solid #FEB2B2; padding: 12px; border-radius: 8px; text-align: left; font-size: 0.75rem; color: #C53030; line-height: 1.4; font-weight: 700; margin-bottom: 20px;">
            ⚠️ <strong>¿Estás en TikTok o Instagram?</strong><br>
            Google bloquea los inicios de sesión aquí. Toca los tres puntos (•••) arriba a la derecha and selecciona <strong>"Abrir en el navegador"</strong> para poder continuar.
          </div>

          <button id="close-auth-modal" style="background:none; border:none; font-weight:700; color:var(--text-muted); cursor:pointer;">Tal vez luego</button>
        </div>
      </div>
    </div>

    </div>
  `;
  document.body.appendChild(container);

  // Event Listeners
  document.getElementById('sidebar-close-btn')?.addEventListener('click', () => toggleSidebar(false));
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => toggleSidebar(false));
  document.getElementById('close-auth-modal')?.addEventListener('click', () => {
    document.getElementById('auth-overlay').classList.remove('active');
  });

  const currencySelector = document.getElementById('currency-selector');
  currencySelector?.addEventListener('change', (e) => {
    localStorage.setItem('peloot_currency', e.target.value);
    window.location.reload();
  });
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('user-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  if (open) {
    sidebar.classList.add('open');
    overlay.style.display = 'block';
    setTimeout(() => overlay.style.opacity = '1', 10);
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('open');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 300);
    document.body.style.overflow = '';
  }
}

function injectUnifiedHeader() {
  const headerEl = document.querySelector('.header-premium');
  if (!headerEl) return;

  const currentPath = window.location.pathname;
  const isSubFolder = currentPath.includes('/legal/');
  const basePath = isSubFolder ? '../' : '';

  headerEl.innerHTML = `
    <div class="container header-container" style="position: relative; display: flex; justify-content: space-between; align-items: center; width: 100%; height: 72px;">
      <!-- Hamburger Menu (SVG) -->
      <button class="hamburger-gaming" id="hamburger" aria-label="Abrir menú" style="display: flex; background: none; border: none; cursor: pointer; padding: 6px; z-index: 1100;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <!-- Center: Logo -->
      <a href="${basePath}" class="logo-gaming" id="logo-gaming" style="display: flex; align-items: center; justify-content: center; position: absolute; left: 50%; transform: translateX(-50%); transition: opacity 0.3s ease;">
        <img src="${basePath}assets/images/logo/peloot.png" alt="PeLoot" style="height: 52px; width: auto; object-fit: contain; image-rendering: -webkit-optimize-contrast; display: block;" onerror="this.src='${basePath}assets/images/logo/peloot.png'">
      </a>

      <!-- Navigation Drawer Menu -->
      <nav id="main-nav" class="nav-gaming">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1.5px solid var(--border-light);" class="drawer-header-only-mobile">
          <span style="font-weight: 900; font-size: 1.25rem; color: var(--text-main);">Menú PeLoot</span>
        </div>
        <a href="${basePath}">Inicio</a>
        <a href="${basePath}products">Productos</a>
        <a href="${basePath}orders">Mis Pedidos</a>
        <a href="#" id="nav-btn-account">Mi Cuenta 👤</a>
      </nav>

      <!-- Right Actions (Search + Cart) -->
      <div class="header-actions-gaming" style="display: flex; align-items: center; gap: 12px; z-index: 1000;">
        <div class="search-wrapper-premium" style="display: flex; align-items: center; position: relative;">
          <input type="text" id="global-search-input" placeholder="Buscar peluches..." style="width: 0px; opacity: 0; padding: 8px 0px; border: 1.5px solid var(--border-light); border-radius: 20px; font-size: 0.85rem; font-weight: 600; outline: none; transition: all 0.3s ease; background: white; color: var(--text-main); font-family: inherit; right: 38px; position: absolute; pointer-events: none; z-index: 10;">
          <button id="btn-toggle-search" aria-label="Buscar" style="background: none; border: none; cursor: pointer; padding: 6px; display: flex; align-items: center; color: var(--text-main); transition: transform 0.2s ease; z-index: 15;">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
        
        <a href="${basePath}cart" class="cart-action" style="position: relative; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; background: var(--primary-blue); color: white; border-radius: 12px; transition: all 0.2s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          <span id="cart-count" style="position: absolute; top: -6px; right: -6px; background: var(--secondary-yellow); color: #000; font-size: 10px; font-weight: 800; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white;">0</span>
        </a>
      </div>
    </div>
  `;

  // Search logic wiring
  const searchBtn = document.getElementById('btn-toggle-search');
  const searchInput = document.getElementById('global-search-input');
  const logo = document.getElementById('logo-gaming');

  searchBtn?.addEventListener('click', () => {
    const isActive = searchInput.classList.contains('active');
    if (!isActive) {
      searchInput.classList.add('active');
      searchInput.style.width = window.innerWidth < 480 ? '130px' : '180px';
      searchInput.style.opacity = '1';
      searchInput.style.padding = '8px 12px';
      searchInput.style.pointerEvents = 'auto';
      searchInput.focus();
      if (window.innerWidth < 480 && logo) {
        logo.style.opacity = '0';
      }
    } else {
      const term = searchInput.value.trim();
      if (term) {
        window.location.href = `${basePath}products?search=${encodeURIComponent(term)}`;
      } else {
        searchInput.classList.remove('active');
        searchInput.style.width = '0px';
        searchInput.style.opacity = '0';
        searchInput.style.padding = '8px 0px';
        searchInput.style.pointerEvents = 'none';
        if (logo) logo.style.opacity = '1';
      }
    }
  });

  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const term = searchInput.value.trim();
      if (term) {
        window.location.href = `${basePath}products?search=${encodeURIComponent(term)}`;
      }
    }
  });
}

function injectFooterCurrencySelector() {
  const footerBottom = document.querySelector('.footer-bottom-gaming') || document.querySelector('.footer-gaming .container');
  if (footerBottom) {
    if (document.getElementById('footer-currency-selector-container')) return;

    const container = document.createElement('div');
    container.id = 'footer-currency-selector-container';
    container.className = 'footer-currency-selector';
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    container.style.marginTop = '16px';
    container.style.background = '#F5F7FA';
    container.style.border = '1px solid #E8EAEF';
    container.style.padding = '8px 12px';
    container.style.borderRadius = '12px';

    const currentCurrency = localStorage.getItem('peloot_currency') || 'USD';

    container.innerHTML = `
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-body);">Moneda:</span>
      <select id="footer-currency-selector" style="background: transparent; border: none; font-weight: 700; color: var(--text-main); font-family: inherit; font-size: 0.82rem; cursor: pointer; outline: none; padding-right: 4px;">
        ${CURRENCIES.map(c => `<option value="${c.code}" ${currentCurrency === c.code ? 'selected' : ''}>${c.flag} ${c.code} (${c.symbol})</option>`).join('')}
      </select>
    `;

    footerBottom.appendChild(container);

    const select = document.getElementById('footer-currency-selector');
    select?.addEventListener('change', (e) => {
      localStorage.setItem('peloot_currency', e.target.value);
      window.location.reload();
    });
  }
}

export function initHeaderAndAuth() {
  ensureDynamicUIComponents();
  injectUnifiedHeader();
  injectFooterCurrencySelector();

  const btnOpenAuth = document.getElementById('nav-btn-account') || document.getElementById('btn-open-auth');
  const authOverlay = document.getElementById('auth-overlay');
  const btnGoogle = document.getElementById('btn-google-login');
  const btnLogout = document.getElementById('sidebar-logout');
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('main-nav');

  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    nav.classList.toggle('open');
  });

  onAuth((user) => {
    if (user) {
      // User is logged in
      const profileImg = user.photoURL || 'assets/images/logo/favicon.png';
      const cleanName = user.displayName ? user.displayName.split(' ')[0] : 'Gamer';
      
      // Close auth modal if open (important for mobile redirect flow)
      if (authOverlay) authOverlay.classList.remove('active');
      
      const headerImg = document.getElementById('header-user-img');
      const sidebarImg = document.getElementById('sidebar-user-img');
      const sidebarName = document.getElementById('sidebar-user-name');
      const profileBox = document.getElementById('sidebar-profile-box');

      if (headerImg) {
        headerImg.src = profileImg;
        if (headerImg.parentElement) headerImg.parentElement.classList.add('logged-in');
      }
      if (sidebarImg) sidebarImg.src = profileImg;
      if (sidebarName) sidebarName.textContent = cleanName;
      if (profileBox) profileBox.style.display = 'block';

      if (btnLogout) btnLogout.style.display = 'flex';

      // Acceso Admin automático para Juan
      if (user.email === 'juanroblox89@gmail.com') {
        const menu = document.querySelector('.sidebar-menu');
        if (menu && !document.getElementById('sidebar-admin-btn')) {
          const adminBtn = document.createElement('a');
          adminBtn.id = 'sidebar-admin-btn';
          adminBtn.href = 'admin';
          adminBtn.className = 'btn-primary-gaming';
          adminBtn.style.cssText = 'width:100%; justify-content:center; padding:16px; margin-top:20px; text-decoration:none; display:flex;';
          adminBtn.innerHTML = '⚙️ Panel Admin';
          menu.insertBefore(adminBtn, menu.firstChild);
        }
      }

      if (btnOpenAuth) btnOpenAuth.onclick = () => toggleSidebar(true);
      if (btnLogout) btnLogout.onclick = () => { logout(); window.location.reload(); };

    } else {
      // User is logged out
      const headerImg = document.getElementById('header-user-img');
      const profileBox = document.getElementById('sidebar-profile-box');

      if (headerImg) {
        headerImg.src = 'assets/images/logo/favicon.png';
        if (headerImg.parentElement) headerImg.parentElement.classList.remove('logged-in');
      }
      if (profileBox) profileBox.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'none';

      if (btnOpenAuth) {
        btnOpenAuth.onclick = () => {
          if (authOverlay) authOverlay.classList.add('active');
        };
      }
      if (btnGoogle) {
        btnGoogle.onclick = () => {
          loginWithGoogle().then(() => {
            if (authOverlay) authOverlay.classList.remove('active');
          });
        };
      }
    }
  });
}

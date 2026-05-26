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
            ${CURRENCIES.map(c => `<option value="${c.code}" ${localStorage.getItem('peloot_currency') === c.code ? 'selected' : ''}>${c.flag} ${c.name}</option>`).join('')}
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
            Google bloquea los inicios de sesión aquí. Toca los tres puntos (•••) arriba a la derecha y selecciona <strong>"Abrir en el navegador"</strong> para poder continuar.
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

export function initHeaderAndAuth() {
  ensureDynamicUIComponents();

  const btnOpenAuth = document.getElementById('btn-open-auth');
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

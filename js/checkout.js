/**
 * PeLoot - Checkout System v4
 * Rediseño premium step-by-step, con soporte de compra como invitado (Guest Checkout),
 * persistencia total en localStorage, bases de datos locales para departamentos/municipios de Colombia
 * y validaciones interactivas en tiempo real.
 */

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { loginWithGoogle } from './auth-service.js';
import { CURRENCIES, convertPrice, getGlobalSettings, validateCoupon } from './store-service.js';
import { DEPARTAMENTOS_COLOMBIA } from './colombia-data.js';
import { saveCartToFirebase } from './firebase-service.js';

// --- Configuración ---
const CART_KEY = "peloot-cart";
const LSTORE_PREFIX = "peloot_chk_field_";
let currentUser = null;
let globalSettings = null;
let currentStep = 1;

// --- Elementos de UI ---
const el = {
  // Pasos y Contenedores
  step1: document.getElementById('step-1'),
  step2: document.getElementById('step-2'),
  step3: document.getElementById('step-3'),
  
  // Progreso
  pStep1: document.getElementById('p-step-1'),
  pStep2: document.getElementById('p-step-2'),
  pStep3: document.getElementById('p-step-3'),
  progressLineFill: document.getElementById('progress-line-fill'),

  // Navegación
  btnToStep2: document.getElementById('btn-to-step2'),
  btnToStep3: document.getElementById('btn-to-step3'),
  btnBackToStep1: document.getElementById('btn-back-to-step1'),
  btnBackToStep2: document.getElementById('btn-back-to-step2'),
  btnConfirm: document.getElementById('btn-confirm-order'),
  
  // Celulares / Móvil
  btnMobileAction: document.getElementById('btn-mobile-action'),
  summaryToggle: document.getElementById('summary-toggle'),
  summaryCollapse: document.getElementById('summary-collapse'),
  mobileSummaryTotal: document.getElementById('mobile-summary-total'),

  // Resúmenes de Compra
  listDesktop: document.getElementById('checkout-items-list'),
  listMobile: document.getElementById('checkout-items-list-mobile'),
  subtotalDesktop: document.getElementById('chk-subtotal'),
  subtotalMobile: document.getElementById('chk-subtotal-mobile'),
  totalDesktop: document.getElementById('chk-total'),

  // Formulario - Paso 1 (Contacto)
  fName: document.getElementById('chk-name'),
  fEmail: document.getElementById('chk-email'),
  fPhone: document.getElementById('chk-phone'),
  fId: document.getElementById('chk-id'),

  // Formulario - Paso 2 (Envío)
  fCountry: document.getElementById('chk-country'),
  fStateSelect: document.getElementById('chk-state-select'),
  fCitySelect: document.getElementById('chk-city-select'),
  fStateText: document.getElementById('chk-state'),
  fCityText: document.getElementById('chk-city'),
  fAddress: document.getElementById('chk-address'),
  fNeighborhood: document.getElementById('chk-neighborhood'),
  fZip: document.getElementById('chk-zip'),
  fNotes: document.getElementById('chk-notes')
};

// --- Claves para guardado en localStorage ---
const formInputs = [
  'chk-name', 'chk-email', 'chk-phone', 'chk-id', 
  'chk-country', 'chk-state-select', 'chk-city-select', 
  'chk-state', 'chk-city', 'chk-address', 'chk-neighborhood', 
  'chk-zip', 'chk-notes'
];

// --- Ayudantes de Divisa y Formato ---
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

// --- Lógica del Sistema de Pasos ---
function showStep(stepNum) {
  currentStep = stepNum;

  // Ocultar todas las tarjetas de pasos
  el.step1.classList.remove('active');
  el.step2.classList.remove('active');
  el.step3.classList.remove('active');

  // Mostrar el paso actual
  document.getElementById(`step-${stepNum}`).classList.add('active');

  // Actualizar Indicador Visual de Pasos
  const steps = [el.pStep1, el.pStep2, el.pStep3];
  steps.forEach((st, idx) => {
    const stepIdx = idx + 1;
    st.classList.remove('active', 'completed');
    if (stepIdx < stepNum) {
      st.classList.add('completed');
    } else if (stepIdx === stepNum) {
      st.classList.add('active');
    }
  });

  // Ajustar barra de progreso lineal
  const progressPercent = stepNum === 1 ? 0 : stepNum === 2 ? 50 : 100;
  if (el.progressLineFill) {
    el.progressLineFill.style.width = `${progressPercent}%`;
  }

  // Actualizar Botón Fijo en Móviles
  if (el.btnMobileAction) {
    if (stepNum === 1) {
      el.btnMobileAction.innerHTML = `Continuar al Envío 📦`;
      el.btnMobileAction.style.background = `var(--primary-blue)`;
      el.btnMobileAction.onclick = () => handleGoToStep2();
    } else if (stepNum === 2) {
      el.btnMobileAction.innerHTML = `Continuar al Pago 💳`;
      el.btnMobileAction.style.background = `var(--primary-blue)`;
      el.btnMobileAction.onclick = () => handleGoToStep3();
    } else {
      el.btnMobileAction.innerHTML = `Pagar Pedido Ahora 💳`;
      el.btnMobileAction.style.background = `var(--accent-green)`;
      el.btnMobileAction.onclick = () => confirmOrder();
    }
  }

  // Scroll suave al inicio del formulario para evitar que se pierdan
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

// --- Acordeón Resumen de Compra en Móvil ---
if (el.summaryToggle && el.summaryCollapse) {
  el.summaryToggle.onclick = () => {
    const isVisible = el.summaryCollapse.style.display === 'block';
    el.summaryCollapse.style.display = isVisible ? 'none' : 'block';
    el.summaryToggle.querySelector('span font, span span') || (el.summaryToggle.innerHTML = isVisible 
      ? `<span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Ver resumen de compra <span style="font-size:0.8rem;">▼</span></span> <span class="price-bold">${el.mobileSummaryTotal.textContent}</span>`
      : `<span><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Ocultar resumen <span style="font-size:0.8rem;">▲</span></span> <span class="price-bold">${el.mobileSummaryTotal.textContent}</span>`
    );
  };
}

// --- Carga y Renderizado del Resumen de Compra ---
async function renderSummary() {
  console.log('[PeLoot] 🚀 Renderizando resumen del pedido...');
  
  let cart = [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) { console.error('[PeLoot] Error parseando cart:', e); }

  globalSettings = await getGlobalSettings();
  const activeCurrency = getActiveCurrency();

  const emptyState = '<p style="text-align:center; color:var(--text-muted); padding:20px; font-weight: 600;">Tu carrito está vacío</p>';
  if (!cart || cart.length === 0) {
    if (el.listDesktop) el.listDesktop.innerHTML = emptyState;
    if (el.listMobile) el.listMobile.innerHTML = emptyState;
    
    const formattedZero = formatPrice(0, activeCurrency, globalSettings);
    if (el.subtotalDesktop) el.subtotalDesktop.textContent = formattedZero;
    if (el.subtotalMobile) el.subtotalMobile.textContent = formattedZero;
    if (el.totalDesktop) el.totalDesktop.textContent = formattedZero;
    if (el.mobileSummaryTotal) el.mobileSummaryTotal.textContent = formattedZero;
    return;
  }

  // Inicializar HTMLs
  if (el.listDesktop) el.listDesktop.innerHTML = '';
  if (el.listMobile) el.listMobile.innerHTML = '';
  
  let subtotal = 0;

  for (const item of cart) {
    let price = Number(String(item.price || item.priceCOP || 0).replace(/[^\d]/g, ''));
    if (price === 0 && item.id) {
      price = await getProductPrice(item.id);
    }

    const qty = Math.max(1, Number(item.qty) || 1);
    const itemTotal = price * qty;
    subtotal += itemTotal;

    const formattedItemTotal = formatPrice(itemTotal, activeCurrency, globalSettings);
    const itemHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 1px solid rgba(0,0,0,0.05); padding: 12px 0;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:48px; height:48px; background:var(--bg-section); border-radius:10px; display:flex; align-items:center; justify-content:center; border: 1px solid var(--border-light); overflow: hidden; flex-shrink: 0;">
             <img src="${item.image || item.imageUrl}" style="max-width:85%; max-height:85%; object-fit:contain;">
          </div>
          <div>
            <p style="font-weight:700; font-size:0.9rem; color: var(--text-main); margin:0;">${item.name}</p>
            <p style="font-size:0.78rem; color:var(--text-muted); font-weight: 600; margin:2px 0 0 0;">Cant: ${qty}</p>
          </div>
        </div>
        <span style="font-weight:800; font-size:0.92rem; color: var(--text-main);">${formattedItemTotal}</span>
      </div>
    `;

    if (el.listDesktop) el.listDesktop.innerHTML += itemHTML;
    if (el.listMobile) el.listMobile.innerHTML += itemHTML;
  }

  // Descuentos y Cupones
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

  const formattedSubtotal = formatPrice(subtotal, activeCurrency, globalSettings);
  const formattedTotal = formatPrice(finalTotal, activeCurrency, globalSettings);

  if (el.subtotalDesktop) el.subtotalDesktop.textContent = formattedSubtotal;
  if (el.subtotalMobile) el.subtotalMobile.textContent = formattedSubtotal;
  if (el.totalDesktop) el.totalDesktop.textContent = formattedTotal;
  if (el.mobileSummaryTotal) el.mobileSummaryTotal.textContent = formattedTotal;

  // Mostrar u ocultar la advertencia de moneda de Mercado Pago de forma dinámica
  const currencyAlert = document.getElementById('currency-alert-box');
  if (currencyAlert) {
    if (activeCurrency.code !== 'COP') {
      currencyAlert.style.display = 'block';
      const userCurrs = currencyAlert.querySelectorAll('.alert-user-currency');
      userCurrs.forEach(el => {
        el.textContent = `${activeCurrency.code} (${activeCurrency.symbol})`;
      });
    } else {
      currencyAlert.style.display = 'none';
    }
  }

  console.log('[PeLoot] ✅ Resumen renderizado con éxito. Total:', finalTotal);
}

// --- Validación Interactiva en Tiempo Real ---
function validateField(inputEl) {
  if (!inputEl) return true;
  
  const id = inputEl.id;
  const val = inputEl.value.trim();
  const feedbackEl = document.getElementById(`val-${id.replace('chk-', '')}`);
  let isValid = true;

  if (inputEl.hasAttribute('required') && !val) {
    isValid = false;
    if (feedbackEl) {
      if (id === 'chk-phone') {
        const country = el.fCountry ? el.fCountry.value : 'Colombia';
        feedbackEl.textContent = (country === 'Colombia') ? "Ingresa tu número celular (10 dígitos)" : "Ingresa tu número celular de contacto";
      } else if (id === 'chk-id') {
        const country = el.fCountry ? el.fCountry.value : 'Colombia';
        feedbackEl.textContent = (country === 'Colombia') ? "Cédula requerida para la entrega de tu pedido" : "Documento de identidad requerido para la entrega";
      } else if (id === 'chk-name') {
        feedbackEl.textContent = "Por favor ingresa tu nombre completo";
      } else if (id === 'chk-email') {
        feedbackEl.textContent = "Ingresa tu correo electrónico";
      } else if (id === 'chk-address') {
        feedbackEl.textContent = "Ingresa la dirección detallada de entrega";
      } else if (id === 'chk-neighborhood') {
        feedbackEl.textContent = "Ingresa el nombre del barrio o sector";
      } else if (id === 'chk-state-select' || id === 'chk-state') {
        feedbackEl.textContent = "Ingresa tu estado o departamento";
      } else if (id === 'chk-city-select' || id === 'chk-city') {
        feedbackEl.textContent = "Ingresa tu ciudad o municipio";
      }
    }
  }

  // Validaciones Especiales
  if (isValid) {
    if (id === 'chk-name' && val.split(' ').filter(Boolean).length < 2) {
      isValid = false; // Requiere nombre y apellido
      if (feedbackEl) feedbackEl.textContent = "Por favor ingresa tu nombre y apellido completo";
    }
    
    if (id === 'chk-email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(val)) {
        isValid = false;
        if (feedbackEl) feedbackEl.textContent = "Ingresa una dirección de correo válida";
      }
    }

    if (id === 'chk-phone') {
      const cleanPhone = val.replace(/[^\d]/g, '');
      if (cleanPhone.length < 6) {
        isValid = false;
        if (feedbackEl) feedbackEl.textContent = "Ingresa un número telefónico válido (mínimo 6 dígitos)";
      }
    }

    if (id === 'chk-id' && val.length < 5) {
      isValid = false;
      if (feedbackEl) feedbackEl.textContent = "Ingresa un documento de identidad válido (mínimo 5 caracteres)";
    }

    if (id === 'chk-address' && val.length < 6) {
      isValid = false;
      if (feedbackEl) feedbackEl.textContent = "Ingresa la dirección detallada completa";
    }
  }

  // Aplicar clases visuales
  if (isValid) {
    inputEl.classList.remove('is-invalid');
    inputEl.classList.add('is-valid');
    if (feedbackEl) feedbackEl.style.display = 'none';
  } else {
    inputEl.classList.remove('is-valid');
    inputEl.classList.add('is-invalid');
    if (feedbackEl) feedbackEl.style.display = 'block';
  }

  return isValid;
}

// --- Autoguardado e Inicialización de Inputs ---
function initFormState() {
  // Cargar valores guardados en localStorage
  formInputs.forEach(inputId => {
    const saved = localStorage.getItem(LSTORE_PREFIX + inputId);
    const field = document.getElementById(inputId);
    if (field && saved !== null) {
      field.value = saved;
    }
  });

  // Listener para autoguardado y validación interactiva al escribir/cambiar
  formInputs.forEach(inputId => {
    const field = document.getElementById(inputId);
    if (field) {
      const handleInput = () => {
        localStorage.setItem(LSTORE_PREFIX + inputId, field.value);
        validateField(field);
      };
      field.addEventListener('input', handleInput);
      field.addEventListener('change', handleInput);
      field.addEventListener('blur', () => validateField(field));
    }
  });

  // Configurar comportamiento inteligente del Teléfono de Colombia
  if (el.fPhone) {
    el.fPhone.addEventListener('focus', () => {
      if (el.fCountry.value === 'Colombia' && !el.fPhone.value) {
        // En Colombia, los celulares empiezan por 3. Podemos dejarlo en blanco o guiar
      }
    });
  }
}

function updateGatewayLogos(country) {
  const container = document.getElementById('gateway-logos-container');
  if (!container) return;

  const isColombia = country === 'Colombia';
  
  const visaLogo = 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg';
  const mastercardLogo = 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
  const amexLogo = 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg';
  const pseLogo = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Logo_PSE.svg';
  const nequiLogo = 'https://logodownload.org/wp-content/uploads/2020/09/nequi-logo.png';
  const daviplataLogo = 'https://www.agrocampo.com.co/media/wysiwyg/Daviplata.png';

  let html = `
    <img src="${visaLogo}" alt="Visa" style="height: 24px;">
    <img src="${mastercardLogo}" alt="Mastercard" style="height: 24px;">
    <img src="${amexLogo}" alt="American Express" style="height: 18px;">
  `;

  if (isColombia) {
    html += `
      <img src="${pseLogo}" alt="PSE" style="height: 28px;">
      <img src="${nequiLogo}" alt="Nequi" style="height: 24px;">
      <img src="${daviplataLogo}" alt="Daviplata" style="height: 24px;">
    `;
  }

  container.innerHTML = html;
}

// --- Manejo Dinámico de Ubicaciones en Colombia ---
function setupColombiaDropdowns() {
  const departments = Object.keys(DEPARTAMENTOS_COLOMBIA).sort();

  if (el.fStateSelect) {
    el.fStateSelect.innerHTML = '<option value="">Selecciona Departamento...</option>';
    departments.forEach(dept => {
      const opt = document.createElement('option');
      opt.value = dept;
      opt.textContent = dept;
      el.fStateSelect.appendChild(opt);
    });

    el.fStateSelect.onchange = () => {
      const dept = el.fStateSelect.value;
      localStorage.setItem(LSTORE_PREFIX + 'chk-state-select', dept);
      
      if (el.fCitySelect) {
        el.fCitySelect.innerHTML = '<option value="">Selecciona Ciudad...</option>';
        if (dept && DEPARTAMENTOS_COLOMBIA[dept]) {
          const cities = DEPARTAMENTOS_COLOMBIA[dept].sort();
          cities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            el.fCitySelect.appendChild(opt);
          });
        }
      }
      validateField(el.fStateSelect);
      if (el.fCitySelect) validateField(el.fCitySelect);
    };
  }

  if (el.fCitySelect) {
    el.fCitySelect.onchange = () => {
      localStorage.setItem(LSTORE_PREFIX + 'chk-city-select', el.fCitySelect.value);
      validateField(el.fCitySelect);
    };
  }


  // Manejo del Cambio de País
  if (el.fCountry) {
    el.fCountry.onchange = () => {
      const country = el.fCountry.value;
      localStorage.setItem(LSTORE_PREFIX + 'chk-country', country);

      const wrapperSelectState = document.getElementById('state-select-wrapper');
      const wrapperSelectCity = document.getElementById('city-select-wrapper');
      const wrapperTextState = document.getElementById('state-text-wrapper');
      const wrapperTextCity = document.getElementById('city-text-wrapper');

      if (country === 'Colombia') {
        // Mostrar selectores
        if (wrapperSelectState) wrapperSelectState.style.display = 'flex';
        if (wrapperSelectCity) wrapperSelectCity.style.display = 'flex';
        if (wrapperTextState) wrapperTextState.style.display = 'none';
        if (wrapperTextCity) wrapperTextCity.style.display = 'none';

        if (el.fStateSelect) el.fStateSelect.setAttribute('required', '');
        if (el.fCitySelect) el.fCitySelect.setAttribute('required', '');
        if (el.fStateText) el.fStateText.removeAttribute('required');
        if (el.fCityText) el.fCityText.removeAttribute('required');
      } else {
        // Mostrar entradas de texto
        if (wrapperSelectState) wrapperSelectState.style.display = 'none';
        if (wrapperSelectCity) wrapperSelectCity.style.display = 'none';
        if (wrapperTextState) wrapperTextState.style.display = 'flex';
        if (wrapperTextCity) wrapperTextCity.style.display = 'flex';

        if (el.fStateSelect) el.fStateSelect.removeAttribute('required');
        if (el.fCitySelect) el.fCitySelect.removeAttribute('required');
        if (el.fStateText) el.fStateText.setAttribute('required', '');
        if (el.fCityText) el.fCityText.setAttribute('required', '');
      }

      // Actualizar placeholder del teléfono y feedback
      if (el.fPhone) {
        const phonePlaceholders = {
          "Colombia": "Ej: 3136374267 (+57)",
          "México": "Ej: 5512345678 (+52)",
          "España": "Ej: 612345678 (+34)",
          "Chile": "Ej: 912345678 (+56)",
          "Argentina": "Ej: 1112345678 (+54)",
          "Perú": "Ej: 912345678 (+51)",
          "El Salvador": "Ej: 61234567 (+503)",
          "Guatemala": "Ej: 51234567 (+502)",
          "Costa Rica": "Ej: 81234567 (+506)",
          "Honduras": "Ej: 91234567 (+504)",
          "Nicaragua": "Ej: 81234567 (+505)",
          "Ecuador": "Ej: 912345678 (+593)",
          "Bolivia": "Ej: 71234567 (+591)",
          "Paraguay": "Ej: 912345678 (+595)",
          "Uruguay": "Ej: 91234567 (+598)",
          "Venezuela": "Ej: 4123456789 (+58)",
          "Rep. Dominicana": "Ej: 8091234567 (+1)",
          "USA": "Ej: 2025550143 (+1)"
        };
        el.fPhone.placeholder = phonePlaceholders[country] || "Ej: +503 61234567 (mínimo 6 dígitos)";
      }

      // Re-validar teléfono y campos de locación al cambiar de país
      validateField(el.fPhone);

      // Actualizar logos de pasarela de pago dinámicamente
      updateGatewayLogos(country);
    };
  }

  // Carga inicial tras restauración de localstorage
  setTimeout(() => {
    if (el.fCountry) {
      el.fCountry.dispatchEvent(new Event('change'));
      
      // Si el departamento estaba guardado, recargar municipios y seleccionar
      const savedDept = localStorage.getItem(LSTORE_PREFIX + 'chk-state-select');
      if (savedDept && el.fStateSelect) {
        el.fStateSelect.value = savedDept;
        el.fStateSelect.dispatchEvent(new Event('change'));
        
        const savedCity = localStorage.getItem(LSTORE_PREFIX + 'chk-city-select');
        if (savedCity && el.fCitySelect) {
          el.fCitySelect.value = savedCity;
          el.fCitySelect.dispatchEvent(new Event('change'));
        }
      }
    }
  }, 100);
}

// --- Validación y Navegación de Pasos ---
function handleGoToStep2() {
  const fields = [el.fName, el.fEmail, el.fPhone, el.fId];
  let stepValid = true;
  let firstInvalid = null;

  fields.forEach(field => {
    if (!validateField(field)) {
      stepValid = false;
      if (!firstInvalid) firstInvalid = field;
    }
  });

  if (stepValid) {
    showStep(2);
  } else if (firstInvalid) {
    firstInvalid.focus();
  }
}

function handleGoToStep3() {
  // Primero validar Paso 1 por si acaso
  const fieldsStep1 = [el.fName, el.fEmail, el.fPhone, el.fId];
  let isStep1Valid = true;
  fieldsStep1.forEach(f => { if (!validateField(f)) isStep1Valid = false; });
  if (!isStep1Valid) {
    showStep(1);
    return;
  }

  // Validar campos de Paso 2
  const isColombia = el.fCountry.value === 'Colombia';
  const fieldsStep2 = [el.fAddress, el.fNeighborhood];
  
  if (isColombia) {
    fieldsStep2.push(el.fStateSelect, el.fCitySelect);
  } else {
    fieldsStep2.push(el.fStateText, el.fCityText);
  }

  let step2Valid = true;
  let firstInvalid = null;

  fieldsStep2.forEach(field => {
    if (!validateField(field)) {
      step2Valid = false;
      if (!firstInvalid) firstInvalid = field;
    }
  });

  if (step2Valid) {
    showStep(3);
  } else if (firstInvalid) {
    firstInvalid.focus();
  }
}

// --- Vinculación de Botones ---
if (el.btnToStep2) el.btnToStep2.onclick = handleGoToStep2;
if (el.btnToStep3) el.btnToStep3.onclick = handleGoToStep3;
if (el.btnBackToStep1) el.btnBackToStep1.onclick = () => showStep(1);
if (el.btnBackToStep2) el.btnBackToStep2.onclick = () => showStep(2);

// --- Manejo del Estado de Autenticación de Firebase (Autocompletado Opcional) ---
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  console.log('[PeLoot] Estado Auth:', user ? user.email : 'Modo Invitado Activo');

  // Si está autenticado con Google, autocompletar pero permitir cambios
  if (user) {
    if (el.fName && !el.fName.value) {
      el.fName.value = user.displayName || '';
      localStorage.setItem(LSTORE_PREFIX + 'chk-name', user.displayName || '');
      validateField(el.fName);
    }
    if (el.fEmail && !el.fEmail.value) {
      el.fEmail.value = user.email || '';
      localStorage.setItem(LSTORE_PREFIX + 'chk-email', user.email || '');
      validateField(el.fEmail);
    }

    // Opcional: Sincronizar carrito desde Firebase a Local si el local está vacío
    try {
      const s = await getDoc(doc(db, 'carts', user.uid));
      if (s.exists()) {
        const fbItems = s.data().items || [];
        const localRaw = localStorage.getItem(CART_KEY);
        if (!localRaw || JSON.parse(localRaw).length === 0) {
          if (fbItems.length > 0) {
            console.log('[PeLoot] Sincronizando carrito desde nube...');
            localStorage.setItem(CART_KEY, JSON.stringify(fbItems));
            renderSummary();
          }
        }
      }
    } catch (e) { console.error(e); }
  }

  renderSummary();
});

// --- CONFIRMACIÓN Y CREACIÓN DEL PEDIDO (Firestore & Mercado Pago) ---
async function confirmOrder() {
  console.log('[PeLoot] Iniciando confirmación de pedido...');

  // 1. Validar todos los pasos antes de proceder
  const fields1 = [el.fName, el.fEmail, el.fPhone, el.fId];
  let isStep1Valid = true;
  fields1.forEach(f => { if (!validateField(f)) isStep1Valid = false; });
  if (!isStep1Valid) { showStep(1); return; }

  const isColombia = el.fCountry.value === 'Colombia';
  const fields2 = [el.fAddress, el.fNeighborhood];
  if (isColombia) {
    fields2.push(el.fStateSelect, el.fCitySelect);
  } else {
    fields2.push(el.fStateText, el.fCityText);
  }
  let step2Valid = true;
  fields2.forEach(f => { if (!validateField(f)) step2Valid = false; });
  if (!step2Valid) { showStep(2); return; }

  // 2. Cargar carrito local
  const raw = localStorage.getItem(CART_KEY);
  const items = raw ? JSON.parse(raw) : [];
  
  if (items.length === 0) {
    alert('Tu carrito está vacío. Agrega algún PeLoot para continuar.');
    window.location.href = 'products.html';
    return;
  }

  // 3. UI Feedback de Procesamiento
  const updateLoadingState = (btn) => {
    if (!btn) return;
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = `
      <span style="display: flex; align-items: center; gap: 10px; justify-content: center;">
        <svg class="spinner" width="20" height="20" viewBox="0 0 50 50" style="animation: rotate 2s linear infinite; stroke: currentColor; fill: none;">
          <circle cx="25" cy="25" r="20" stroke-width="5" stroke-dasharray="90, 150" stroke-linecap="round"></circle>
        </svg>
        Procesando tu PeLoot... 🧸
      </span>
    `;
  };

  updateLoadingState(el.btnConfirm);
  if (el.btnMobileAction) updateLoadingState(el.btnMobileAction);

  try {
    const mainItem = items[0];
    const mainPrice = Number(String(mainItem.price || mainItem.priceCOP || 0).replace(/[^\d]/g, ''));
    
    // Calcular Total Robusto en COP
    let subtotalCOP = 0;
    for (const item of items) {
      const itemPrice = Number(String(item.price || item.priceCOP || 0).replace(/[^\d]/g, '')) || 0;
      const itemQty = Math.max(1, Number(item.qty) || 1);
      subtotalCOP += itemPrice * itemQty;
    }
    
    let discountPercent = 0;
    const savedCoupon = localStorage.getItem('peloot_applied_coupon');
    if (savedCoupon) {
      const couponData = await validateCoupon(savedCoupon, currentUser || {});
      if (couponData && couponData.valid) {
        discountPercent = Number(couponData.discount) || 0;
      }
    }
    const finalTotal = Math.round(subtotalCOP * (1 - discountPercent / 100));

    // Determinar Departamento y Ciudad exactos según el país
    const stateValue = isColombia ? el.fStateSelect.value : el.fStateText.value.trim();
    const cityValue = isColombia ? el.fCitySelect.value : el.fCityText.value.trim();

    // Formatear el teléfono de manera internacional y robusta según el país
    const COUNTRY_DIAL_CODES = {
      "Colombia": "57",
      "México": "52",
      "España": "34",
      "Chile": "56",
      "Argentina": "54",
      "Perú": "51",
      "El Salvador": "503",
      "Guatemala": "502",
      "Costa Rica": "506",
      "Honduras": "504",
      "Nicaragua": "505",
      "Ecuador": "593",
      "Bolivia": "591",
      "Paraguay": "595",
      "Uruguay": "598",
      "Venezuela": "58",
      "Rep. Dominicana": "1",
      "USA": "1"
    };
    const rawPhone = el.fPhone.value.trim();
    let cleanPhone = rawPhone.replace(/[^\d]/g, '');
    const dialCode = COUNTRY_DIAL_CODES[el.fCountry.value];
    if (dialCode && !cleanPhone.startsWith(dialCode)) {
      cleanPhone = dialCode + cleanPhone;
    }

    // Estructurar Datos del Pedido (Soporta Invitado y Logueado)
    const orderData = {
      userId: currentUser ? currentUser.uid : `guest_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      isGuest: !currentUser,
      fullName: el.fName.value.trim(),
      email: el.fEmail.value.trim(),
      phone: cleanPhone,
      cedula: el.fId.value.trim(),
      address: el.fAddress.value.trim(),
      neighborhood: el.fNeighborhood.value.trim(),
      city: cityValue,
      department: stateValue,
      zip: el.fZip.value.trim() || '',
      country: el.fCountry.value,
      notes: el.fNotes.value.trim() || '',
      
      // Datos de Producto Legacy (para compatibilidad de base de datos)
      productId: mainItem.id,
      productName: mainItem.name,
      productPrice: mainPrice,
      qty: mainItem.qty || 1,
      
      // Items Detallados de la Compra
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
      platform: 'web_v4_step',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // 4. Guardar pedido en Firestore
    const docRef = await addDoc(collection(db, 'orders'), orderData);
    console.log('[PeLoot] ✅ Pedido guardado en DB con ID:', docRef.id);

    // 5. Generar Enlace Seguro de Mercado Pago
    let paymentUrl = '';
    try {
      console.log('[PeLoot] Generando preferencia en Mercado Pago...');
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
        console.log('[PeLoot] ✅ Enlace de pago Mercado Pago:', paymentUrl);
        // Actualizar URL de pago en el documento
        await updateDoc(doc(db, 'orders', docRef.id), { paymentUrl });
      } else {
        console.error('[PeLoot] Error al recibir preferencia:', await mpRes.text());
      }
    } catch (err) {
      console.error('[PeLoot] Excepción al invocar preferencia:', err);
    }

    // 6. ÉXITO: Limpiar Carrito, Cupón y Datos de localStorage
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem('peloot_applied_coupon');
    formInputs.forEach(inputId => localStorage.removeItem(LSTORE_PREFIX + inputId));

    if (currentUser) {
      try {
        await saveCartToFirebase(currentUser.uid, []);
        console.log('[PeLoot] Carrito de Firebase sincronizado a vacío.');
      } catch (err) { console.error('[PeLoot] Error vaciando carrito en nube:', err); }
    }

    // Feedback final
    const successMsg = '¡Pedido Listo! 🎉';
    el.btnConfirm.style.background = 'var(--accent-green)';
    el.btnConfirm.innerHTML = successMsg;
    if (el.btnMobileAction) {
      el.btnMobileAction.style.background = 'var(--accent-green)';
      el.btnMobileAction.innerHTML = successMsg;
    }

    // Redirección
    setTimeout(() => {
      const nextUrl = paymentUrl 
        ? `success?order_id=${docRef.id}&payment_url=${encodeURIComponent(paymentUrl)}`
        : `success?order_id=${docRef.id}`;
      window.location.href = nextUrl;
    }, 800);

  } catch (error) {
    console.error('[PeLoot] Error al procesar confirmación:', error);
    
    // UI Feedback de Error
    const resetBtn = (btn, text) => {
      if (!btn) return;
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.background = '#EF4444';
      btn.innerHTML = text;
    };

    resetBtn(el.btnConfirm, 'Error al guardar. Reintentar 🔄');
    if (el.btnMobileAction) resetBtn(el.btnMobileAction, 'Reintentar compra 🔄');

    alert(`Ocurrió un error al guardar tu pedido:\n${error.message}\n\nPor favor intenta de nuevo. Si persiste, contacta a Soporte PeLoot.`);
  }
}

// --- Inicialización ---
initFormState();
setupColombiaDropdowns();
renderSummary();
showStep(1);

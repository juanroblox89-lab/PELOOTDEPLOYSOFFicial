// store-service.js — PeLoot
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const DEFAULT_SETTINGS = {
  activeCoupon: 'PELOOT10',
  discountPercent: 5,
  exchangeRates: {
    USD: 1,
    COP: 4000,
    GTQ: 7.8,
    CLP: 950,
    PEN: 3.7,
    CRC: 510,
    MXN: 17,
    ARS: 900,
    VES: 36,
    UYU: 39,
    HNL: 24.5,
    NIO: 36.5,
    PYG: 7300,
    BOB: 6.9,
    DOP: 59
  }
};

let cachedSettings = DEFAULT_SETTINGS;
let cachedSettingsTime = 0;

// ---- CONFIGURACIÓN GLOBAL ----
export async function getGlobalSettings() {
  // Si ya tenemos cache y tiene menos de 5 minutos, la usamos
  if (cachedSettings && cachedSettingsTime !== 0 && Date.now() - cachedSettingsTime < 5 * 60 * 1000) {
    return cachedSettings;
  }
  try {
    const settingsRef = doc(db, 'settings', 'global');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...snap.data() };
      const dbRates = snap.data().exchangeRates || {};
      const cleanDbRates = {};
      Object.keys(dbRates).forEach(k => {
        const val = Number(dbRates[k]);
        if (val > 0) {
          cleanDbRates[k] = val;
        }
      });
      cachedSettings.exchangeRates = {
        ...DEFAULT_SETTINGS.exchangeRates,
        ...cleanDbRates
      };
      cachedSettingsTime = Date.now();
      return cachedSettings;
    }
  } catch (err) {
    console.error('[PeLoot] Error fetching global settings:', err);
  }
  return cachedSettings || DEFAULT_SETTINGS;
}

// ---- MONEDAS ----
export const CURRENCIES = [
  { code: 'COP', symbol: '$', name: 'Peso Colombiano', flag: '🇨🇴' },
  { code: 'USD', symbol: '$', name: 'Dólar (USD)', flag: '🇺🇸' },
  { code: 'GTQ', symbol: 'Q', name: 'Quetzal Guatemala', flag: '🇬🇹' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno', flag: '🇨🇱' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano', flag: '🇵🇪' },
  { code: 'CRC', symbol: '₡', name: 'Colón Costarricense', flag: '🇨🇷' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano', flag: '🇲🇽' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino', flag: '🇦🇷' },
  { code: 'VES', symbol: 'Bs', name: 'Bolívar Venezolano', flag: '🇻🇪' },
  { code: 'UYU', symbol: '$U', name: 'Peso Uruguayo', flag: '🇺🇾' },
  { code: 'HNL', symbol: 'L', name: 'Lempira Honduras', flag: '🇭🇳' },
  { code: 'NIO', symbol: 'C$', name: 'Córdoba Nicaragua', flag: '🇳🇮' },
  { code: 'PYG', symbol: '₲', name: 'Guaraní Paraguay', flag: '🇵🇾' },
  { code: 'BOB', symbol: 'Bs', name: 'Boliviano Bolivia', flag: '🇧🇴' },
  { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano', flag: '🇩🇴' }
];

export function convertPrice(amount, targetCurrency, rates, sourceCurrency = 'COP') {
  if (!rates) return amount;
  
  const sourceRate = rates[sourceCurrency] || 1;
  const targetRate = rates[targetCurrency] || 1;
  
  // Normalizamos a USD y luego a la moneda destino
  return (amount / sourceRate) * targetRate;
}

// ---- CUPONES ----
export async function validateCoupon(code, userProfile) {
  const settings = await getGlobalSettings();
  if (!userProfile || !userProfile.uid) {
    return { valid: false, message: 'Inicia sesión para usar cupones' };
  }
  if (code.toUpperCase() !== settings.activeCoupon.toUpperCase()) {
    return { valid: false, message: 'Código inválido' };
  }
  if (userProfile.usedCoupon) {
    return { valid: false, message: 'Ya has usado este código' };
  }
  return { 
    valid: true, 
    discount: settings.discountPercent,
    message: `¡Cupón aplicado! -${settings.discountPercent}%`
  };
}

// ---- LÓGICA DE PAGO (REDIRECCIÓN) ----
export async function getPaymentLink(userProfile) {
  const settings = await getGlobalSettings();
  const isFirstBuyer = (userProfile.orderCount || 0) === 0;
  return isFirstBuyer ? settings.firstBuyerLink : settings.regularBuyerLink;
}

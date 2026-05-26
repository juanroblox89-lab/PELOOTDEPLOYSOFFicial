/**
 * PeLoot — Currency Converter
 * Uses exchangerate.host (free, no API key required)
 * Base currency: COP
 */

const CACHE_KEY = 'peloot_rates';
const CACHE_TTL = 1000 * 60 * 60 * 3; // 3 hours

async function getRates() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { ts, rates } = JSON.parse(cached);
    if (Date.now() - ts < CACHE_TTL) return rates;
  }
  try {
    const res = await fetch('https://api.exchangerate.host/latest?base=COP&symbols=USD,EUR,MXN,BRL,ARS,GBP,CLP,PEN');
    const data = await res.json();
    if (data.rates) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates: data.rates }));
      return data.rates;
    }
  } catch (e) {
    console.warn('Currency fetch failed:', e);
  }
  return null;
}

/**
 * Renders a currency widget into `containerId` for a given COP price.
 * @param {string} containerId - ID of the DOM element to inject into
 * @param {number} copPrice - Price in COP
 */
export async function renderCurrencyWidget(containerId, copPrice) {
  const el = document.getElementById(containerId);
  if (!el || !copPrice) return;

  el.innerHTML = `<span class="currency-loading">Cargando conversiones...</span>`;
  el.className = 'currency-widget';

  const rates = await getRates();
  if (!rates) {
    el.innerHTML = '';
    return;
  }

  const currencies = [
    { code: 'USD', flag: '🇺🇸', label: 'USD' },
    { code: 'EUR', flag: '🇪🇺', label: 'EUR' },
    { code: 'MXN', flag: '🇲🇽', label: 'MXN' },
    { code: 'BRL', flag: '🇧🇷', label: 'BRL' },
    { code: 'ARS', flag: '🇦🇷', label: 'ARS' },
    { code: 'GBP', flag: '🇬🇧', label: 'GBP' },
  ];

  const items = currencies
    .filter(c => rates[c.code])
    .map(c => {
      const val = (copPrice * rates[c.code]).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      return `<span class="currency-item">${c.flag} ${c.label} ${val}</span>`;
    })
    .join('');

  el.innerHTML = `
    <span class="currency-label">≈ Aprox. en:</span>
    <div class="currency-items">${items}</div>
    <span class="currency-note">Referencial · Precio base en COP</span>`;
}

# 🛡️ Protocolo de Despliegue — PeLoot
**Versión:** 2.1 (Mayo 2026)
**Objetivo:** Garantizar que cada cambio en el código respete la identidad visual Premium Gaming (v2.1), la navegabilidad móvil extrema, el funcionamiento de todos los SVGs y el cumplimiento legal estricto.

---

## 1. 🎨 Identidad Visual — Paleta "Epic Loot" (v2.0)

La paleta oficial ha sido reconstruida para una estética Premium Gaming y TikTok-native. Dominan los fondos oscuros, profundos y acentos neón.

| Token CSS | Valor | Uso |
|-----------|-------|-----|
| `--bg-main` | `#0f1117` | Fondo principal oscuro profundo |
| `--bg-card` | `#151922` | Fondo de tarjetas y secciones (Glassmorphism) |
| `--primary-yellow` | `#FFD93D` | PeLoot Yellow — CTA principal, botones compra |
| `--accent-purple` | `#8B5CF6` | Glow neón morado, acentos secundarios |
| `--accent-blue` | `#3B82F6` | Glow neón azul, enlaces, información |
| `--text-white` | `#FFFFFF` | Títulos y textos importantes (Contraste alto) |
| `--text-gray` | `#94A3B8` | Texto secundario y descripciones |
| `--danger-red` | `#EF4444` | Alertas y eliminación |

**Estética Visual:**
- **Depth:** Uso de `box-shadow` suaves y múltiples para capas.
- **Glassmorphism:** `backdrop-filter: blur(12px)` en tarjetas y navbar.
- **Neon Glow:** Filtros `drop-shadow` y `box-shadow` con colores de acento.
- **Gradients:** `linear-gradient(135deg, #8B5CF6, #3B82F6)` para elementos destacados.

> ⚠️ **Atención:** Eliminar cualquier rastro de fondos rosados claros (#FFF9F5) o estilos "pastel". Todo debe respirar gaming premium.

---

## 2. 🖼️ Reglas de SVGs — Verificación Obligatoria

### ❗ Regla principal
**Todo SVG que se añada o modifique DEBE verificarse visualmente antes de considerar la implementación completa.**

### Problemas conocidos y soluciones

| SVG | Problema detectado | Solución aplicada |
|-----|--------------------|-------------------|
| `.footer-whatsapp svg` | `fill="white"` invisible sobre fondo claro | CSS: `.footer-whatsapp svg { fill: white !important }` + fondo verde sólido `#25D366` |
| SVGs de outline (Instagram) | `stroke="currentColor"` requiere `color` en el padre | Asegurar `color` CSS en `.social-instagram` |
| SVGs de fill (TikTok, WhatsApp) | `fill` inline sobrescribe CSS sin `!important` | Usar `fill="currentColor"` en HTML + `color` en CSS, o `!important` en CSS |

### Checklist de SVGs — Ejecutar antes de cada deploy

**SVGs inline (en HTML) — verificar que sean visibles:**
- [ ] **Carrito** `header nav .cart-icon svg` — `stroke="white"` sobre header azul ✓
- [ ] **Flecha volver** `.back-btn svg` — `stroke="currentColor"` hereda color del botón ✓
- [ ] **WhatsApp footer** `.footer-whatsapp svg` — `fill: white !important` en CSS, fondo verde sólido ✓
- [ ] **WhatsApp flotante** `.whatsapp-float svg` — fondo verde, fill white ✓
- [ ] **WhatsApp botón producto** `#whatsappBtn svg` — fondo verde, fill white ✓
- [ ] **Instagram** `.social-instagram svg` — `stroke="currentColor"`, color heredado del botón ✓
- [ ] **TikTok** `.social-tiktok svg` — `fill="currentColor"`, color heredado del botón ✓
- [ ] **Camión envío** `.shipping svg` — `stroke="currentColor"` ✓
- [ ] **Estrellas rating** `.stars svg` ×5 — `fill="#FFD93D"` inline ✓
- [ ] **Lupa buscador** `.search-box button svg` — `stroke="currentColor"` ✓

**Assets de imagen — verificar que no estén rotos:**
- [ ] `assets/images/logo/peloot.png`
- [ ] `assets/images/logo/favicon.png`
- [ ] `assets/images/icons/bloxfruits.png`
- [ ] `assets/images/icons/clashroyale.png`
- [ ] `assets/images/icons/pvz.png`
- [ ] `assets/images/icons/fnaf.png`
- [ ] `assets/images/icons/free-shipping.png`
- [ ] `assets/images/coming-soon/roblox.png`
- [ ] `assets/images/coming-soon/minecraft.png`
- [ ] `assets/images/coming-soon/more.png`

### Script de verificación automática (pegar en DevTools → Console)
```javascript
// Verificar SVGs invisibles (sin dimensiones)
console.group('🔍 SVGs invisibles');
document.querySelectorAll('svg').forEach((s, i) => {
  const b = s.getBoundingClientRect();
  if (b.width === 0 || b.height === 0)
    console.warn(`SVG #${i} invisible:`, s.closest('[class]')?.className, s);
});
console.groupEnd();

// Verificar imágenes rotas
console.group('🖼️ Imágenes rotas');
document.querySelectorAll('img').forEach(img => {
  if (!img.complete || img.naturalWidth === 0)
    console.warn('Imagen rota:', img.src);
});
console.groupEnd();

// Verificar SVGs con fill/stroke "white" que podrían ser invisibles
console.group('⚠️ SVGs con fill/stroke white — verificar contraste');
document.querySelectorAll('svg[fill="white"], svg[stroke="white"]').forEach((s, i) => {
  const bg = window.getComputedStyle(s.closest('a, button, div') || s).background;
  console.info(`SVG white #${i} — fondo padre:`, bg.substring(0, 60));
});
console.groupEnd();
```

### Regla de fill/stroke
- ✅ Usar `fill="currentColor"` + `color` en CSS → más mantenible
- ✅ Si el fondo del padre es oscuro/coloreado → `fill="white"` está bien
- ❌ Nunca usar `fill="white"` si el fondo del padre es claro o transparente

---

## 3. ✅ Regla de Verificación Post-Implementación

**Después de CADA implementación (sea cual sea), se debe verificar:**

1. **Visual desktop** — El elemento se ve correctamente en pantalla ancha (~1280px)
2. **Visual mobile** — El elemento se ve correctamente en ~375px (usar DevTools)
3. **SVGs** — Ejecutar el script de verificación de la sección 2
4. **Links** — Los links/botones funcionan y apuntan a las URLs correctas
5. **Consola** — Sin errores en DevTools → Console
6. **Paleta** — Los colores usados respetan la paleta oficial de la sección 1
7. **Cuadre con el código** — La clase CSS nueva existe antes de usarla en HTML, y no hay conflictos con clases ya existentes
8. **Iconos y Emojis (Mojibake)** — Verificar que no haya "iconos rotos" o caracteres extraños (ej. `â†’` en lugar de `→`, o `ðŸŽ®` en lugar de `🎮`) causados por problemas de codificación.

> 💡 **REGLA DE ORO DE DEBUGGING:** Siempre que algo requiera más de 2 intentos para solucionarse, **DETENTE**. Haz un análisis profundo para identificar la raíz real del problema en lugar de intentar parches rápidos.

> ⚠️ **ERROR CONOCIDO (BOM y Codificación):** Si se usan scripts de reemplazo masivo (ej. PowerShell), se puede inyectar un BOM (`\uFEFF`) al inicio del archivo o corromper emojis a Windows-1252 (Mojibake) si no se especifica `-Encoding UTF8` explícitamente al leer y escribir. NUNCA uses `Get-Content` o reemplazos masivos sin forzar UTF-8. Esto rompe TODO el renderizado de emojis y tildes en el navegador ("caracteres cursed").

> 💡 Si se detecta algo que no funciona o no cuadra visualmente, se documenta aquí en el MD antes de pasar a la siguiente tarea.

---

## 4. 📱 UX/UI & Social Media (Mobile First)

* **Responsividad:** Ningún elemento debe desbordar el ancho de pantalla en móviles.
* **Mínimo táctil:** Botones de acción (WhatsApp, Redes, Carrito) con tamaño mínimo de **44×44px** (`min-height: 44px; min-width: 44px`).
* **Hamburger menu:** Activado en ≤768px — todos los `<nav>` deben tener `id="main-nav"` y el botón `class="hamburger" id="hamburger"`.
* **Botones sticky en producto:** Los botones de compra en `product.html` quedan fijos en la parte inferior del teléfono (`.product-buttons` con `position: fixed` en mobile).

### Redes Sociales — Presencia oficial

| Red | URL | Estado |
|-----|-----|--------|
| WhatsApp | `https://wa.me/573136374267` | ✅ Flotante + footer + botón producto |
| Instagram | `https://www.instagram.com/peloot.plushies/` | ✅ Footer todas las páginas (SVG inline) |
| TikTok | `https://www.tiktok.com/@peloot.accesorios` | ✅ Footer todas las páginas (SVG inline) |

---

## 5. ⚖️ Base Legal y Garantías (Footer Check)

* **Política de Envíos:** Confirmar "Envío GRATIS a todo el mundo" y entrega de 10-30 días calendario.
* **Devoluciones:** "30 días de garantía sin preguntas". Requisito de evidencia en las primeras 48h.
* **Privacidad:** Solo recolectamos Nombre, WhatsApp y Dirección. Prohibida la venta a terceros.
* **Número oficial:** El botón de WhatsApp DEBE dirigir siempre a **+57 313 637 4267** (`wa.me/573136374267`).

---

## 6. 🛠️ Checklist de Calidad Técnica — Pre-deploy

- [ ] `js/shipping.js` existe y calcula fechas dinámicas correctamente (hoy + 10/30 días)
- [ ] No aparece el número falso `573216499890` en ningún archivo (`grep -r "573216499890" .`)
- [ ] FNAF aparece como opción en el `<select>` de filtros de `products.html`
- [ ] El carrito **no** hace `location.reload()` — muestra toast animado `#peloot-toast`
- [ ] El CSS no tiene propiedades flotando fuera de un selector (bug clásico: `background:` sin `{` previo)
- [ ] **Mundialización:** Verificar que todo el contenido hable a nivel "mundial" (ej: "Envío a todo el mundo", no solo "Colombia") para que todos los usuarios se sientan incluidos.
- [ ] Todas las páginas tienen `<meta name="description">` único y descriptivo
- [ ] Todas las páginas tienen `id="main-nav"` en el `<nav>` y `id="hamburger"` en el botón
- [ ] El footer `class="footer-cute"` aparece en las 4 páginas principales
- [ ] Los botones de Instagram y TikTok tienen `aria-label` descriptivo
- [ ] Las fechas de entrega en `product.html` muestran fechas del año actual (no hardcodeadas)
- [ ] Google Fonts Inter está cargado en todas las páginas
- [ ] **Script de SVGs ejecutado** — 0 warnings en consola
- [ ] **Verificación post-implementación** realizada (sección 3)
- [ ] **Emojis funcionales** revisados — cada emoji de acción/UI tiene su SVG (sección 9)

---

## 9. 🖼️ Regla: Cada Emoji Funcional Debe Tener su SVG

### ¿Por qué?

Los emojis se renderizan de forma **diferente según el sistema operativo y el dispositivo**:
- 📦 en Windows se ve diferente que en iPhone, Android o Mac
- Algunos emojis no existen en versiones antiguas de Android
- Los emojis no escalan bien en pantallas de alta resolución (4K, Retina)
- Los SVGs son **universales, escalables y controlables con CSS**

### Regla

> **Todo emoji que actúe como ícono funcional** (botón, badge, indicador de estado, icono de sección) **DEBE tener un SVG equivalente** en lugar del emoji o junto a él.
>
> Los emojis en **texto de contenido** (descripciones, títulos, mensajes) son aceptables.

### Inventario de Emojis en el Sitio

| Emoji | Uso actual | Ubicación | SVG asignado | Estado |
|-------|-----------|-----------|-------------|--------|
| 🛒 | Ícono carrito header | Todas las páginas | ✅ SVG inline (cart path) | Implementado |
| ← | Botón volver | Todas las páginas | ✅ SVG inline (arrow path) | Implementado |
| 🔍 | Botón buscar | `products.html` | ✅ SVG inline (circle + line) | Implementado |
| ⭐ | Estrellas rating | `product.html` | ✅ SVG inline (polygon) | Implementado |
| 🚚 | Envío gratis | `product.html`, top-bar | ✅ SVG inline (truck path) | Implementado |
| 🚚 | Badge "Envío Gratis" | `index.html` features | ✅ SVG inline (camión) `feature-icon--blue` | Implementado v1.5 |
| ⭐ | Badge "Calidad Premium" | `index.html` features | ✅ SVG inline (estrella) `feature-icon--yellow` | Implementado v1.5 |
| 🎮 | Badge "100% Gaming" | `index.html` features | ✅ SVG inline (gamepad) `feature-icon--purple` | Implementado v1.5 |
| 🛡️ | Badge "Compra Segura" | `index.html` features | ✅ SVG inline (escudo) `feature-icon--green` | Implementado v1.5 |
| 📞 | WhatsApp top-bar | Todas las páginas | ❌ Emoji puro | **Pendiente** |
| 🚚 | Top-bar texto | Todas las páginas | ❌ Emoji puro | **Pendiente** |
| 🔥 | Urgency banner | Todas las páginas | ❌ Emoji puro | Aceptable (texto) |
| 🍎 | Badge Blox Fruits | `index.html` | ❌ Emoji puro | Aceptable (decorativo) |
| ⚔️ | Badge Clash Royale | `index.html` | ❌ Emoji puro | Aceptable (decorativo) |
| 🌻 | Badge PvZ | `index.html` | ❌ Emoji puro | Aceptable (decorativo) |
| 🐻 | Badge FNAF | `index.html`, filtros | ❌ Emoji puro | Aceptable (decorativo) |
| 📦 | Envíos footer/legal | Footer | ❌ Emoji puro | Aceptable (texto) |
| ↩️ | Devoluciones footer | Footer | ❌ Emoji puro | Aceptable (texto) |
| 🔒 | Privacidad footer | Footer | ❌ Emoji puro | Aceptable (texto) |
| 🇨🇴 | Ubicación footer | Footer | ❌ Emoji puro | Aceptable (bandera) |
| ✅ | Toast carrito | `cart.js` (toast) | ✅ Carácter Unicode ✓ | OK (pequeño) |
| 👥 | Social proof viewers | `product.html` | ❌ Emoji puro | Aceptable (texto inline) |

### Prioridad de implementación

1. **Alta prioridad** (íconos de navegación/acción) — deben ser SVG:
   - 📞 en top-bar → reemplazar con SVG de teléfono/WhatsApp
   - 🚚 en top-bar → reemplazar con SVG de camión

2. **Media prioridad** (badges de categoría) — SVG opcional, emoji aceptable si es solo decorativo

3. **Baja prioridad** (texto de contenido) — emoji aceptable

### Cómo implementar un SVG en lugar de un emoji

```html
<!-- ❌ Antes: emoji puro -->
<div class="top-left">📞 WhatsApp: ...</div>

<!-- ✅ Después: SVG accesible -->
<div class="top-left">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <!-- path del ícono -->
  </svg>
  WhatsApp: ...
</div>
```

### Regla de aplicación

Cuando se añade cualquier elemento nuevo con emoji como ícono funcional:
1. Buscar el SVG equivalente (Heroicons, Bootstrap Icons, Simple Icons)
2. Insertarlo como SVG inline con `aria-hidden="true"`
3. Añadirlo al checklist de SVGs de la sección 2
4. Actualizar esta tabla con el estado `✅ Implementado`

---

## 7. 🚀 Secciones a preservar

* **"Próximos Lanzamientos"** (Roblox/Minecraft) — sección `coming-soon-section` en `index.html`
* **"1,000+ gamers felices"** — `.hero-trust` en `index.html`
* **Elfsight Reviews widget** — `div.elfsight-app-d5ee48c0...` en `product.html`
* **Contador carrito animado** — `#cart-count` con animación `pulse` en todos los headers

---

## 8. 📝 Registro de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Abril 2026 | Protocolo inicial |
| 1.1 | Abril 2026 | Adición de UX mobile y checklist técnico |
| 1.2 | Abril 2026 | Botones Instagram/TikTok, checklist SVGs, paleta documentada |
| 1.3 | Abril 2026 | Paleta actualizada a "Peluchesco" (más clara/cálida), fix WhatsApp SVG footer, regla de verificación post-implementación |
| 1.4 | Abril 2026 | Fix WhatsApp SVG path (compound path cursed → single clean path Simple Icons), fix botón flotante truncado, sección 9 "Emoji → SVG" con inventario completo |
| 1.5 | Mayo 2026 | Internacionalización (Colombia → mundial), banner marquee scroll infinito, widget conversión de monedas (currency.js), slider de imágenes en producto, botón 📱 Subir imágenes desde dispositivo → Firebase Storage, formulario de compra con 35+ países, modal de pago con paleta Peluchesco |
| 1.6 | Mayo 2026 | Fix `ref not defined` (imports ES module al inicio), reset global `-webkit-text-fill-color:currentColor` para textos visibles, clase `.btn-buynow` con SVG visible (excepción de paleta MP #009ee3 documentada), `header top: 36px` corregido, caché sessionStorage 5min en products.js, `loading=lazy` + `fetchpriority=high` en product cards, botón rojo × para quitar imagen en admin, auto-ID al subir imágenes |
| 1.7 | Mayo 2026 | Reconstrucción Total Checkout v3 (js/checkout.js robusto), alineación de esquema con base de datos histórica (fullName, cedula, neighborhood), endurecimiento de reglas de seguridad Firestore (validación de tipos y timestamps), sistema de diagnóstico proactivo para índices en Mis Pedidos, bypass temporal de ordenación para visualización inmediata, despliegue de banners de categoría 3D High-Fidelity. |
| 2.0 | Mayo 2026 | **Reconstrucción Visual Completa:** Estética "Epic Loot" Premium Gaming. Fondos oscuros (#0f1117), acentos neón, glassmorphism avanzado, collage de productos 3D y optimización mobile-first radical. |
| 2.2 | Mayo 2026 | **Automatización de Mercado Pago Colombia:** Acceso de administrador primario (`juanroblox89@gmail.com`) securizado en reglas de Firestore, solución de interpolaciones de cadena de pedidos e integración de credencial secreta en variables de entorno. |
| 2.3 | Mayo 2026 | **Pasarela Dinámica en Caliente y Webhooks de Auto-Confirmación:** Implementación de preferencias de pago 100% personalizadas sobre la marcha en `orders.html` y `tracking.html`. Integración del webhook `/api/mercadopago-webhook.js` para auto-confirmar pedidos en Firestore al instante. Publicación de políticas de pago en la página de ayuda/envíos. |
| 2.4 | Mayo 2026 | **Motor de Reseñas Google-Style y Carga de Fotos:** Lanzamiento del sistema de reviews individualizadas por producto. Permite a usuarios registrados y anónimos subir fotos reales (<5MB) con previsualización dinámica. Creado lightbox premium de visualización y securizadas reglas en Storage y Firestore. |
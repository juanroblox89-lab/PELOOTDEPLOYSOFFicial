# AGENTS.md — PeLoot (contexto para agentes IA)

Instrucciones persistentes para quien continúe este repo: **mejorar UX, visual, móvil, velocidad y conversión sin romper la lógica existente.**

---

## Qué es PeLoot

- **Ecommerce** de **peluches coleccionables** ligados a **personajes virales**, **videojuegos**, **nostalgia gamer** y cultura **TikTok / Reels / Shorts**.
- **No** es una juguetería infantil genérica.
- Se vende **emoción, nostalgia, identificación, colección, humor viral** y el deseo de **“quiero eso en mi cuarto”**.
- Concepto central de marca: **“Tus personajes favoritos, ahora en el mundo real.”**

---

## Posicionamiento

**No** competir principalmente por precio ni por utilidad.

**Sí** competir por:

- deseo emocional y fandom  
- viralidad e impulsividad  
- **“Yo necesito ese personaje”**

La propuesta: **convertir personajes digitales en objetos físicos**. Lo que más vende narrativamente es el efecto **“el personaje existe en la vida real”** (close-ups, manos, tamaño real, estética de estantería).

---

## ADN visual (correcto vs prohibido)

**Debe sentirse como:** Nintendo moderno, Shopify premium, juguetería coleccionable, amigable, divertida, limpia, tecnológica ligera. Referencias: Nintendo Store, Pokémon Center, Lego Store, tono Supercell/UI limpia, minimal tipo Apple en ecommerce.

**No debe sentirse como:** gamer oscuro, cyberpunk, RGB, neón exagerado, agresivo, amateur “gamer 2018”, streamer aesthetic.

### Paleta definitiva

| Uso | Color |
|-----|--------|
| Azul marca | `#2EA8FF` |
| Amarillo / CTA | `#FFD633` |
| Texto principal | `#2D2D2D` |
| Verde acento | `#61C454` |
| Fondos | Blanco, gradientes **pastel suaves**, celeste y rosado muy suaves |

### Prohibido visualmente

- Negro dominante, morado oscuro dominante  
- Glow neón, glassmorphism pesado, sombras negras fuertes  
- Tipografías futuristas (ej. Orbitron), fondos oscuros completos  

### Tipografía

- **Títulos:** Poppins ExtraBold o Nunito ExtraBold  
- **Cuerpo:** Inter o Nunito Sans  

**Implementación en código:** el sistema actual vive en **`css/epic-loot.css`** (no depender de `index.css` salvo que el proyecto lo use activamente).

---

## UX y filosofía (mobile first)

- La mayoría del tráfico viene de **videos cortos**: entrada rápida, scroll rápido, decisión rápida, compra impulsiva.
- La web debe: **cargar rápido**, verse **premium al instante**, explicar en segundos, **CTAs claros**, **poca fricción**.
- Evitar sensación **corporativa, compleja o saturada**; priorizar **rápida, simple, moderna, fácil**.

---

## Embudo de conversión y WhatsApp

Flujo típico:

**Video viral → perfil → web → producto → WhatsApp → compra**

- **WhatsApp es crítico** para cierre: preguntas, apartados, envíos, confianza humana.
- **No quitar** el botón flotante ni el acceso rápido a WhatsApp.

---

## Marketing (lo que funciona)

1. **Videos cortos y simples** (manos, unboxing, comparaciones, POVs, textura/tamaño); cuanto más natural, mejor. Evitar sobreproducción, intros largas, videos oscuros.
2. **Hooks virales** que apelen a fans del juego / “personaje en el mundo real”.
3. **Personajes fuertes** (ej. Mini Pekka, Tronco, Baby Dragon, Yeti, memeables): reconocibles, tiernos, nostálgicos.
4. **Comentarios y respuestas** (país, precio, stock, envíos): prueba social y confianza.
5. Países con mucha pregunta: **Perú, Chile, Guatemala, El Salvador, Colombia, México** — claridad en envíos y moneda local ayuda.

---

## Frases útiles de marca

- “Tus personajes favoritos, ahora en el mundo real”  
- “Peluches coleccionables premium”  
- “Hacemos envíos internacionales”  
- “Colección Premium 2026”  

---

## Productos y datos

- Catálogo (nombres, precios, imágenes, stock, categorías) debe venir de **Firebase**; **no hardcodear** ese contenido en HTML como fuente de verdad.

---

## Prioridades técnicas

1. **No romper:** Firebase, **carrito**, **auth**, **admin**, **MercadoPago** (si aplica), **monedas**, productos dinámicos, redirects (ej. auth en Vercel).
2. **Mobile UX:** responsive, botones bien ubicados, sticky sin bugs, sin overflow raro, spacing coherente (header fijo vs contenido).
3. **Performance:** evitar renders innecesarios, revisar peso de Firebase en cliente, mejorar cuellos en admin si están lentos.

**Regla absoluta:** cualquier cambio estático o de copy debe validarse contra **no romper** los flujos anteriores.

---

## Estructura ideal de la web (referencia)

- **Home:** hero fuerte, destacados, beneficios, reseñas, envíos internacionales.  
- **Producto:** imágenes grandes, precio visible, CTA amarillo, badges de confianza.  
- **Carrito:** limpio, rápido, simple.

---

## Comandos del repo

- **Desarrollo:** servir estáticos con tu servidor local (`server.ps1`) u otra herramienta que uses.  
- **Reglas Firestore (local):** `npm run deploy:rules` (`npx firebase-tools`; primera vez `firebase login`, o token en CI).  
- **Git + push + rules (Windows):** `.\deploy.ps1 -Message "tu mensaje"`  
- **CI:** `.github/workflows/deploy-firestore.yml` — secret **`FIREBASE_TOKEN`** (`firebase login:ci`).  
- **Vercel:** repo conectado en dashboard → cada push despliega el frontend estático.

---

## Reglas operativas para el agente

1. Coherencia con **esta guía de marca** y con **`css/epic-loot.css`**.  
2. Cambios **incrementales**; no refactors masivos salvo petición explícita.  
3. Tras tocar UI móvil, comprobar **carrito, checkout, ficha de producto y catálogo**.  
4. Seguridad Firebase: respetar **Firestore Rules** y no exponer secretos en frontend.

---

## Infraestructura y Firebase (Crítico)

- **Índices Compuestos:** Para que la consulta de pedidos por usuario funcione (`getOrdersByUser`), **DEBES** crear manualmente un índice compuesto en la consola de Firebase:
  - Colección: `orders`
  - Campos: `userId` (Ascendente), `createdAt` (Descendente).
- **Reglas de Seguridad:** Mantener siempre actualizadas las reglas en `firestore.rules` (especialmente para la nueva colección `carts`).

---

## Automatización de Pagos (Webhooks & Preferencias Dinámicas)

- **Endpoint Webhook:** `/api/mercadopago-webhook.js` para auto-confirmación instantánea en Firestore (`status: 'confirmed'`) cuando un pago es aprobado. Requiere `MP_ACCESS_TOKEN` y `FIREBASE_SERVICE_ACCOUNT_JSON` en Vercel.
- **Preferencia Dinámica:** `orders.html` y `tracking.html` consultan en caliente a `/api/create-preference` para crear y guardar la URL de Mercado Pago del pedido con los nombres de ítems y total exactos.
- **Políticas de Pago:** Enunciadas de forma elegante y amigable en `legal/shipping.html` bajo "Proceso de Pago y Verificación", informando que pagos por pasarelas son 100% automáticos e instantáneos.

---

## Motor de Reseñas Google-Style

- **Público & Sin Registro:** Los usuarios (estén logueados o no) pueden escribir opiniones y subir fotos de hasta 5MB.
- **Estructura Firestore:** Colección `reviews`. Campos: `productId`, `userName`, `comment`, `rating` (1 a 5), `imageUrl` (opcional), `createdAt` (ISO String).
- **Almacenamiento Firebase Storage:** Carpeta `reviews/` abierta para cargas públicas validadas (tipo de archivo `image/*` y tamaño `< 5MB`).
- **Navegación Visual:** Integración de miniatura de foto de reseña con Lightbox zoom premium glassmorphic en `product.html`.

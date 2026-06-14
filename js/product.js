import { getProductById, getProductsByCategory } from './firebase-service.js';
import { CURRENCIES, convertPrice, getGlobalSettings } from './store-service.js';
import { addToCart } from './cart.js';
import { db, storage } from './firebase-config.js';
import { 
  collection, addDoc, getDocs, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const img = document.getElementById("product-img");
const nameEl = document.getElementById("product-name");
const priceEl = document.getElementById("product-price");
const descEl = document.getElementById("product-desc");
const addBtn = document.getElementById("addCart");
const minus = document.getElementById("qty-minus");
const plus = document.getElementById("qty-plus");
const qtyValue = document.getElementById("qty-val");
const relatedContainer = document.getElementById("related");

let quantity = 1;
let globalSettings = null;
const activeCurrencyCode = localStorage.getItem('peloot_currency') || 'USD';
const activeCurrency = CURRENCIES.find(c => c.code === activeCurrencyCode) || CURRENCIES[0];

function formatPrice(price){
  if (!globalSettings) return price.toLocaleString("es-CO");
  const converted = convertPrice(price, activeCurrency.code, globalSettings.exchangeRates, 'COP');
  const formatted = converted.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  
  if (activeCurrency.code === 'COP' || activeCurrency.code === 'CLP') {
    return `${activeCurrency.symbol}${formatted}`;
  }
  return `${activeCurrency.symbol}${formatted} ${activeCurrency.code}`;
}

async function loadProduct() {
  globalSettings = await getGlobalSettings();
  if (!id) {
    nameEl.textContent = "Lo sentimos, el peluche no fue encontrado.";
    return;
  }

  try {
    const product = await getProductById(id);

    if (!product || product.active === false) {
      nameEl.textContent = "Producto no disponible";
      return;
    }

    // Set basic info
    img.src = product.imageUrl || product.image;
    nameEl.textContent = product.name;
    priceEl.innerHTML = `<span style="color: var(--primary-blue); font-weight: 900;">${formatPrice(product.price)}</span><span style="text-decoration: line-through; color: var(--text-muted); font-size: 1.5rem; font-weight: 600; margin-left: 16px; opacity: 0.7;">${formatPrice(product.price * 2)}</span>`;
    descEl.textContent = product.description || "Este coleccionable premium está diseñado con materiales de alta calidad y fidelidad al personaje original.";

    const categoryEl = document.getElementById('product-category');
    if (categoryEl) categoryEl.textContent = product.category || 'Colección Premium';

    // Sticky Bar
    const stickyPrice = document.getElementById('sticky-price');
    const stickyName = document.getElementById('sticky-name');
    if (stickyPrice) stickyPrice.innerHTML = `<span style="color: var(--primary-blue); font-weight: 900;">${formatPrice(product.price)}</span> <span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.8rem; font-weight: 600; opacity: 0.7;">${formatPrice(product.price * 2)}</span>`;
    if (stickyName) stickyName.textContent = product.name;

    // Image gallery
    const galleryWrap = document.getElementById('product-gallery-thumbs');
    if (galleryWrap && product.images && product.images.length > 0) {
      galleryWrap.innerHTML = '';
      const allImages = [product.imageUrl || product.image, ...product.images.filter(url => url !== (product.imageUrl || product.image))];
      
      allImages.forEach((imgUrl, i) => {
        const thumb = document.createElement('div');
        thumb.style = `
          min-width: 80px; height: 80px; background: white; border-radius: 12px; 
          padding: 8px; border: 2px solid ${i === 0 ? 'var(--primary-blue)' : 'var(--bg-section)'}; 
          cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
        `;
        thumb.innerHTML = `<img src="${imgUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        thumb.addEventListener('click', () => {
          img.src = imgUrl;
          galleryWrap.querySelectorAll('div').forEach(d => d.style.borderColor = 'var(--bg-section)');
          thumb.style.borderColor = 'var(--primary-blue)';
        });
        galleryWrap.appendChild(thumb);
      });
    }

    // Actions
    minus?.addEventListener('click', () => {
      if (quantity > 1) {
        quantity--;
        qtyValue.textContent = quantity;
      }
    });
    plus?.addEventListener('click', () => {
      quantity++;
      qtyValue.textContent = quantity;
    });

    addBtn?.addEventListener('click', () => {
      addToCart({ ...product, qty: quantity });
    });

    const buyNowBtn = document.getElementById('btn-direct-buy');
    const stickyBuyBtn = document.getElementById('sticky-buy-btn');
    
    [buyNowBtn, stickyBuyBtn].forEach(btn => {
      btn?.addEventListener('click', () => {
        addToCart({ ...product, qty: quantity });
        window.location.href = 'cart.html';
      });
    });

    // Review Link
    if (product.reviewUrl) {
      const actionsDiv = document.querySelector('.product-info-premium > div:nth-child(5)');
      if (actionsDiv) {
        const reviewBtn = document.createElement('a');
        reviewBtn.href = product.reviewUrl;
        reviewBtn.target = "_blank";
        reviewBtn.className = "btn-secondary-gaming";
        reviewBtn.style = "width: 100%; height: 50px; justify-content: center; margin-top: 10px; font-size: 0.9rem; text-decoration: none; display: flex; align-items: center;";
        reviewBtn.innerHTML = `🎬 Ver Reseña del Producto`;
        actionsDiv.appendChild(reviewBtn);
      }
    }

    loadRelatedProducts(product.category, product.id);

  } catch (error) {
    console.error("Error al cargar producto:", error);
    nameEl.textContent = "Error de conexión";
  }
}

async function loadRelatedProducts(category, currentId) {
  if (!relatedContainer) return;
  try {
    const allInCat = await getProductsByCategory(category);
    const related = allInCat
      .filter(p => p.id !== currentId && p.active !== false)
      .slice(0, 4);

    relatedContainer.innerHTML = "";
    related.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card-gaming";
      
      const isOutOfStock = p.stock !== undefined && p.stock <= 0;
      const discountBadge = p.discount ? `<div class="product-badge-premium" style="background:#EF4444;">-${p.discount}%</div>` : '';
      const categoryBadge = p.category ? `<div class="product-badge-premium">${p.category}</div>` : '';

      card.innerHTML = `
        ${discountBadge || categoryBadge}
        <a href="product?id=${p.id}" class="product-image-container" style="display:flex; cursor:pointer; text-decoration:none;">
          <img src="${p.imageUrl || p.image}" class="product-img" alt="${p.name}"
            loading="lazy" decoding="async"
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
              <span style="font-weight: 700; font-size: 0.75rem; color: var(--text-main);">4.9</span>
              <span style="font-size: 0.7rem; color: var(--text-muted);">(48)</span>
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

      card.querySelector('.quick-add')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart({ ...p, qty: 1 });
      });

      relatedContainer.appendChild(card);
    });
  } catch (err) {
    console.error("Error cargando relacionados:", err);
  }
}

loadProduct();

// ============================================================
// 🌟 GOOGLE-STYLE PRODUCT REVIEWS ENGINE
// ============================================================
const reviewsColRef = collection(db, 'reviews');
const auth = getAuth();
let reviewsList = [];

// Elementos de la UI
const reviewsListContainer = document.getElementById('reviews-list-container');
const btnOpenReviewForm = document.getElementById('btn-open-review-form');
const reviewFormContainer = document.getElementById('review-form-container');
const btnCancelReview = document.getElementById('btn-cancel-review');
const newReviewForm = document.getElementById('new-review-form');
const ratingStarsPicker = document.getElementById('rating-stars-picker');
const reviewRatingVal = document.getElementById('review-rating-val');
const reviewImageFile = document.getElementById('review-image-file');
const reviewImageFileLabel = document.getElementById('review-image-file-label');
const reviewImagePreviewWrap = document.getElementById('review-image-preview-wrap');
const reviewImagePreview = document.getElementById('review-image-preview');
const btnRemoveReviewImage = document.getElementById('btn-remove-review-image');

const avgRatingVal = document.getElementById('avg-rating-val');
const avgStarsContainer = document.getElementById('avg-stars-container');
const totalReviewsCount = document.getElementById('total-reviews-count');

const reviewLightbox = document.getElementById('review-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const btnCloseLightbox = document.getElementById('btn-close-lightbox');

// Autocompletar nombre del Gamer si está autenticado
onAuthStateChanged(auth, (user) => {
  if (user) {
    const usernameInput = document.getElementById('review-username');
    if (usernameInput && !usernameInput.value) {
      usernameInput.value = user.displayName || user.email.split('@')[0];
    }
  }
});

// Inicializar Selección de Estrellas interactiva
let stars = [];
if (ratingStarsPicker) {
  stars = ratingStarsPicker.querySelectorAll('.star-picker-item');
}

function highlightStars(count) {
  stars.forEach((star, index) => {
    if (index < count) {
      star.style.color = 'var(--secondary-yellow)';
    } else {
      star.style.color = '#ccc';
    }
  });
}

if (ratingStarsPicker) {
  // Resaltar por defecto (5 estrellas)
  highlightStars(5);
  
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-value'), 10);
      reviewRatingVal.value = val;
      highlightStars(val);
    });
  });
}

// Control del Formulario
btnOpenReviewForm?.addEventListener('click', () => {
  reviewFormContainer.style.display = 'block';
  reviewFormContainer.scrollIntoView({ behavior: 'smooth' });
});

btnCancelReview?.addEventListener('click', () => {
  reviewFormContainer.style.display = 'none';
  newReviewForm.reset();
  resetImageInput();
  highlightStars(5);
  reviewRatingVal.value = 5;
});

// Manejo de la previsualización de imágenes
reviewImageFile?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    reviewImageFileLabel.textContent = `📸 ${file.name}`;
    reviewImageFileLabel.style.borderColor = 'var(--primary-blue)';
    
    const reader = new FileReader();
    reader.onload = (event) => {
      reviewImagePreview.src = event.target.result;
      reviewImagePreviewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

btnRemoveReviewImage?.addEventListener('click', () => {
  resetImageInput();
});

function resetImageInput() {
  if (reviewImageFile) reviewImageFile.value = '';
  if (reviewImageFileLabel) {
    reviewImageFileLabel.textContent = '📂 Seleccionar foto o arrastrar aquí';
    reviewImageFileLabel.style.borderColor = '#ccc';
  }
  if (reviewImagePreviewWrap) reviewImagePreviewWrap.style.display = 'none';
  if (reviewImagePreview) reviewImagePreview.src = '#';
}

// Cargar reseñas desde Firestore
async function fetchReviews() {
  if (!id) return;
  try {
    const q = query(reviewsColRef, where('productId', '==', id));
    const snap = await getDocs(q);
    reviewsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Prioritize reviews with photos, then sort by date desc
    reviewsList.sort((a, b) => {
      const hasImageA = a.imageUrl ? 1 : 0;
      const hasImageB = b.imageUrl ? 1 : 0;
      if (hasImageA !== hasImageB) {
        return hasImageB - hasImageA;
      }
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
      return dateB - dateA;
    });

    renderReviewsList();
  } catch (err) {
    console.error('[PeLoot] Error fetching reviews:', err);
    if (reviewsListContainer) {
      reviewsListContainer.innerHTML = `
        <div style="text-align: center; color: var(--danger-red); font-weight: 700; padding: 20px;">
          ❌ Error al cargar reseñas del producto.
        </div>
      `;
    }
  }
}

// Formateador de fecha
function formatReviewDate(dateVal) {
  if (!dateVal) return 'Hace un momento';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Reciente';
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return 'Reciente';
  }
}

// Renderizar la lista e indicadores
function renderReviewsList() {
  if (!reviewsListContainer) return;
  
  if (reviewsList.length === 0) {
    // Si no hay reseñas aún, mostrar un promedio premium inicial y una invitación amigable
    avgRatingVal.textContent = '4.9';
    avgStarsContainer.innerHTML = '★★★★★';
    totalReviewsCount.textContent = 'Basado en calificaciones de clientes reales';
    
    reviewsListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-weight: 500; padding: 40px 0; border: 2px dashed var(--bg-section); border-radius: var(--radius-lg);">
        💬 ¡Aún no hay reseñas escritas para este peluche! 
        <br><span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-blue);">Sé el primero en compartir tu opinión en el mundo real.</span>
      </div>
    `;
    return;
  }
  
  // Calcular promedios reales
  let totalRating = 0;
  reviewsList.forEach(r => totalRating += (Number(r.rating) || 5));
  const avg = (totalRating / reviewsList.length).toFixed(1);
  
  avgRatingVal.textContent = avg;
  
  const roundedStars = Math.round(Number(avg));
  avgStarsContainer.innerHTML = '★'.repeat(roundedStars) + '☆'.repeat(5 - roundedStars);
  totalReviewsCount.textContent = `Basado en ${reviewsList.length} opinión${reviewsList.length > 1 ? 'es' : ''} de coleccionistas`;
  
  // Generar HTML de la lista
  reviewsListContainer.innerHTML = '';
  reviewsList.forEach(review => {
    const item = document.createElement('div');
    item.style = `
      background: white; border-radius: var(--radius-md); 
      padding: 16px; display: flex; gap: 14px; align-items: flex-start; 
      border: 1px solid var(--border-light); box-shadow: var(--shadow-sm);
      transition: transform 0.2s;
    `;
    
    const formattedDate = formatReviewDate(review.createdAt);
    const starString = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    const avatarImg = review.userPhotoUrl ? 
      `<img src="${review.userPhotoUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : '';
    const avatarInitials = `<div style="width: 100%; height: 100%; display: ${review.userPhotoUrl ? 'none' : 'flex'}; align-items: center; justify-content: center;">${(review.userName || 'G').charAt(0)}</div>`;

    item.innerHTML = `
      <!-- Avatar -->
      <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary-blue-light); color: var(--primary-blue); font-weight: 800; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-transform: uppercase; border: 2px solid white; box-shadow: var(--shadow-sm); font-family: 'Poppins', sans-serif; overflow: hidden;">
        ${avatarImg}
        ${avatarInitials}
      </div>
      <!-- Detalles -->
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; flex-wrap: wrap; gap: 6px;">
          <h4 style="margin: 0; font-size: 0.95rem; color: var(--text-main); font-weight: 800; font-family: 'Poppins', sans-serif;">${review.userName}</h4>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">${formattedDate}</span>
        </div>
        <!-- Estrellas -->
        <div style="color: var(--secondary-yellow); font-size: 0.95rem; margin-bottom: 6px; letter-spacing: 1px;">
          ${starString}
        </div>
        <!-- Comentario -->
        <p style="color: var(--text-body); font-size: 0.88rem; line-height: 1.5; font-weight: 500; margin: 0; margin-bottom: 8px;">
          ${review.comment}
        </p>
        <!-- Miniatura si tiene imagen -->
        ${review.imageUrl ? `
          <div style="width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 2px solid white; box-shadow: var(--shadow-sm); cursor: zoom-in; display: inline-block; transition: transform 0.2s;" class="review-thumb-btn">
            <img src="${review.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        ` : ''}
      </div>
    `;
    
    // Zoom de imagen al hacer clic en la miniatura
    const thumbBtn = item.querySelector('.review-thumb-btn');
    if (thumbBtn) {
      thumbBtn.addEventListener('click', () => {
        lightboxImg.src = review.imageUrl;
        reviewLightbox.style.display = 'flex';
        setTimeout(() => {
          reviewLightbox.style.opacity = '1';
        }, 10);
      });
    }
    
    reviewsListContainer.appendChild(item);
  });
}

// Enviar reseña nueva
newReviewForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('btn-submit-review');
  const cancelBtn = document.getElementById('btn-cancel-review');
  
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando opinión... 🚀';
  }
  if (cancelBtn) cancelBtn.disabled = true;
  
  try {
    const rating = parseInt(reviewRatingVal.value, 10) || 5;
    const userName = document.getElementById('review-username').value.trim();
    const comment = document.getElementById('review-comment').value.trim();
    const imageFile = reviewImageFile.files[0];
    
    let imageUrl = '';
    
    // 1. Si hay una imagen, subirla a Firebase Storage en la carpeta /reviews
    if (imageFile) {
      const storagePath = `reviews/${Date.now()}_${imageFile.name}`;
      const imageRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }
    
    // 2. Guardar el documento en la colección de Firestore 'reviews'
    const currentUser = auth.currentUser;
    const userPhotoUrl = currentUser ? (currentUser.photoURL || '') : '';
    
    const newDoc = {
      productId: id,
      userName,
      comment,
      rating,
      imageUrl,
      userPhotoUrl,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(reviewsColRef, newDoc);
    
    // 3. Éxito
    showToastReview("¡Tu reseña ha sido publicada con éxito! ⭐");
    
    // Ocultar formulario y refrescar
    reviewFormContainer.style.display = 'none';
    newReviewForm.reset();
    resetImageInput();
    highlightStars(5);
    reviewRatingVal.value = 5;
    
    fetchReviews();
    
  } catch (err) {
    console.error('[PeLoot] Error al guardar reseña:', err);
    showToastReview("Ocurrió un error al enviar tu reseña. Por favor intenta de nuevo. ❌");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar Reseña 🚀';
    }
    if (cancelBtn) cancelBtn.disabled = false;
  }
});

// Toast amigable de reseñas
function showToastReview(message) {
  let toast = document.getElementById('peloot-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'peloot-toast';
    toast.style = `
      position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%) translateY(100px);
      background: var(--text-main); color: white; padding: 16px 28px; border-radius: var(--radius-pill);
      font-weight: 800; font-size: 0.95rem; box-shadow: var(--shadow-lg); z-index: 100000;
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; gap: 10px;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  // Animar hacia arriba
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 50);
  // Ocultar después de 4 segundos
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, 4000);
}

// Cerrar Lightbox
btnCloseLightbox?.addEventListener('click', closeReviewLightbox);
reviewLightbox?.addEventListener('click', (e) => {
  if (e.target === reviewLightbox) closeReviewLightbox();
});

function closeReviewLightbox() {
  if (reviewLightbox) {
    reviewLightbox.style.opacity = '0';
    setTimeout(() => {
      reviewLightbox.style.display = 'none';
      lightboxImg.src = '';
    }, 300);
  }
}

// Iniciar Carga de Reseñas
fetchReviews();


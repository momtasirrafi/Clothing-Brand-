/* ============================================================
   NOIR — Clothing Catalog Store (API-driven)
   ============================================================ */

const API = '/api';

// ─── State ───────────────────────────────────────────────────
let products           = [];
let cart               = [];
let activeFilter       = 'all';
let currentSort        = 'default';
let currentModalProduct = null;

// ─── DOM Refs ─────────────────────────────────────────────────
const productGrid    = document.getElementById('product-grid');
const noResults      = document.getElementById('no-results');
const cartBadge      = document.getElementById('cart-badge');
const cartDrawer     = document.getElementById('cart-drawer');
const cartOverlay    = document.getElementById('cart-overlay');
const cartItems      = document.getElementById('cart-items');
const cartFooter     = document.getElementById('cart-footer');
const cartTotalPrice = document.getElementById('cart-total-price');
const modalOverlay   = document.getElementById('modal-overlay');
const productModal   = document.getElementById('product-modal');
const toast          = document.getElementById('toast');
const searchOverlay  = document.getElementById('search-overlay');
const searchInput    = document.getElementById('search-input');
const header         = document.getElementById('header');

// ─── Fetch Products from API ──────────────────────────────────
async function loadProducts() {
  try {
    const res  = await fetch(`${API}/products`);
    products   = await res.json();
    renderProducts();
    renderNewArrivals();
  } catch (err) {
    console.error('Failed to load products from API', err);
    productGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:rgba(240,237,232,0.4)">
        <p style="font-size:14px">Could not connect to the server. Please ensure the server is running.</p>
      </div>`;
  }
}

// ─── New Arrivals (first 3 products) ─────────────────────────
function renderNewArrivals() {
  const container = document.getElementById('new-arrivals-dynamic');
  if (!container) return;
  const list = products.slice(0, 3);
  container.innerHTML = list.map((p, i) => `
    <div class="arrival-card ${i === 0 ? 'featured' : ''}" data-id="${p.id}" style="cursor:pointer">
      <div class="arrival-img-wrap">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='white_tshirt.png'" />
        <div class="arrival-actions">
          <button class="quick-add-btn" data-id="${p.id}">Quick Add</button>
          <button class="wishlist-btn" aria-label="Add to wishlist">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>
        ${p.badge ? `<span class="badge badge-${p.badge}">${p.badgeLabel || p.badge}</span>` : ''}
      </div>
      <div class="arrival-info">
        <p class="product-category">${p.categoryLabel || p.category}</p>
        <h3 class="product-name">${p.name}</h3>
        <p class="product-price">$${p.price}</p>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const prod = products.find(x => x.id === parseInt(btn.dataset.id));
      if (prod) addToCart(prod, 'M');
    });
  });
  container.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.classList.toggle('active');
      showToast(btn.classList.contains('active') ? 'Added to wishlist ♡' : 'Removed from wishlist');
    });
  });
  container.querySelectorAll('.arrival-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.quick-add-btn') || e.target.closest('.wishlist-btn')) return;
      const prod = products.find(p => p.id === parseInt(card.dataset.id));
      if (prod) openModal(prod);
    });
  });
}

// ─── Render Product Grid ──────────────────────────────────────
function getFilteredSorted() {
  let list = activeFilter === 'all'
    ? products
    : products.filter(p => p.category === activeFilter || (p.tags || []).includes(activeFilter));

  const q = (searchInput?.value || '').toLowerCase().trim();
  if (q) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.categoryLabel || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  switch (currentSort) {
    case 'price-asc':  list = [...list].sort((a, b) => a.price - b.price); break;
    case 'price-desc': list = [...list].sort((a, b) => b.price - a.price); break;
    case 'name-asc':   list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  return list;
}

function renderProducts() {
  const list = getFilteredSorted();
  productGrid.innerHTML = '';

  if (list.length === 0) {
    noResults.style.display = 'block';
    return;
  }
  noResults.style.display = 'none';

  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="product-card-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='white_tshirt.png'" />
        <div class="arrival-actions">
          <button class="quick-add-btn" data-id="${p.id}">Quick Add</button>
          <button class="wishlist-btn" aria-label="Wishlist">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
        </div>
        ${p.badge ? `<span class="badge badge-${p.badge}">${p.badgeLabel || p.badge}</span>` : ''}
      </div>
      <div class="product-card-info">
        <p class="product-card-cat">${p.categoryLabel || p.category}</p>
        <h3 class="product-card-name">${p.name}</h3>
        <p class="product-card-price">
          ${p.originalPrice ? `<span class="original-price">$${p.originalPrice}</span>` : ''}
          $${p.price}
        </p>
      </div>
    `;
    card.addEventListener('click', e => {
      if (e.target.closest('.quick-add-btn') || e.target.closest('.wishlist-btn')) return;
      openModal(p);
    });
    productGrid.appendChild(card);
  });

  productGrid.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const prod = products.find(x => x.id === parseInt(btn.dataset.id));
      if (prod) addToCart(prod, 'M');
    });
  });

  productGrid.querySelectorAll('.wishlist-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      btn.classList.toggle('active');
      showToast(btn.classList.contains('active') ? 'Added to wishlist ♡' : 'Removed from wishlist');
    });
  });
}

// ─── Filter Buttons ───────────────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderProducts();
  });
});

document.getElementById('sort-select').addEventListener('change', e => {
  currentSort = e.target.value;
  renderProducts();
});

document.getElementById('reset-filter')?.addEventListener('click', () => {
  activeFilter = 'all';
  currentSort  = 'default';
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-filter="all"]').classList.add('active');
  document.getElementById('sort-select').value = 'default';
  renderProducts();
});

// ─── Cart ─────────────────────────────────────────────────────
function addToCart(product, size = 'M') {
  const key      = `${product.id}-${size}`;
  const existing = cart.find(c => c.key === key);
  if (existing) existing.qty++;
  else cart.push({ key, product, size, qty: 1 });
  updateCart();
  showToast(`${product.name} added to bag`);
}

function removeFromCart(key) {
  cart = cart.filter(c => c.key !== key);
  updateCart();
}

function updateCart() {
  const total = cart.reduce((s, c) => s + c.product.price * c.qty, 0);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  cartBadge.textContent = count;
  cartBadge.classList.toggle('visible', count > 0);

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    cartFooter.style.display = 'none';
    return;
  }

  cartFooter.style.display = 'flex';
  cartTotalPrice.textContent = `$${total}`;

  cartItems.innerHTML = cart.map(c => `
    <div class="cart-item" data-key="${c.key}">
      <div class="cart-item-img">
        <img src="${c.product.image}" alt="${c.product.name}" onerror="this.src='white_tshirt.png'" />
      </div>
      <div class="cart-item-info">
        <p class="cart-item-name">${c.product.name}</p>
        <p class="cart-item-meta">Size ${c.size} · Qty ${c.qty}</p>
        <p class="cart-item-price">$${c.product.price * c.qty}</p>
        <button class="cart-item-remove" data-key="${c.key}">Remove</button>
      </div>
    </div>
  `).join('');

  cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.key));
  });
}

document.getElementById('cart-btn').addEventListener('click', () => {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
});

function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

cartOverlay.addEventListener('click', closeCart);
document.getElementById('cart-drawer-close').addEventListener('click', closeCart);
document.getElementById('continue-shopping')?.addEventListener('click', closeCart);

// ─── Product Modal ────────────────────────────────────────────
function openModal(product) {
  currentModalProduct = product;
  document.getElementById('modal-img').src          = product.image;
  document.getElementById('modal-img').alt          = product.name;
  document.getElementById('modal-img').onerror      = function() { this.src = 'white_tshirt.png'; };
  document.getElementById('modal-category').textContent = product.categoryLabel || product.category;
  document.getElementById('modal-name').textContent     = product.name;
  document.getElementById('modal-price').textContent    = product.originalPrice
    ? `$${product.originalPrice}  →  $${product.price}`
    : `$${product.price}`;
  document.getElementById('modal-desc').textContent = product.desc || '';

  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.size-btn[data-size="M"]')?.classList.add('active');

  modalOverlay.classList.add('active');
  productModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('active');
  productModal.classList.remove('open');
  document.body.style.overflow = '';
  currentModalProduct = null;
}

modalOverlay.addEventListener('click', closeModal);
document.getElementById('modal-close').addEventListener('click', closeModal);

document.querySelectorAll('.size-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('modal-add-btn').addEventListener('click', () => {
  if (!currentModalProduct) return;
  const size = document.querySelector('.size-btn.active')?.dataset.size || 'M';
  addToCart(currentModalProduct, size);
  closeModal();
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
});

// ─── Search ───────────────────────────────────────────────────
document.getElementById('search-btn').addEventListener('click', () => {
  searchOverlay.classList.add('active');
  setTimeout(() => searchInput?.focus(), 100);
});

document.getElementById('search-close').addEventListener('click', () => {
  searchOverlay.classList.remove('active');
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    searchOverlay.classList.remove('active');
    closeModal();
    closeCart();
  }
});

searchInput?.addEventListener('input', renderProducts);

document.querySelectorAll('.suggestion-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    const f = tag.dataset.filter;
    searchOverlay.classList.remove('active');
    activeFilter = f || 'all';
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-filter="${activeFilter}"]`)?.classList.add('active');
    renderProducts();
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  });
});

// ─── Newsletter ───────────────────────────────────────────────
document.getElementById('newsletter-form').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('newsletter-email').value.trim();
  if (!email || !email.includes('@')) { showToast('Please enter a valid email address'); return; }
  const msg = document.getElementById('newsletter-msg');
  msg.textContent  = `✓ Welcome! Check ${email} for your first drop notification.`;
  msg.style.display = 'block';
  document.getElementById('newsletter-email').value = '';
});

// ─── Header scroll ────────────────────────────────────────────
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 60);
});

// ─── Mobile nav ───────────────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');
navToggle.addEventListener('click', () => navLinks.classList.toggle('mobile-open'));
navLinks.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('mobile-open'));
});

// ─── Toast ───────────────────────────────────────────────────
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─── Intersection Observer ────────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.stat, .lookbook-img, .about-img-wrap').forEach(el => observer.observe(el));

// ─── Smooth scroll ────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }
  });
});

// ─── Init ─────────────────────────────────────────────────────
loadProducts();

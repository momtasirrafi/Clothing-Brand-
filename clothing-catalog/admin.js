/* ============================================================
   NOIR Admin — JavaScript
   ============================================================ */

const API = 'http://localhost:3000/api';

// ─── State ────────────────────────────────────────────────────
let allProducts   = [];
let deleteTargetId = null;
let editMode       = false;

// ─── DOM refs ─────────────────────────────────────────────────
const views = {
  dashboard: document.getElementById('view-dashboard'),
  products:  document.getElementById('view-products'),
  add:       document.getElementById('view-add'),
};
const topbarTitle   = document.getElementById('topbar-title');
const apiStatus     = document.getElementById('api-status');
const apiStatusLbl  = document.getElementById('api-status-label');
const sidebar       = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');

// ============================================================
// NAVIGATION
// ============================================================
function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  views[name]?.classList.add('active');
  document.querySelector(`.nav-item[data-view="${name}"]`)?.classList.add('active');

  const titles = { dashboard: 'Dashboard', products: 'Products', add: editMode ? 'Edit Product' : 'Add Product' };
  topbarTitle.textContent = titles[name] || name;

  if (name === 'dashboard') loadDashboard();
  if (name === 'products')  renderProductsTable();
  if (name === 'add' && !editMode) resetForm();

  sidebar.classList.remove('open');
}

// Bind nav items
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});
document.querySelectorAll('[data-view]').forEach(el => {
  if (!el.classList.contains('nav-item')) {
    el.addEventListener('click', () => showView(el.dataset.view));
  }
});

// Sidebar toggle (mobile)
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.addEventListener('click', e => {
  if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target))
    sidebar.classList.remove('open');
});

// ============================================================
// API HELPERS
// ============================================================
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function checkApiStatus() {
  try {
    await fetch(`${API}/products`);
    apiStatus.className = 'status-dot online';
    apiStatusLbl.textContent = 'API Online';
  } catch {
    apiStatus.className = 'status-dot offline';
    apiStatusLbl.textContent = 'API Offline';
  }
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  try {
    const stats = await apiFetch('/stats');
    document.getElementById('stat-products').textContent  = stats.totalProducts;
    document.getElementById('stat-categories').textContent = stats.categories;
    document.getElementById('stat-value').textContent     = `$${Number(stats.totalValue).toLocaleString()}`;
    document.getElementById('stat-lowstock').textContent  = stats.lowStock;

    const products = await apiFetch('/products');
    const tbody    = document.getElementById('dash-tbody');
    const recent   = products.slice(-5).reverse();

    tbody.innerHTML = recent.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="table-thumb"><img src="${p.image}" alt="${p.name}" /></div>
            <span class="table-name">${p.name}</span>
          </div>
        </td>
        <td><span class="pill pill-${p.category}">${p.category}</span></td>
        <td>$${p.price}</td>
        <td>${stockChip(p.stock)}</td>
        <td>${badgePill(p.badge, p.badgeLabel)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showToast('Failed to load dashboard', 'error');
  }
}

// ============================================================
// PRODUCTS TABLE
// ============================================================
async function fetchProducts() {
  allProducts = await apiFetch('/products');
}

function stockChip(qty) {
  const q = qty || 0;
  const cls = q === 0 ? 'low' : q < 10 ? 'med' : 'ok';
  const dot = q === 0 ? '✕' : q < 10 ? '⚠' : '✓';
  return `<span class="stock-chip ${cls}">${dot} ${q}</span>`;
}

function badgePill(badge, label) {
  if (!badge) return `<span class="badge-none">—</span>`;
  return `<span class="badge-pill badge-${badge}">${label || badge}</span>`;
}

function categoryPill(cat) {
  return `<span class="pill pill-${cat}">${cat}</span>`;
}

function renderProductsTable() {
  fetchProducts().then(() => applyTableFilters()).catch(() => showToast('Failed to load products', 'error'));
}

function applyTableFilters() {
  const q    = document.getElementById('product-search').value.toLowerCase().trim();
  const cat  = document.getElementById('cat-filter').value;
  const badge = document.getElementById('badge-filter').value;

  let list = allProducts.filter(p => {
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    const matchC = !cat || p.category === cat;
    const matchB = !badge || (badge === 'none' ? !p.badge : p.badge === badge);
    return matchQ && matchC && matchB;
  });

  document.getElementById('product-count').textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;

  const tbody = document.getElementById('products-tbody');
  const empty = document.getElementById('table-empty');

  if (list.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = list.map(p => `
    <tr data-id="${p.id}">
      <td>
        <div class="table-thumb"><img src="${p.image}" alt="${p.name}" onerror="this.src='white_tshirt.png'" /></div>
      </td>
      <td>
        <div class="table-name">${p.name}</div>
        <div class="table-sku">${p.sku || '—'}</div>
      </td>
      <td>${p.sku || '—'}</td>
      <td>${categoryPill(p.category)}</td>
      <td>
        ${p.originalPrice ? `<span style="color:var(--text-faint);text-decoration:line-through;margin-right:6px;font-size:12px">$${p.originalPrice}</span>` : ''}
        <strong>$${p.price}</strong>
      </td>
      <td>${stockChip(p.stock)}</td>
      <td>${badgePill(p.badge, p.badgeLabel)}</td>
      <td>
        <div class="table-actions">
          <button class="edit-btn" data-id="${p.id}" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="del-btn" data-id="${p.id}" data-name="${p.name}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Edit buttons
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditForm(parseInt(btn.dataset.id)));
  });

  // Delete buttons
  tbody.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id), btn.dataset.name));
  });
}

// Search & filter listeners
document.getElementById('product-search').addEventListener('input', applyTableFilters);
document.getElementById('cat-filter').addEventListener('change', applyTableFilters);
document.getElementById('badge-filter').addEventListener('change', applyTableFilters);

// ============================================================
// PRODUCT FORM — ADD & EDIT
// ============================================================
const form        = document.getElementById('product-form');
const cancelEdit  = document.getElementById('cancel-edit-btn');
const clearBtn    = document.getElementById('clear-form-btn');
const submitBtn   = document.getElementById('submit-btn');
const formTitle   = document.getElementById('form-title');
const formSub     = document.getElementById('form-subtitle');

// Live preview
function updatePreview() {
  document.getElementById('preview-name').textContent  = document.getElementById('f-name').value  || 'Product Name';
  document.getElementById('preview-cat').textContent   = document.getElementById('f-category-label').value || document.getElementById('f-category').value || 'Category';
  const price = document.getElementById('f-price').value;
  document.getElementById('preview-price').textContent = price ? `$${price}` : '$0';

  const badge = document.getElementById('f-badge').value;
  const badgeLabel = document.getElementById('f-badge-label').value;
  const pb = document.getElementById('preview-badge');
  if (badge) { pb.textContent = badgeLabel || badge; pb.style.display = ''; }
  else pb.style.display = 'none';

  // Category → label suggestion
  const catMap = { men: 'Men · ', women: 'Women · ', outerwear: 'Outerwear · ', essentials: 'Unisex · Essentials' };
  const catLabelField = document.getElementById('f-category-label');
  if (!catLabelField.dataset.manually_set) {
    catLabelField.value = catMap[document.getElementById('f-category').value] || '';
    document.getElementById('preview-cat').textContent = catLabelField.value || 'Category';
  }
}

['f-name','f-price','f-category','f-category-label','f-badge','f-badge-label'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updatePreview);
  document.getElementById(id)?.addEventListener('change', updatePreview);
});

document.getElementById('f-category-label').addEventListener('input', function() {
  this.dataset.manually_set = this.value ? '1' : '';
});

// Badge auto-fill label
document.getElementById('f-badge').addEventListener('change', function() {
  const labels = { new: 'New', bestseller: 'Best Seller', sale: 'Sale' };
  const lbl = document.getElementById('f-badge-label');
  if (!lbl.value || Object.values(labels).includes(lbl.value)) {
    lbl.value = labels[this.value] || '';
  }
  updatePreview();
});

// Image upload preview
const uploadZone    = document.getElementById('upload-zone');
const uploadPreview = document.getElementById('upload-preview');
const previewImgEl  = document.getElementById('preview-img');
const previewCardImg = document.getElementById('preview-card-img');
const fileInput     = document.getElementById('f-image');
const imageUrlInput = document.getElementById('f-image-url');

function setPreviewImage(src) {
  if (src) {
    previewImgEl.src = src;
    previewImgEl.style.display = 'block';
    uploadPreview.style.display = 'none';
    previewCardImg.src = src;
  } else {
    previewImgEl.style.display = 'none';
    uploadPreview.style.display = 'flex';
    previewCardImg.src = 'white_tshirt.png';
  }
}

fileInput.addEventListener('change', function() {
  if (this.files[0]) {
    const url = URL.createObjectURL(this.files[0]);
    setPreviewImage(url);
    imageUrlInput.value = '';
  }
});

imageUrlInput.addEventListener('input', function() {
  if (this.value.trim()) {
    setPreviewImage(this.value.trim());
    fileInput.value = '';
  } else {
    setPreviewImage(null);
  }
});

// Drag and drop
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    setPreviewImage(URL.createObjectURL(file));
    imageUrlInput.value = '';
  }
});

// Show available image filenames
document.getElementById('available-images').textContent =
  'mens_jacket.png, womens_dress.png, white_tshirt.png, denim_jeans.png, camel_coat.png';

// Validation
function validateForm() {
  let ok = true;
  const checks = [
    { id: 'f-name',     errId: 'err-name',     msg: 'Product name is required' },
    { id: 'f-price',    errId: 'err-price',    msg: 'Price is required',   test: v => v && parseFloat(v) >= 0 },
    { id: 'f-category', errId: 'err-category', msg: 'Category is required' },
  ];
  checks.forEach(({ id, errId, msg, test }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    const val = el.value.trim();
    const fail = test ? !test(val) : !val;
    if (fail) { err.textContent = msg; el.classList.add('error'); ok = false; }
    else       { err.textContent = '';  el.classList.remove('error'); }
  });
  return ok;
}

// Submit
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateForm()) return;

  submitBtn.disabled = true;
  submitBtn.textContent = editMode ? 'Saving…' : 'Adding…';

  try {
    const fd = new FormData();
    fd.append('name',           document.getElementById('f-name').value.trim());
    fd.append('sku',            document.getElementById('f-sku').value.trim());
    fd.append('desc',           document.getElementById('f-desc').value.trim());
    fd.append('price',          document.getElementById('f-price').value);
    fd.append('originalPrice',  document.getElementById('f-orig-price').value);
    fd.append('clearOriginal',  document.getElementById('f-orig-price').value ? 'false' : 'true');
    fd.append('stock',          document.getElementById('f-stock').value);
    fd.append('category',       document.getElementById('f-category').value);
    fd.append('categoryLabel',  document.getElementById('f-category-label').value.trim());
    fd.append('badge',          document.getElementById('f-badge').value);
    fd.append('badgeLabel',     document.getElementById('f-badge-label').value.trim());
    fd.append('tags',           document.getElementById('f-tags').value);
    if (imageUrlInput.value.trim()) fd.append('image', imageUrlInput.value.trim());
    if (fileInput.files[0]) fd.append('image', fileInput.files[0]);

    const editId = document.getElementById('edit-id').value;
    const url    = editMode ? `${API}/products/${editId}` : `${API}/products`;
    const method = editMode ? 'PUT' : 'POST';

    const res = await fetch(url, { method, body: fd });
    if (!res.ok) throw new Error(await res.text());

    showToast(editMode ? '✓ Product updated' : '✓ Product added', 'success');
    resetForm();
    showView('products');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg> Save Product`;
  }
});

function resetForm() {
  form.reset();
  document.getElementById('edit-id').value = '';
  editMode = false;
  formTitle.textContent = 'Add New Product';
  formSub.textContent   = 'Fill in the details below';
  cancelEdit.style.display = 'none';
  setPreviewImage(null);
  updatePreview();
  ['err-name','err-price','err-category'].forEach(id => { document.getElementById(id).textContent = ''; });
  document.querySelectorAll('.field input.error, .field select.error').forEach(el => el.classList.remove('error'));
  document.getElementById('f-category-label').dataset.manually_set = '';
}

clearBtn.addEventListener('click', resetForm);
cancelEdit.addEventListener('click', () => { resetForm(); showView('products'); });

// Open edit form
function openEditForm(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;

  editMode = true;
  formTitle.textContent = 'Edit Product';
  formSub.textContent   = `Editing: ${p.name}`;
  cancelEdit.style.display = '';
  document.getElementById('edit-id').value = p.id;

  document.getElementById('f-name').value           = p.name;
  document.getElementById('f-sku').value            = p.sku || '';
  document.getElementById('f-desc').value           = p.desc || '';
  document.getElementById('f-price').value          = p.price;
  document.getElementById('f-orig-price').value     = p.originalPrice || '';
  document.getElementById('f-stock').value          = p.stock || 0;
  document.getElementById('f-category').value       = p.category;
  document.getElementById('f-category-label').value = p.categoryLabel;
  document.getElementById('f-badge').value          = p.badge || '';
  document.getElementById('f-badge-label').value    = p.badgeLabel || '';
  document.getElementById('f-tags').value           = (p.tags || []).join(', ');
  document.getElementById('f-image-url').value      = p.image;
  document.getElementById('f-category-label').dataset.manually_set = '1';

  setPreviewImage(p.image);
  updatePreview();
  showView('add');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// DELETE
// ============================================================
function openDeleteModal(id, name) {
  deleteTargetId = id;
  document.getElementById('delete-modal-name').textContent = `"${name}" will be permanently removed.`;
  document.getElementById('delete-backdrop').classList.add('active');
  document.getElementById('delete-modal').classList.add('active');
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-backdrop').classList.remove('active');
  document.getElementById('delete-modal').classList.remove('active');
}

document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
document.getElementById('delete-backdrop').addEventListener('click', closeDeleteModal);

document.getElementById('confirm-delete').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    await apiFetch(`/products/${deleteTargetId}`, { method: 'DELETE', headers: {} });
    showToast('Product deleted', 'success');
    closeDeleteModal();
    renderProductsTable();
  } catch {
    showToast('Failed to delete product', 'error');
    closeDeleteModal();
  }
});

// ============================================================
// TOAST
// ============================================================
let toastTimer;
function showToast(msg, type = 'success') {
  const el   = document.getElementById('admin-toast');
  const icon = document.getElementById('toast-icon');
  const text = document.getElementById('toast-text');

  icon.textContent = type === 'success' ? '✓' : '✕';
  text.textContent = msg;
  el.className     = `admin-toast show ${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeDeleteModal();
});

// ============================================================
// INIT
// ============================================================
checkApiStatus();
setInterval(checkApiStatus, 15000);
showView('dashboard');

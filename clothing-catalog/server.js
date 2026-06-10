const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = 3000;

// ─── Paths ───────────────────────────────────────────────────
const DATA_FILE    = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR  = path.join(__dirname, 'uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));          // serve catalog files
app.use('/uploads', express.static(UPLOADS_DIR));

// ─── Multer (image uploads) ───────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e5);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

// ─── Helpers ──────────────────────────────────────────────────
function readProducts() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}

function writeProducts(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(products) {
  return products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
}

// ─── API ROUTES ───────────────────────────────────────────────

// GET all products
app.get('/api/products', (_req, res) => {
  res.json(readProducts());
});

// GET single product
app.get('/api/products/:id', (req, res) => {
  const products = readProducts();
  const product  = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST create product
app.post('/api/products', upload.single('image'), (req, res) => {
  const products = readProducts();
  const body     = req.body;

  const newProduct = {
    id:            nextId(products),
    name:          body.name || 'Untitled',
    category:      body.category || 'essentials',
    categoryLabel: body.categoryLabel || '',
    price:         parseFloat(body.price) || 0,
    originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : null,
    image:         req.file ? `uploads/${req.file.filename}` : (body.image || 'white_tshirt.png'),
    badge:         body.badge || null,
    badgeLabel:    body.badgeLabel || null,
    desc:          body.desc || '',
    tags:          body.tags ? body.tags.split(',').map(t => t.trim()) : [],
    stock:         parseInt(body.stock) || 0,
    sku:           body.sku || `SKU-${Date.now()}`
  };

  products.push(newProduct);
  writeProducts(products);
  res.status(201).json(newProduct);
});

// PUT update product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  const products = readProducts();
  const idx      = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const body    = req.body;
  const updated = {
    ...products[idx],
    name:          body.name          ?? products[idx].name,
    category:      body.category      ?? products[idx].category,
    categoryLabel: body.categoryLabel ?? products[idx].categoryLabel,
    price:         body.price         ? parseFloat(body.price)         : products[idx].price,
    originalPrice: body.originalPrice ? parseFloat(body.originalPrice) : (body.clearOriginal === 'true' ? null : products[idx].originalPrice),
    badge:         body.badge         !== undefined ? (body.badge || null) : products[idx].badge,
    badgeLabel:    body.badgeLabel    !== undefined ? (body.badgeLabel || null) : products[idx].badgeLabel,
    desc:          body.desc          ?? products[idx].desc,
    tags:          body.tags          ? body.tags.split(',').map(t => t.trim()) : products[idx].tags,
    stock:         body.stock         ? parseInt(body.stock)           : products[idx].stock,
    sku:           body.sku           ?? products[idx].sku,
    image:         req.file           ? `uploads/${req.file.filename}` : (body.image ?? products[idx].image)
  };

  products[idx] = updated;
  writeProducts(products);
  res.json(updated);
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
  const products = readProducts();
  const idx      = products.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const deleted = products.splice(idx, 1)[0];
  writeProducts(products);
  res.json({ success: true, deleted });
});

// POST upload image only
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ url: `uploads/${req.file.filename}`, filename: req.file.filename });
});

// GET stats for admin dashboard
app.get('/api/stats', (_req, res) => {
  const products  = readProducts();
  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const totalValue = products.reduce((s, p) => s + p.price * (p.stock || 0), 0);
  const categories = [...new Set(products.map(p => p.category))].length;
  res.json({
    totalProducts: products.length,
    totalStock,
    totalValue: totalValue.toFixed(2),
    categories,
    lowStock: products.filter(p => (p.stock || 0) < 10).length
  });
});

// ─── Page Routes ──────────────────────────────────────────────
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (_req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🖤  NOIR Clothing Catalog`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  Store   →  http://localhost:${PORT}`);
  console.log(`  Admin   →  http://localhost:${PORT}/admin`);
  console.log(`  API     →  http://localhost:${PORT}/api/products`);
  console.log(`  ─────────────────────────────────\n`);
});

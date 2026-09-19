/* ============================================================
   TOKO RINI — main.js
   Logika: WhatsApp Order Builder, Status Buka/Tutup,
           Keranjang Belanja, Filter Produk, Interaktivitas
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
// KONFIGURASI TOKO (UBAH SESUAI DATA ASLI)
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  storeName:   'Toko Rini',
  waNumber:    '',   // Kosongkan agar langsung redirect WhatsApp (atau isi nomor WA format '62xxx' jika diinginkan)
  waGreeting:  'Halo Toko Rini! 🛒 Saya ingin pesan sembako berikut ini:',
  deliveryMin: 50000,             // Minimum pembelian untuk antar (Rp)
  hours: {
    // Format: [jamBuka, jamTutup] dalam 24 jam. null = tutup
    0: [7, 20],   // Minggu
    1: [6, 21],   // Senin
    2: [6, 21],   // Selasa
    3: [6, 21],   // Rabu
    4: [6, 21],   // Kamis
    5: [6, 21],   // Jumat
    6: [6, 21],   // Sabtu
  }
};

// ─────────────────────────────────────────────────────────────
// DATA PRODUK
// ─────────────────────────────────────────────────────────────
const PRODUCTS = [
  // SEMBAKO
  { id: 1, name: 'Beras Premium',         cat: 'sembako',  emoji: '🌾', price: 13500, unit: '/kg',    badge: 'Stok Ada',   popular: true  },
  { id: 2, name: 'Gula Pasir',            cat: 'sembako',  emoji: '🍬', price: 14000, unit: '/kg',    badge: null,          popular: false },
  { id: 3, name: 'Minyak Goreng 1 Liter', cat: 'sembako',  emoji: '🫙', price: 17500, unit: '/botol', badge: 'Terlaris',   popular: true  },
  { id: 4, name: 'Telur Ayam',            cat: 'sembako',  emoji: '🥚', price: 2500,  unit: '/butir', badge: 'Fresh',      popular: true  },
  { id: 5, name: 'Garam Halus 250g',      cat: 'sembako',  emoji: '🧂', price: 3500,  unit: '/bks',   badge: null,          popular: false },
  { id: 6, name: 'Mi Instan Goreng',      cat: 'sembako',  emoji: '🍜', price: 3500,  unit: '/bks',   badge: 'Favorit',    popular: true  },

  // DAPUR
  { id: 7,  name: 'Kecap Manis 600ml',   cat: 'dapur',    emoji: '🫙', price: 18000, unit: '/botol', badge: null,          popular: false },
  { id: 8,  name: 'Santan Kara 65ml',    cat: 'dapur',    emoji: '🥥', price: 4500,  unit: '/sachet',badge: null,          popular: false },
  { id: 9,  name: 'Bumbu Kuning Instan', cat: 'dapur',    emoji: '🌿', price: 3000,  unit: '/sachet',badge: null,          popular: false },
  { id: 10, name: 'Saus Sambal 340ml',   cat: 'dapur',    emoji: '🌶️', price: 12500, unit: '/botol', badge: 'Pedas!',     popular: false },

  // SNACK
  { id: 11, name: 'Keripik Singkong',    cat: 'snack',    emoji: '🥔', price: 8000,  unit: '/bks',   badge: 'Gurih',      popular: false },
  { id: 12, name: 'Biskuit Crackers',    cat: 'snack',    emoji: '🍪', price: 7500,  unit: '/bks',   badge: null,          popular: false },
  { id: 13, name: 'Permen Pelita',       cat: 'snack',    emoji: '🍬', price: 500,   unit: '/biji',  badge: null,          popular: false },
  { id: 14, name: 'Kopi Sachet',         cat: 'snack',    emoji: '☕', price: 2000,  unit: '/sachet',badge: 'Mantap',     popular: true  },
  { id: 15, name: 'Teh Celup 25 Kantong',cat: 'snack',    emoji: '🍵', price: 9000,  unit: '/kotak', badge: null,          popular: false },

  // RUMAH TANGGA
  { id: 16, name: 'Sabun Mandi Batang',  cat: 'rumah',    emoji: '🧼', price: 4500,  unit: '/biji',  badge: null,          popular: false },
  { id: 17, name: 'Detergen Bubuk 1kg',  cat: 'rumah',    emoji: '🫧', price: 16000, unit: '/bks',   badge: 'Bersih',     popular: false },
  { id: 18, name: 'Sabun Cuci Piring',   cat: 'rumah',    emoji: '🧽', price: 8500,  unit: '/botol', badge: null,          popular: false },
  { id: 19, name: 'Tisu Wajah 200 Lbr', cat: 'rumah',    emoji: '🧻', price: 11000, unit: '/kotak', badge: null,          popular: false },
  { id: 20, name: 'Kantong Plastik',     cat: 'rumah',    emoji: '🛍️', price: 5000,  unit: '/roll',  badge: null,          popular: false },
];

const CAT_LABELS = {
  semua:   { label: 'Semua',          emoji: '🛒' },
  sembako: { label: 'Sembako',        emoji: '🌾' },
  dapur:   { label: 'Dapur',          emoji: '🍳' },
  snack:   { label: 'Snack & Minum',  emoji: '☕' },
  rumah:   { label: 'Rumah Tangga',   emoji: '🏠' },
};

// ─────────────────────────────────────────────────────────────
// STATE APLIKASI
// ─────────────────────────────────────────────────────────────
const state = {
  cart: {},           // { productId: qty }
  activeFilter: 'semua',
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const formatRp = (n) => 'Rp ' + n.toLocaleString('id-ID');

function getStoreStatus() {
  const now  = new Date();
  const day  = now.getDay();
  const hour = now.getHours();
  const hrs  = CONFIG.hours[day];
  if (!hrs) return { open: false, label: 'Tutup Hari Ini', next: null };
  const [open, close] = hrs;
  if (hour >= open && hour < close) {
    return { open: true, label: `Buka • Tutup pk ${close}.00`, next: null };
  }
  if (hour < open) {
    return { open: false, label: `Buka pk ${open}.00`, next: open };
  }
  // Sudah tutup, cari hari berikutnya
  const DAY_NAMES = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  for (let i = 1; i <= 7; i++) {
    const nd = (day + i) % 7;
    if (CONFIG.hours[nd]) {
      return {
        open: false,
        label: `Buka ${DAY_NAMES[nd]} pk ${CONFIG.hours[nd][0]}.00`,
        next: null
      };
    }
  }
  return { open: false, label: 'Sementara Tutup', next: null };
}

function getDayName(dayIndex) {
  return ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][dayIndex];
}

function cartTotal() {
  return Object.entries(state.cart).reduce((sum, [id, qty]) => {
    const p = PRODUCTS.find(p => p.id === +id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

function cartItemCount() {
  return Object.values(state.cart).reduce((a, b) => a + b, 0);
}

// ─────────────────────────────────────────────────────────────
// TOAST SYSTEM
// ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : 'ℹ️'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2900);
}

// ─────────────────────────────────────────────────────────────
// RENDER: STATUS TOKO
// ─────────────────────────────────────────────────────────────
function renderStoreStatus() {
  const status = getStoreStatus();

  // Hero badge
  const heroBadge = document.getElementById('heroStatusBadge');
  if (heroBadge) {
    heroBadge.className = `badge ${status.open ? 'badge--open' : 'badge--closed'}`;
    heroBadge.innerHTML = `<span>${status.open ? '🟢' : '🔴'}</span> ${status.label}`;
  }

  // Navbar WA btn tooltip
  const navStatus = document.getElementById('navStatus');
  if (navStatus) {
    navStatus.textContent = status.open ? 'Buka Sekarang' : 'Pesan Dulu';
  }

  // Jam tabel
  const now = new Date();
  const today = now.getDay();
  document.querySelectorAll('.hours-row').forEach(row => {
    const d = parseInt(row.dataset.day, 10);
    if (d === today) row.classList.add('today');
  });
}

// ─────────────────────────────────────────────────────────────
// RENDER: PRODUK GRID
// ─────────────────────────────────────────────────────────────
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map(p => {
    const inCart   = (state.cart[p.id] || 0) > 0;
    const qty      = state.cart[p.id] || 0;
    const filtered = state.activeFilter !== 'semua' && p.cat !== state.activeFilter;

    return `
      <article class="product-card${filtered ? ' hidden' : ''}" id="pc-${p.id}" data-cat="${p.cat}">
        <div class="product-card__emoji-wrap">
          <span role="img" aria-label="${p.name}">${p.emoji}</span>
          ${p.badge ? `<span class="product-card__badge">${p.badge}</span>` : ''}
        </div>
        <div class="product-card__body">
          <div class="product-card__cat">${CAT_LABELS[p.cat]?.label || p.cat}</div>
          <div class="product-card__name">${p.name}</div>
          <div class="product-card__price">${formatRp(p.price)} <small>${p.unit}</small></div>
          ${inCart
            ? `<div class="product-card__qty">
                 <button class="qty-btn" onclick="changeQty(${p.id}, -1)" aria-label="Kurangi">−</button>
                 <span class="qty-display">${qty}</span>
                 <button class="qty-btn" onclick="changeQty(${p.id}, 1)" aria-label="Tambah">+</button>
               </div>`
            : `<button class="product-card__add-btn" onclick="addToCart(${p.id})" id="addbtn-${p.id}">
                 <span>🛒 Tambah Pesanan</span>
                 <span>+</span>
               </button>`
          }
        </div>
      </article>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// RENDER: KERANJANG MODAL
// ─────────────────────────────────────────────────────────────
function renderCart() {
  const body    = document.getElementById('cartBody');
  const total   = document.getElementById('cartTotal');
  const sendBtn = document.getElementById('sendToWA');
  if (!body) return;

  const items = Object.entries(state.cart).filter(([,qty]) => qty > 0);

  if (items.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <p>Keranjang belanja Anda kosong.<br>Pilih produk dulu, yuk!</p>
      </div>`;
    if (total) total.textContent = 'Rp 0';
    if (sendBtn) sendBtn.disabled = true;
    return;
  }

  body.innerHTML = items.map(([id, qty]) => {
    const p = PRODUCTS.find(p => p.id === +id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <div class="cart-item__emoji">${p.emoji}</div>
        <div class="cart-item__info">
          <div class="cart-item__name">${p.name}</div>
          <div class="cart-item__price">${formatRp(p.price)} ${p.unit}</div>
        </div>
        <div class="cart-item__controls">
          <button class="qty-btn" onclick="changeQtyCart(${p.id}, -1)" aria-label="Kurangi">−</button>
          <span class="qty-display">${qty}</span>
          <button class="qty-btn" onclick="changeQtyCart(${p.id}, 1)" aria-label="Tambah">+</button>
        </div>
        <div class="cart-item__subtotal">${formatRp(p.price * qty)}</div>
      </div>`;
  }).join('');

  const tot = cartTotal();
  if (total) total.textContent = formatRp(tot);
  if (sendBtn) {
    sendBtn.disabled = false;
    const belumMin = tot < CONFIG.deliveryMin;
    sendBtn.querySelector('.btn-wa-note').textContent =
      belumMin ? `Min. antar ${formatRp(CONFIG.deliveryMin)}` : 'Kirim ke WhatsApp Toko ✓';
  }
}

// ─────────────────────────────────────────────────────────────
// RENDER: FAB COUNT
// ─────────────────────────────────────────────────────────────
function updateFAB() {
  const fab   = document.getElementById('cartFAB');
  const count = document.getElementById('cartCount');
  const total = cartItemCount();

  if (!fab) return;
  fab.classList.toggle('visible', total > 0);
  if (count) count.textContent = total;
}

// ─────────────────────────────────────────────────────────────
// CART ACTIONS
// ─────────────────────────────────────────────────────────────
function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  const p = PRODUCTS.find(p => p.id === id);
  showToast(`${p?.emoji || '✅'} ${p?.name} ditambahkan!`);
  renderProducts();
  updateFAB();
}

function changeQty(id, delta) {
  const current = state.cart[id] || 0;
  const next    = current + delta;
  if (next <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = next;
  }
  renderProducts();
  renderCart();
  updateFAB();
}

function changeQtyCart(id, delta) {
  const current = state.cart[id] || 0;
  const next    = current + delta;
  if (next <= 0) {
    delete state.cart[id];
  } else {
    state.cart[id] = next;
  }
  renderCart();
  renderProducts();
  updateFAB();
}

// ─────────────────────────────────────────────────────────────
// MODAL KERANJANG
// ─────────────────────────────────────────────────────────────
function openCart() {
  renderCart();
  const overlay = document.getElementById('cartModal');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const overlay = document.getElementById('cartModal');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────────────────
// WHATSAPP ORDER BUILDER
// ─────────────────────────────────────────────────────────────
function sendToWhatsApp(prefillMessage) {
  let message = '';

  if (prefillMessage) {
    // Pesan cepat dari CTA utama (tanpa keranjang)
    message = prefillMessage;
  } else {
    // Dari keranjang belanja
    const items = Object.entries(state.cart).filter(([,qty]) => qty > 0);
    if (items.length === 0) {
      showToast('Keranjang masih kosong!', 'info');
      return;
    }

    const lines = items.map(([id, qty]) => {
      const p = PRODUCTS.find(p => p.id === +id);
      return `• ${p.name} x${qty} = ${formatRp(p.price * qty)}`;
    });

    const total = cartTotal();
    message = [
      CONFIG.waGreeting,
      '',
      '*DAFTAR BELANJA:*',
      ...lines,
      '',
      `*Total Estimasi: ${formatRp(total)}*`,
      '',
      'Mohon konfirmasi ketersediaan & total akhir ya kak 🙏',
      '_Pesan melalui Website Toko Rini_'
    ].join('\n');
  }

  const encoded = encodeURIComponent(message);
  const cleanNumber = (CONFIG.waNumber || '').replace(/\D/g, '');
  const waUrl = cleanNumber
    ? `https://wa.me/${cleanNumber}?text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

// ─────────────────────────────────────────────────────────────
// FILTER PRODUK
// ─────────────────────────────────────────────────────────────
function setFilter(cat) {
  state.activeFilter = cat;

  // Update tombol filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  // Update kartu produk
  document.querySelectorAll('.product-card').forEach(card => {
    const cardCat = card.dataset.cat;
    card.classList.toggle('hidden', cat !== 'semua' && cardCat !== cat);
  });

  // Update quick access chips
  document.querySelectorAll('.qa-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.cat === cat);
  });
}

// ─────────────────────────────────────────────────────────────
// FAQ ACCORDION
// ─────────────────────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Tutup semua
      document.querySelectorAll('.faq-item.open').forEach(el => el.classList.remove('open'));

      // Buka yang diklik (jika belum buka)
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ─────────────────────────────────────────────────────────────
// NAVBAR SCROLL EFFECT
// ─────────────────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('mainNavbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// ─────────────────────────────────────────────────────────────
// SCROLL REVEAL
// ─────────────────────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ─────────────────────────────────────────────────────────────
// QUICK ACCESS CATEGORY SHORTCUT
// ─────────────────────────────────────────────────────────────
function initQuickAccess() {
  document.querySelectorAll('.qa-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      setFilter(cat);
      const productsSection = document.getElementById('produkSection');
      if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// SMOOTH SCROLL UNTUK LINK NAVIGASI
// ─────────────────────────────────────────────────────────────
function initSmoothLinks() {
  document.querySelectorAll('[data-scroll]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(el.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// TUTUP MODAL SAAT KLIK OVERLAY
// ─────────────────────────────────────────────────────────────
function initModalOverlay() {
  const overlay = document.getElementById('cartModal');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCart();
  });
}

// ─────────────────────────────────────────────────────────────
// GREETING DINAMIS BERDASARKAN JAM
// ─────────────────────────────────────────────────────────────
function setGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour >= 5  && hour < 11) greeting = '🌅 Selamat pagi!';
  else if (hour >= 11 && hour < 15) greeting = '☀️ Selamat siang!';
  else if (hour >= 15 && hour < 19) greeting = '🌤️ Selamat sore!';
  else greeting = '🌙 Selamat malam!';

  const el = document.getElementById('heroGreeting');
  if (el) el.textContent = greeting;
}

// ─────────────────────────────────────────────────────────────
// POPULASI JAM OPERASIONAL
// ─────────────────────────────────────────────────────────────
function renderHoursTable() {
  const table = document.getElementById('hoursTable');
  if (!table) return;

  const dayLabels = {
    1: 'Senin', 2: 'Selasa', 3: 'Rabu',
    4: 'Kamis', 5: 'Jumat', 6: 'Sabtu', 0: 'Minggu'
  };

  const ordered = [1, 2, 3, 4, 5, 6, 0];
  table.innerHTML = ordered.map(d => {
    const hrs = CONFIG.hours[d];
    return `
      <div class="hours-row" data-day="${d}">
        <span class="hours-row__day">${dayLabels[d]}</span>
        <span class="hours-row__time ${hrs ? '' : 'closed'}">${
          hrs ? `${String(hrs[0]).padStart(2,'0')}.00 – ${String(hrs[1]).padStart(2,'0')}.00`
              : 'Tutup'
        }</span>
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────────────────────────
// INISIALISASI
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  renderStoreStatus();
  renderHoursTable();
  renderProducts();
  updateFAB();

  initNavbar();
  initScrollReveal();
  initFAQ();
  initQuickAccess();
  initSmoothLinks();
  initModalOverlay();

  // Update status setiap menit
  setInterval(renderStoreStatus, 60 * 1000);
});

// Ekspor fungsi global yang dibutuhkan oleh HTML inline handlers
window.addToCart      = addToCart;
window.changeQty      = changeQty;
window.changeQtyCart  = changeQtyCart;
window.openCart       = openCart;
window.closeCart      = closeCart;
window.sendToWhatsApp = sendToWhatsApp;
window.setFilter      = setFilter;

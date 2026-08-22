let html5QrCode = null;
let isScanning = false;
let products = [];
let currentEditIndex = -1;

const readerId = 'reader';
const productsList = document.getElementById('products-list');
const productCount = document.getElementById('product-count');
const lastScan = document.getElementById('last-scan');
const lastScanValue = document.getElementById('last-scan-value');
const btnToggle = document.getElementById('btn-toggle-scan');
const btnFile = document.getElementById('btn-file');
const fileInput = document.getElementById('file-input');
const btnClearAll = document.getElementById('btn-clear-all');

const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const btnCancel = document.getElementById('btn-cancel');
const btnSave = document.getElementById('btn-save');
const btnApplyDiscount = document.getElementById('btn-apply-discount');

const modalBarcode = document.getElementById('modal-barcode');
const modalName = document.getElementById('modal-name');
const modalOriginal = document.getElementById('modal-original');
const modalNew = document.getElementById('modal-new');
const modalDiscount = document.getElementById('modal-discount');
const priceDiff = document.getElementById('price-diff');

const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

const manualBarcode = document.getElementById('manual-barcode');
const btnManual = document.getElementById('btn-manual');

function formatPrice(n) {
  return n === null || n === undefined || isNaN(n)
    ? '—'
    : n.toFixed(2).replace('.', ',') + ' €';
}

function showToast(msg) {
  toastMessage.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function openModal() {
  modal.classList.add('active');
  modalName.focus();
}

function closeModal() {
  modal.classList.remove('active');
  currentEditIndex = -1;
}

function updatePriceDiff() {
  const orig = parseFloat(modalOriginal.value) || 0;
  const neu = parseFloat(modalNew.value) || 0;
  if (orig === 0 && neu === 0) {
    priceDiff.className = 'price-diff same';
    priceDiff.textContent = 'Inserisci i prezzi per vedere la differenza';
    return;
  }
  const diff = neu - orig;
  const pct = orig > 0 ? ((diff / orig) * 100).toFixed(1) : 0;
  if (diff > 0) {
    priceDiff.className = 'price-diff increase';
    priceDiff.textContent = '+' + formatPrice(diff) + ' (+' + pct + '%)';
  } else if (diff < 0) {
    priceDiff.className = 'price-diff decrease';
    priceDiff.textContent = formatPrice(diff) + ' (' + pct + '%)';
  } else {
    priceDiff.className = 'price-diff same';
    priceDiff.textContent = 'Nessuna differenza di prezzo';
  }
}

async function startScanner() {
  if (isScanning) return;
  try {
    html5QrCode = new Html5Qrcode(readerId);
    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 180 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.PDF_417
        ]
      },
      onScanSuccess,
      onScanFailure
    );
    isScanning = true;
    btnToggle.classList.add('active');
    btnToggle.querySelector('span').textContent = 'Ferma Scanner';
    document.querySelector('.scan-overlay').style.display = 'flex';
  } catch (err) {
    showToast('Errore fotocamera: ' + err.message);
    console.error(err);
  }
}

async function stopScanner() {
  if (!isScanning || !html5QrCode) return;
  try {
    await html5QrCode.stop();
    html5QrCode.clear();
  } catch (e) {}
  isScanning = false;
  btnToggle.classList.remove('active');
  btnToggle.querySelector('span').textContent = 'Avvia Scanner';
  document.querySelector('.scan-overlay').style.display = 'none';
}

function onScanSuccess(decodedText) {
  if (!decodedText) return;
  stopScanner();
  lastScan.style.display = 'flex';
  lastScanValue.textContent = decodedText;
  const existing = products.findIndex(p => p.barcode === decodedText);
  if (existing >= 0) {
    openEditModal(existing);
    showToast('Prodotto già esistente - modifica aperto');
  } else {
    openNewModal(decodedText);
    showToast('Codice scannerizzato: ' + decodedText);
  }
}

function onScanFailure(err) {}

function openNewModal(barcode) {
  currentEditIndex = -1;
  modalBarcode.textContent = barcode;
  modalName.value = '';
  modalOriginal.value = '';
  modalNew.value = '';
  modalDiscount.value = '';
  priceDiff.className = 'price-diff same';
  priceDiff.textContent = 'Inserisci i prezzi per vedere la differenza';
  openModal();
}

function openEditModal(index) {
  currentEditIndex = index;
  const p = products[index];
  modalBarcode.textContent = p.barcode;
  modalName.value = p.name || '';
  modalOriginal.value = p.originalPrice !== null ? p.originalPrice : '';
  modalNew.value = p.newPrice !== null ? p.newPrice : '';
  modalDiscount.value = '';
  updatePriceDiff();
  openModal();
}

function saveProduct() {
  const barcode = modalBarcode.textContent;
  const name = modalName.value.trim() || 'Prodotto senza nome';
  const original = parseFloat(modalOriginal.value) || null;
  const newPrice = parseFloat(modalNew.value) || null;
  if (currentEditIndex >= 0) {
    products[currentEditIndex] = { barcode, name, originalPrice: original, newPrice };
    showToast('Prodotto aggiornato!');
  } else {
    products.unshift({ barcode, name, originalPrice: original, newPrice });
    showToast('Prodotto aggiunto!');
  }
  renderProducts();
  closeModal();
}

function deleteProduct(index) {
  products.splice(index, 1);
  renderProducts();
  showToast('Prodotto eliminato');
}

function clearAll() {
  if (!confirm('Sei sicuro di voler cancellare tutti i prodotti?')) return;
  products = [];
  renderProducts();
  showToast('Tutti i prodotti eliminati');
}

function handleManualBarcode() {
  const code = manualBarcode.value.trim();
  if (!code) {
    showToast('Inserisci un codice');
    return;
  }
  onScanSuccess(code);
  manualBarcode.value = '';
}

function renderProducts() {
  productCount.textContent = products.length;
  if (products.length === 0) {
    productsList.innerHTML =
      '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg></div><h3>Nessun prodotto ancora</h3><p>Scannerizza un codice a barre per iniziare a modificare i prezzi</p></div>';
    return;
  }
  productsList.innerHTML = products
    .map((p, i) => {
      const diff = p.originalPrice && p.newPrice ? p.newPrice - p.originalPrice : 0;
      const pct = p.originalPrice && p.originalPrice > 0 ? ((diff / p.originalPrice) * 100).toFixed(0) : 0;
      const hasDiscount = diff < 0;
      const hasIncrease = diff > 0;
      return (
        '<div class="product-card" onclick="openEditModal(' + i + ')">' +
        '<div class="product-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg></div>' +
        '<div class="product-details"><div class="product-barcode">' + p.barcode + '</div><div class="product-name">' + p.name + '</div></div>' +
        '<div class="product-prices">' +
        '<span class="price-original">' + formatPrice(p.originalPrice) + '</span>' +
        '<span class="price-arrow-sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></span>' +
        '<span class="price-new">' + formatPrice(p.newPrice) + '</span>' +
        (hasDiscount ? '<span class="badge-discount">-' + Math.abs(pct) + '%</span>' : '') +
        (hasIncrease ? '<span class="badge-discount" style="background:var(--danger);color:#fff">+' + pct + '%</span>' : '') +
        '</div>' +
        '<div class="product-actions" onclick="event.stopPropagation()">' +
        '<button class="btn-edit" onclick="openEditModal(' + i + ')" title="Modifica"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>' +
        '<button class="btn-delete" onclick="deleteProduct(' + i + ')" title="Elimina"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>' +
        '</div></div>'
      );
    })
    .join('');
}

btnToggle.addEventListener('click', () => {
  if (isScanning) stopScanner();
  else startScanner();
});

btnFile.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const scanner = new Html5Qrcode(readerId);
    const result = await scanner.scanFile(file, true);
    onScanSuccess(result);
    scanner.clear();
  } catch (err) {
    showToast("Nessun codice trovato nell'immagine");
  }
  fileInput.value = '';
});

btnManual.addEventListener('click', handleManualBarcode);
manualBarcode.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleManualBarcode();
});

btnClearAll.addEventListener('click', clearAll);
modalClose.addEventListener('click', closeModal);
btnCancel.addEventListener('click', closeModal);
btnSave.addEventListener('click', saveProduct);

btnApplyDiscount.addEventListener('click', () => {
  const orig = parseFloat(modalOriginal.value) || 0;
  const disc = parseFloat(modalDiscount.value) || 0;
  if (orig > 0 && disc >= 0 && disc <= 100) {
    modalNew.value = (orig * (1 - disc / 100)).toFixed(2);
    updatePriceDiff();
  }
});

modalOriginal.addEventListener('input', updatePriceDiff);
modalNew.addEventListener('input', updatePriceDiff);

modal.addEventListener('click', e => {
  if (e.target === modal || e.target.classList.contains('modal-backdrop')) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
});

renderProducts();

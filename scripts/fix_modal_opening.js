const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'web', 'index.html');
const stylesCssPath = path.join(__dirname, '..', 'web', 'styles.css');
const appJsPath = path.join(__dirname, '..', 'web', 'app.js');

let html = fs.readFileSync(indexHtmlPath, 'utf8');
let css = fs.readFileSync(stylesCssPath, 'utf8');
let js = fs.readFileSync(appJsPath, 'utf8');

// ==============================================================================
// 1. ATUALIZAR VERSÃO DE CACHE NO index.html (v=36 -> v=37)
// ==============================================================================
html = html.replace(/styles\.css\?v=\d+/g, 'styles.css?v=37');
html = html.replace(/app\.js\?v=\d+/g, 'app.js?v=37');
fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log('✅ Cache buster atualizado para v=37 no index.html');

// ==============================================================================
// 2. GARANTIR DISPLAY: FLEX !IMPORTANT NO CSS (.ad-modal-backdrop)
// ==============================================================================
const cssTarget = '.ad-modal-backdrop {';
const cssReplacement = `.ad-modal-backdrop {
  display: none;`;

if (css.includes(cssTarget) && !css.includes('.ad-modal-backdrop.active')) {
  css = css.replace(cssTarget, cssReplacement);
  css += `

.ad-modal-backdrop.active,
.ad-modal-backdrop[style*="display: flex"] {
  display: flex !important;
}
`;
  fs.writeFileSync(stylesCssPath, css, 'utf8');
  console.log('✅ Regras de exibição garantida adicionadas ao styles.css');
}

// ==============================================================================
// 3. ATUALIZAR FUNÇÕES DE CONTROLE NO app.js (100% BLINDADAS E RESILIENTES)
// ==============================================================================
const safeJsCode = `
// ==============================================================================
// TRAMPOU ADS: CONTROLADOR DO CHECKOUT (BLINDADO E RESILIENTE)
// ==============================================================================
function openAdvertiseModal(preselectedPlacement) {
  try {
    const modal = document.getElementById('modal-advertise-checkout');
    if (!modal) {
      console.error('Modal #modal-advertise-checkout não encontrado!');
      return;
    }

    // 1. Abre o modal imediatamente
    modal.classList.add('active');
    modal.style.display = 'flex';

    // 2. Reseta visibilidade das etapas
    const stepForm = document.getElementById('ad-step-form');
    const stepPix = document.getElementById('ad-step-pix');
    const stepSuccess = document.getElementById('ad-step-success');
    const stickyFooter = document.getElementById('ad-checkout-sticky-footer');

    if (stepForm) stepForm.style.display = 'block';
    if (stepPix) stepPix.style.display = 'none';
    if (stepSuccess) stepSuccess.style.display = 'none';
    if (stickyFooter) stickyFooter.style.display = 'flex';

    // 3. Preseleciona opções
    selectAdPlacementOption(preselectedPlacement || 'home_feed');
    selectAdDurationOption(15, 49.90);

    // 4. Preenche dados do usuário se logado
    try {
      const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
      const advInput = document.getElementById('ad-input-advertiser');
      const phoneInput = document.getElementById('ad-input-phone');
      const emailInput = document.getElementById('ad-input-email');
      const cityInput = document.getElementById('ad-input-city');

      if (advInput && user && user.name && !advInput.value) advInput.value = user.name;
      if (phoneInput && user && user.phone && !phoneInput.value) phoneInput.value = user.phone;
      if (emailInput && user && user.email && !emailInput.value) emailInput.value = user.email;
      if (cityInput) {
        const loc = (typeof currentActiveLocation !== 'undefined' && currentActiveLocation) ? currentActiveLocation : { city: 'Parauapebas', state: 'PA' };
        cityInput.value = \`\${loc.city || 'Parauapebas'}, \${loc.state || 'PA'}\`;
      }
    } catch (_) {}

    // 5. Atualiza resumos e prévia
    updateLiveAdPreview();
    updateFooterSummary();

  } catch (err) {
    console.error('Erro em openAdvertiseModal:', err);
  }
}
window.openAdvertiseModal = openAdvertiseModal;

function closeAdvertiseModal() {
  try {
    if (activePixPollingTimer) {
      clearInterval(activePixPollingTimer);
      activePixPollingTimer = null;
    }
    const modal = document.getElementById('modal-advertise-checkout');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  } catch (err) {
    console.warn('Erro ao fechar modal:', err);
  }
}
window.closeAdvertiseModal = closeAdvertiseModal;

function updateLiveAdPreview() {
  try {
    const advInput = document.getElementById('ad-input-advertiser');
    const titleInput = document.getElementById('ad-input-title');
    const descInput = document.getElementById('ad-input-desc');
    const ctaInput = document.getElementById('ad-input-cta-text');

    const adv = (advInput && advInput.value ? advInput.value.trim() : '') || 'Sua Empresa ou Negócio';
    const title = (titleInput && titleInput.value ? titleInput.value.trim() : '') || 'Título do seu anúncio em destaque no app';
    const desc = (descInput && descInput.value ? descInput.value.trim() : '') || 'Apresente sua oferta, diferencial ou serviços para clientes locais.';
    const cta = (ctaInput && ctaInput.value ? ctaInput.value : '') || 'Chamar no WhatsApp';
    const loc = (typeof currentActiveLocation !== 'undefined' && currentActiveLocation) ? currentActiveLocation : { city: 'Parauapebas', state: 'PA' };

    const prevAdv = document.getElementById('ad-live-preview-advertiser');
    const prevTitle = document.getElementById('ad-live-preview-title');
    const prevDesc = document.getElementById('ad-live-preview-desc');
    const prevCta = document.getElementById('ad-live-preview-cta');
    const prevCity = document.getElementById('ad-live-preview-city');
    const prevImg = document.getElementById('ad-live-preview-img');

    if (prevAdv) prevAdv.innerText = adv;
    if (prevTitle) prevTitle.innerText = title;
    if (prevDesc) prevDesc.innerText = desc;
    if (prevCity) prevCity.innerText = \`\${loc.city || 'Parauapebas'}, \${loc.state || 'PA'}\`;
    if (prevCta) prevCta.innerHTML = \`\${cta} <i class="fa-brands fa-whatsapp"></i>\`;

    if (prevImg) {
      if (typeof currentAdUploadedImage !== 'undefined' && currentAdUploadedImage) {
        prevImg.src = currentAdUploadedImage;
      } else {
        prevImg.src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80';
      }
    }
  } catch (err) {
    console.warn('updateLiveAdPreview avisou:', err);
  }
}
window.updateLiveAdPreview = updateLiveAdPreview;
`;

// Substitui a seção de openAdvertiseModal no app.js
const openFnStart = js.indexOf('function openAdvertiseModal(');
const openFnEnd = js.indexOf('window.openAdvertiseModal = openAdvertiseModal;', openFnStart);

if (openFnStart !== -1 && openFnEnd !== -1) {
  const replaceEnd = openFnEnd + 'window.openAdvertiseModal = openAdvertiseModal;'.length;
  js = js.slice(0, openFnStart) + safeJsCode.trim() + '\n' + js.slice(replaceEnd);
} else {
  js += '\n' + safeJsCode;
}

fs.writeFileSync(appJsPath, js, 'utf8');
console.log('✅ openAdvertiseModal e updateLiveAdPreview blindadas com sucesso no app.js');

const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '../web/index.html');
const appJsPath = path.join(__dirname, '../web/app.js');
const stylesCssPath = path.join(__dirname, '../web/styles.css');

let html = fs.readFileSync(indexHtmlPath, 'utf8');
let js = fs.readFileSync(appJsPath, 'utf8');
let css = fs.readFileSync(stylesCssPath, 'utf8');

// 1. INJETAR O BOTÃO DE ACESSO AO ANÚNCIO NA ABA PERFIL
const profileMenuTarget = `<div class="menu-item" onclick="openShareAppModal()">
                <i class="fa-solid fa-share-nodes icon-purple"></i>
                <div class="menu-text">
                  <span>Indicar o Trampou</span>
                  <small>Compartilhe o app com amigos e vizinhos</small>
                </div>
                <i class="fa-solid fa-chevron-right"></i>
              </div>`;

const advertiseMenuItem = `<div class="menu-item advertise-menu-highlight" onclick="openAdvertiseModal()" style="background: linear-gradient(135deg, #FAF5FF, #F5F3FF); border-left: 3.5px solid #7C3AED; cursor: pointer;">
                <i class="fa-solid fa-rectangle-ad" style="color: #7C3AED; font-size: 18px;"></i>
                <div class="menu-text">
                  <span style="font-weight: 700; color: #6D28D9;">Anunciar no Trampou</span>
                  <small>Divulgue sua empresa e receba contatos no WhatsApp</small>
                </div>
                <span class="badge-pill-novo" style="font-size: 10px; background: #7C3AED; color: #FFF; padding: 2px 7px; border-radius: 10px; font-weight: 700;">PIX</span>
              </div>
              ${profileMenuTarget}`;

if (html.includes(profileMenuTarget) && !html.includes('openAdvertiseModal')) {
  html = html.replace(profileMenuTarget, advertiseMenuItem);
  console.log('✅ Botão de Anunciar adicionado na aba Perfil');
}

// 2. INJETAR O MODAL DE CONTRATAÇÃO DE ANÚNCIOS NO index.html
const modalHtml = `
  <!-- ==============================================================================
       MODAL DE CONTRATAÇÃO DE ANÚNCIOS TRAMPOU ADS (PAGAMENTO PIX MERCADO PAGO)
       ============================================================================== -->
  <div id="modal-advertise-checkout" class="modal-overlay" style="z-index: 1060; display: none;">
    <div class="modal-content ad-checkout-content" style="max-width: 480px; width: 95%; max-height: 90vh; border-radius: 18px; padding: 0; overflow: hidden; display: flex; flex-direction: column;">
      
      <!-- Cabeçalho do Modal -->
      <div class="ad-checkout-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="ad-checkout-icon-badge">
            <i class="fa-solid fa-bullhorn"></i>
          </div>
          <div>
            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #1E1B4B;">Anunciar no Trampou</h4>
            <span style="font-size: 11.5px; color: #64748B;">Divulgue seu negócio para milhares de clientes</span>
          </div>
        </div>
        <button type="button" class="ad-checkout-close" onclick="closeAdvertiseModal()" title="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Corpo do Modal com Scroll -->
      <div class="ad-checkout-body" id="ad-checkout-body-content" style="overflow-y: auto; padding: 16px; flex: 1;">
        
        <!-- ETAPA 1: FORMULÁRIO DO ANÚNCIO & SELEÇÃO DE PACOTE -->
        <div id="ad-step-form">
          
          <!-- Escolha do Posicionamento -->
          <div class="ad-form-section">
            <label class="ad-form-label"><i class="fa-solid fa-layer-group"></i> 1. Onde você quer anunciar?</label>
            <div class="ad-placements-grid">
              <label class="ad-placement-option active" data-placement="home_feed" onclick="selectAdPlacementOption('home_feed')">
                <input type="radio" name="ad_placement_input" value="home_feed" checked style="display: none;">
                <div class="ad-placement-top">
                  <i class="fa-solid fa-newspaper" style="color: #7C3AED;"></i>
                  <span class="ad-placement-badge">Popular</span>
                </div>
                <strong>Feed da Home</strong>
                <small>Card integrado entre os destaques</small>
              </label>

              <label class="ad-placement-option" data-placement="search_sponsored" onclick="selectAdPlacementOption('search_sponsored')">
                <input type="radio" name="ad_placement_input" value="search_sponsored" style="display: none;">
                <div class="ad-placement-top">
                  <i class="fa-solid fa-magnifying-glass" style="color: #2563EB;"></i>
                  <span class="ad-placement-badge" style="background: #EFF6FF; color: #1D4ED8;">Alta Conversão</span>
                </div>
                <strong>Busca & Categorias</strong>
                <small>Topo da lista de pesquisa</small>
              </label>

              <label class="ad-placement-option" data-placement="profile_footer" onclick="selectAdPlacementOption('profile_footer')">
                <input type="radio" name="ad_placement_input" value="profile_footer" style="display: none;">
                <div class="ad-placement-top">
                  <i class="fa-solid fa-handshake" style="color: #059669;"></i>
                  <span class="ad-placement-badge" style="background: #ECFDF5; color: #047857;">Parceiro</span>
                </div>
                <strong>Rodapé do Perfil</strong>
                <small>Aparece em todos os prestadores</small>
              </label>

              <label class="ad-placement-option" data-placement="home_carousel" onclick="selectAdPlacementOption('home_carousel')">
                <input type="radio" name="ad_placement_input" value="home_carousel" style="display: none;">
                <div class="ad-placement-top">
                  <i class="fa-solid fa-images" style="color: #D97706;"></i>
                  <span class="ad-placement-badge" style="background: #FFFBEB; color: #B45309;">Nobre</span>
                </div>
                <strong>Carrossel Topo</strong>
                <small>Banner deslizante no topo</small>
              </label>
            </div>
          </div>

          <!-- Escolha do Período Avulso -->
          <div class="ad-form-section" style="margin-top: 16px;">
            <label class="ad-form-label"><i class="fa-solid fa-calendar-days"></i> 2. Escolha o período (Sem mensalidade):</label>
            <div class="ad-durations-row">
              <div class="ad-duration-pill" data-days="7" data-price="29.90" onclick="selectAdDurationOption(7, 29.90)">
                <span>7 dias</span>
                <strong>R$ 29,90</strong>
              </div>
              <div class="ad-duration-pill active" data-days="15" data-price="49.90" onclick="selectAdDurationOption(15, 49.90)">
                <span class="ad-duration-tag">Recomendado</span>
                <span>15 dias</span>
                <strong>R$ 49,90</strong>
              </div>
              <div class="ad-duration-pill" data-days="30" data-price="89.90" onclick="selectAdDurationOption(30, 89.90)">
                <span>30 dias</span>
                <strong>R$ 89,90</strong>
              </div>
            </div>
          </div>

          <!-- Dados do Anúncio -->
          <div class="ad-form-section" style="margin-top: 16px;">
            <label class="ad-form-label"><i class="fa-solid fa-pen-to-square"></i> 3. Dados do Anúncio:</label>
            
            <div class="ad-input-group">
              <label>Nome da Empresa / Anunciante *</label>
              <input type="text" id="ad-input-advertiser" placeholder="Ex: Disk Caçambas Carajás, Tintas & Cores" required>
            </div>

            <div class="ad-input-group">
              <label>Título do Anúncio (Destaque Principal) *</label>
              <input type="text" id="ad-input-title" placeholder="Ex: Locação de Caçambas 24h com 15% OFF" required>
            </div>

            <div class="ad-input-group">
              <label>Descrição ou Oferta (opcional)</label>
              <textarea id="ad-input-desc" rows="2" placeholder="Ex: Entulho, poda e reformas com descarte legalizado em toda a cidade."></textarea>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="ad-input-group">
                <label>WhatsApp / Telefone *</label>
                <input type="tel" id="ad-input-phone" placeholder="(94) 99123-4567" required>
              </div>
              <div class="ad-input-group">
                <label>Seu E-mail (Comprovante) *</label>
                <input type="email" id="ad-input-email" placeholder="financeiro@empresa.com" required>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="ad-input-group">
                <label>Texto do Botão</label>
                <input type="text" id="ad-input-cta-text" value="Chamar no WhatsApp">
              </div>
              <div class="ad-input-group">
                <label>Cidade de Veiculação</label>
                <input type="text" id="ad-input-city" value="Parauapebas, PA" readonly style="background: #F1F5F9; color: #64748B;">
              </div>
            </div>

            <!-- Upload de Foto do Anúncio / Banner -->
            <div class="ad-input-group" style="margin-top: 6px;">
              <label>Foto, Flyer ou Logomarca do Anúncio (Opcional)</label>
              <div class="ad-upload-box" onclick="document.getElementById('ad-file-input').click()">
                <input type="file" id="ad-file-input" accept="image/*" style="display: none;" onchange="handleAdImageFile(event)">
                <div id="ad-upload-placeholder" style="text-align: center; padding: 14px;">
                  <i class="fa-solid fa-cloud-arrow-up" style="font-size: 24px; color: #7C3AED; margin-bottom: 6px;"></i>
                  <p style="margin: 0; font-size: 12.5px; font-weight: 600; color: #1E293B;">Toque para enviar uma imagem da sua galeria</p>
                  <span style="font-size: 11px; color: #94A3B8;">JPG, PNG ou WEBP (Otimizado automaticamente)</span>
                </div>
                <div id="ad-upload-preview-wrap" style="display: none; position: relative;">
                  <img id="ad-upload-preview" src="" alt="Prévia do Anúncio" style="width: 100%; height: 140px; object-fit: cover; border-radius: 10px; display: block;">
                  <button type="button" class="btn-remove-ad-img" onclick="event.stopPropagation(); removeAdImagePreview();" title="Trocar imagem">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Botão Gerar PIX -->
          <div class="ad-checkout-actions" style="margin-top: 20px;">
            <button type="button" class="btn-generate-pix" id="btn-submit-ad-pix" onclick="submitAdAndGeneratePix()">
              <i class="fa-brands fa-pix" style="font-size: 18px;"></i>
              <span id="btn-submit-pix-label">Gerar Pagamento PIX (R$ 49,90)</span>
            </button>
          </div>

        </div>

        <!-- ETAPA 2: TELA DE PAGAMENTO PIX MERCADO PAGO -->
        <div id="ad-step-pix" style="display: none; padding: 10px 0; text-align: center;">
          <div class="pix-success-header">
            <span class="pix-badge-pulse"><i class="fa-brands fa-pix"></i> PIX Dinâmico Mercado Pago</span>
            <h4 style="margin: 8px 0 2px; font-size: 17px; font-weight: 800; color: #0F172A;">Pague com PIX para ativar na hora</h4>
            <p style="margin: 0; font-size: 12.5px; color: #64748B;" id="pix-summary-text">Espaço Feed • 15 dias • R$ 49,90</p>
          </div>

          <!-- QR Code Imagem -->
          <div class="pix-qr-container" style="margin: 16px auto; width: 220px; height: 220px; background: #FFFFFF; padding: 10px; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; display: flex; align-items: center; justify-content: center;">
            <img id="pix-qr-img" src="" alt="QR Code PIX" style="width: 100%; height: 100%; display: block; border-radius: 8px; object-fit: contain;">
          </div>

          <!-- Status de Verificação em Tempo Real -->
          <div class="pix-status-badge" id="pix-status-box">
            <span class="pix-spinner-dot"></span>
            <span id="pix-status-label">Aguardando pagamento no seu banco...</span>
          </div>

          <!-- Código Copia e Cola -->
          <div style="margin-top: 16px; text-align: left;">
            <label style="font-size: 11.5px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Código PIX (Copia e Cola):</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="pix-copia-cola-input" readonly style="flex: 1; padding: 10px; font-size: 11.5px; border: 1px solid #CBD5E1; border-radius: 8px; background: #F8FAFC; color: #334155; font-family: monospace;">
              <button type="button" class="btn-copy-pix" onclick="copyPixCodeToClipboard()">
                <i class="fa-solid fa-copy"></i>
                <span>Copiar</span>
              </button>
            </div>
          </div>

          <!-- Instruções Rápidas -->
          <div class="pix-instructions-card" style="margin-top: 16px; text-align: left; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px; font-size: 12px; color: #475569;">
            <strong style="color: #1E293B; display: block; margin-bottom: 6px;"><i class="fa-solid fa-mobile-screen"></i> Como pagar:</strong>
            <ol style="margin: 0; padding-left: 18px; line-height: 1.5;">
              <li>Abra o aplicativo do seu banco (Nubank, Inter, Caixa, Itaú, etc.).</li>
              <li>Escolha pagar com <strong>PIX</strong> e selecione <strong>PIX Copia e Cola</strong> (ou escaneie o QR Code).</li>
              <li>Cole o código copiado e confirme o pagamento.</li>
              <li>Em segundos, a confirmação aparece aqui e seu anúncio entra no ar!</li>
            </ol>
          </div>

          <div style="margin-top: 16px; display: flex; gap: 8px;">
            <button type="button" class="btn-check-manual-pix" onclick="checkCurrentPixPaymentStatus(true)">
              <i class="fa-solid fa-arrows-rotate"></i> Verificar Pagamento Agora
            </button>
            <button type="button" class="btn-back-ad-form" onclick="backToAdForm()">
              Voltar / Editar
            </button>
          </div>
        </div>

        <!-- ETAPA 3: SUCESSO E ATIVAÇÃO -->
        <div id="ad-step-success" style="display: none; padding: 32px 20px; text-align: center;">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: #ECFDF5; color: #10B981; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 14px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.2);">
            <i class="fa-solid fa-circle-check"></i>
          </div>
          <h3 style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: #065F46;">Pagamento Confirmado!</h3>
          <p style="margin: 0 0 16px; font-size: 13.5px; color: #047857; line-height: 1.4;">
            Seu anúncio foi ativado com sucesso e já está no ar para todos os usuários de Parauapebas!
          </p>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; margin-bottom: 20px; text-align: left; font-size: 12.5px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748B;">Anunciante:</span>
              <strong id="success-advertiser-name" style="color: #1E293B;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748B;">Espaço:</span>
              <strong id="success-placement-name" style="color: #1E293B;">-</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Duração:</span>
              <strong id="success-duration-days" style="color: #10B981;">-</strong>
            </div>
          </div>
          <button type="button" class="btn-generate-pix" onclick="closeAdvertiseModalAndShowAd()" style="background: #059669; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">
            <i class="fa-solid fa-eye"></i>
            <span>Ver Meu Anúncio no App</span>
          </button>
        </div>

      </div>
    </div>
  </div>
`;

if (!html.includes('id="modal-advertise-checkout"')) {
  const insertMarker = '<nav class="app-bottom-nav">';
  html = html.replace(insertMarker, modalHtml + '\n' + insertMarker);
  console.log('✅ Modal de Checkout de Anúncio inserido no index.html');
}

fs.writeFileSync(indexHtmlPath, html, 'utf8');

// 3. INJETAR O CSS DO CHECKOUT DE ANÚNCIOS NO styles.css
if (!css.includes('.ad-checkout-header')) {
  css += `

/* =========================================================
   TRAMPOU ADS: MODAL DE CONTRATAÇÃO & PIX MERCADO PAGO
   ========================================================= */
.ad-checkout-header {
  padding: 14px 18px;
  background: #FFFFFF;
  border-bottom: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ad-checkout-icon-badge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: 0 3px 10px rgba(124, 58, 237, 0.25);
}

.ad-checkout-close {
  background: #F1F5F9;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: #64748B;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
}

.ad-form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
  margin-bottom: 10px;
}

.ad-placements-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ad-placement-option {
  border: 1.5px solid #E2E8F0;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

.ad-placement-option.active {
  border-color: #7C3AED;
  background: #FAF5FF;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);
}

.ad-placement-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ad-placement-badge {
  font-size: 9.5px;
  font-weight: 700;
  background: #F3E8FF;
  color: #7E22CE;
  padding: 1px 6px;
  border-radius: 6px;
}

.ad-placement-option strong {
  font-size: 13px;
  color: #0F172A;
  margin-bottom: 2px;
}

.ad-placement-option small {
  font-size: 10.5px;
  color: #64748B;
  line-height: 1.25;
}

.ad-durations-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.ad-duration-pill {
  border: 1.5px solid #E2E8F0;
  border-radius: 10px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
  background: #FFFFFF;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  transition: all 0.2s ease;
}

.ad-duration-pill.active {
  border-color: #7C3AED;
  background: #FAF5FF;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.12);
}

.ad-duration-pill span {
  font-size: 11.5px;
  color: #475569;
  font-weight: 600;
}

.ad-duration-pill strong {
  font-size: 13.5px;
  color: #7C3AED;
  font-weight: 800;
}

.ad-duration-tag {
  position: absolute;
  top: -8px;
  background: #7C3AED;
  color: #FFFFFF !important;
  font-size: 8.5px !important;
  font-weight: 800 !important;
  padding: 1px 6px;
  border-radius: 8px;
}

.ad-input-group {
  margin-bottom: 12px;
}

.ad-input-group label {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 4px;
}

.ad-input-group input,
.ad-input-group textarea {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid #CBD5E1;
  border-radius: 10px;
  font-size: 13px;
  color: #0F172A;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 0.2s;
}

.ad-input-group input:focus,
.ad-input-group textarea:focus {
  outline: none;
  border-color: #7C3AED;
}

.ad-upload-box {
  border: 2px dashed #CBD5E1;
  border-radius: 12px;
  background: #F8FAFC;
  cursor: pointer;
  transition: all 0.2s;
}

.ad-upload-box:hover {
  border-color: #7C3AED;
  background: #FAF5FF;
}

.btn-remove-ad-img {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(239, 68, 68, 0.9);
  color: #FFF;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.btn-generate-pix {
  width: 100%;
  padding: 13px 18px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: #FFFFFF;
  border: none;
  border-radius: 12px;
  font-size: 14.5px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);
  transition: all 0.2s;
}

.btn-generate-pix:hover {
  filter: brightness(1.08);
}

.btn-copy-pix {
  background: #7C3AED;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 0 16px;
  font-weight: 700;
  font-size: 12.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pix-badge-pulse {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ECFDF5;
  color: #047857;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid #A7F3D0;
}

.pix-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #EFF6FF;
  color: #1D4ED8;
  border: 1px solid #BFDBFE;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.pix-spinner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563EB;
  animation: pulseDot 1.2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.btn-check-manual-pix {
  flex: 1;
  padding: 10px 12px;
  background: #FFFFFF;
  border: 1.5px solid #CBD5E1;
  color: #334155;
  border-radius: 10px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
}

.btn-back-ad-form {
  padding: 10px 16px;
  background: #F1F5F9;
  border: none;
  color: #64748B;
  border-radius: 10px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}
`;
  fs.writeFileSync(stylesCssPath, css, 'utf8');
  console.log('✅ Estilos CSS do Checkout PIX adicionados');
}

// 4. INJETAR A LÓGICA JAVASCRIPT NO web/app.js
const advertiseJsCode = `
// ==============================================================================
// TRAMPOU ADS: FLUXO DE CONTRATAÇÃO AVULSA COM PIX MERCADO PAGO
// ==============================================================================

let selectedAdPlacement = 'home_feed';
let selectedAdDurationDays = 15;
let selectedAdPrice = 49.90;
let currentAdUploadedImage = null;
let activePixPollingTimer = null;
let currentActivePixOrder = null;

function openAdvertiseModal(preselectedPlacement = null) {
  if (preselectedPlacement) {
    selectAdPlacementOption(preselectedPlacement);
  } else {
    selectAdPlacementOption('home_feed');
  }
  selectAdDurationOption(15, 49.90);

  // Preenche dados do usuário se estiver logado
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const advInput = document.getElementById('ad-input-advertiser');
  const phoneInput = document.getElementById('ad-input-phone');
  const emailInput = document.getElementById('ad-input-email');
  const cityInput = document.getElementById('ad-input-city');

  if (advInput && user && user.name && !advInput.value) {
    advInput.value = user.name;
  }
  if (phoneInput && user && user.phone && !phoneInput.value) {
    phoneInput.value = user.phone;
  }
  if (emailInput && user && user.email && !emailInput.value) {
    emailInput.value = user.email;
  }
  if (cityInput) {
    const loc = currentActiveLocation || { city: 'Parauapebas', state: 'PA' };
    cityInput.value = \`\${loc.city}, \${loc.state}\`;
  }

  // Reseta etapas
  document.getElementById('ad-step-form').style.display = 'block';
  document.getElementById('ad-step-pix').style.display = 'none';
  document.getElementById('ad-step-success').style.display = 'none';

  const modal = document.getElementById('modal-advertise-checkout');
  if (modal) modal.style.display = 'flex';
}
window.openAdvertiseModal = openAdvertiseModal;

function closeAdvertiseModal() {
  if (activePixPollingTimer) {
    clearInterval(activePixPollingTimer);
    activePixPollingTimer = null;
  }
  const modal = document.getElementById('modal-advertise-checkout');
  if (modal) modal.style.display = 'none';
}
window.closeAdvertiseModal = closeAdvertiseModal;

function selectAdPlacementOption(placement) {
  selectedAdPlacement = placement;
  document.querySelectorAll('.ad-placement-option').forEach(el => {
    const isMatch = el.getAttribute('data-placement') === placement;
    el.classList.toggle('active', isMatch);
    const radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = isMatch;
  });
}
window.selectAdPlacementOption = selectAdPlacementOption;

function selectAdDurationOption(days, price) {
  selectedAdDurationDays = days;
  selectedAdPrice = price;

  document.querySelectorAll('.ad-duration-pill').forEach(el => {
    const elDays = parseInt(el.getAttribute('data-days'), 10);
    el.classList.toggle('active', elDays === days);
  });

  const label = document.getElementById('btn-submit-pix-label');
  if (label) {
    label.innerText = \`Gerar Pagamento PIX (R$ \${price.toFixed(2).replace('.', ',')})\`;
  }
}
window.selectAdDurationOption = selectAdDurationOption;

async function handleAdImageFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const compressed = (typeof compressImageFile === 'function') 
      ? await compressImageFile(file, 800, 500, 0.78)
      : await new Promise((resolve) => {
          const r = new FileReader();
          r.onload = e => resolve(e.target.result);
          r.readAsDataURL(file);
        });

    currentAdUploadedImage = compressed;
    const preview = document.getElementById('ad-upload-preview');
    const previewWrap = document.getElementById('ad-upload-preview-wrap');
    const placeholder = document.getElementById('ad-upload-placeholder');

    if (preview && previewWrap && placeholder) {
      preview.src = compressed;
      previewWrap.style.display = 'block';
      placeholder.style.display = 'none';
    }
  } catch (err) {
    showToast('Não foi possível processar a imagem.');
  }
}
window.handleAdImageFile = handleAdImageFile;

function removeAdImagePreview() {
  currentAdUploadedImage = null;
  const fileInput = document.getElementById('ad-file-input');
  if (fileInput) fileInput.value = '';
  const previewWrap = document.getElementById('ad-upload-preview-wrap');
  const placeholder = document.getElementById('ad-upload-placeholder');
  if (previewWrap) previewWrap.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
}
window.removeAdImagePreview = removeAdImagePreview;

async function submitAdAndGeneratePix() {
  const advertiser = (document.getElementById('ad-input-advertiser')?.value || '').trim();
  const title = (document.getElementById('ad-input-title')?.value || '').trim();
  const desc = (document.getElementById('ad-input-desc')?.value || '').trim();
  const phone = (document.getElementById('ad-input-phone')?.value || '').trim();
  const email = (document.getElementById('ad-input-email')?.value || '').trim();
  const ctaText = (document.getElementById('ad-input-cta-text')?.value || '').trim() || 'Chamar no WhatsApp';

  if (!advertiser) {
    showToast('Informe o nome da sua empresa ou negócio.');
    return;
  }
  if (!title) {
    showToast('Informe o título principal do seu anúncio.');
    return;
  }
  if (!phone) {
    showToast('Informe o seu número de WhatsApp de atendimento.');
    return;
  }
  if (!email || !email.includes('@')) {
    showToast('Informe um e-mail válido para o comprovante.');
    return;
  }

  const cleanPhone = phone.replace(/\\D/g, '');
  const ctaLink = \`https://wa.me/55\${cleanPhone}?text=\${encodeURIComponent('Olá! Vi seu anúncio no Trampou e gostaria de informações.')}\`;

  const btn = document.getElementById('btn-submit-ad-pix');
  const label = document.getElementById('btn-submit-pix-label');
  if (btn) btn.disabled = true;
  if (label) label.innerText = 'Gerando PIX no Mercado Pago...';

  try {
    const loc = currentActiveLocation || { city: 'Parauapebas', state: 'PA' };
    const res = await fetch('/api/mercadopago/create-pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placement: selectedAdPlacement,
        duration_days: selectedAdDurationDays,
        title: title,
        description: desc,
        advertiser_name: advertiser,
        advertiser_phone: phone,
        cta_text: ctaText,
        cta_link: ctaLink,
        image_url: currentAdUploadedImage || '',
        target_city: loc.city || 'Parauapebas',
        target_state: loc.state || 'PA',
        payer_email: email
      })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Erro ao gerar cobrança PIX');
    }

    currentActivePixOrder = {
      orderId: data.orderId,
      bannerId: data.bannerId,
      durationDays: selectedAdDurationDays,
      advertiser: advertiser,
      placement: selectedAdPlacement,
      price: selectedAdPrice
    };

    // Preenche tela de PIX
    const qrImg = document.getElementById('pix-qr-img');
    const copiaColaInput = document.getElementById('pix-copia-cola-input');
    const summaryText = document.getElementById('pix-summary-text');

    if (qrImg && data.qrCodeBase64) {
      qrImg.src = \`data:image/png;base64,\${data.qrCodeBase64}\`;
    }
    if (copiaColaInput && data.qrCode) {
      copiaColaInput.value = data.qrCode;
    }

    const placementLabels = {
      home_feed: 'Feed da Home',
      search_sponsored: 'Busca & Categorias',
      profile_footer: 'Rodapé do Perfil',
      home_carousel: 'Carrossel Topo'
    };
    if (summaryText) {
      summaryText.innerText = \`\${placementLabels[selectedAdPlacement] || 'Anúncio'} • \${selectedAdDurationDays} dias • R$ \${selectedAdPrice.toFixed(2).replace('.', ',')}\`;
    }

    document.getElementById('ad-step-form').style.display = 'none';
    document.getElementById('ad-step-pix').style.display = 'block';

    // Inicia polling a cada 3.5 segundos para detectar o pagamento do banco
    if (activePixPollingTimer) clearInterval(activePixPollingTimer);
    activePixPollingTimer = setInterval(() => checkCurrentPixPaymentStatus(false), 3500);

  } catch (err) {
    showToast(err.message || 'Falha ao conectar com o Mercado Pago.');
  } finally {
    if (btn) btn.disabled = false;
    if (label) label.innerText = \`Gerar Pagamento PIX (R$ \${selectedAdPrice.toFixed(2).replace('.', ',')})\`;
  }
}
window.submitAdAndGeneratePix = submitAdAndGeneratePix;

function copyPixCodeToClipboard() {
  const input = document.getElementById('pix-copia-cola-input');
  if (!input || !input.value) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('📋 Código PIX copiado! Cole no aplicativo do seu banco.');
    }).catch(() => {
      input.select();
      document.execCommand('copy');
      showToast('📋 Código PIX copiado!');
    });
  } else {
    input.select();
    document.execCommand('copy');
    showToast('📋 Código PIX copiado!');
  }
}
window.copyPixCodeToClipboard = copyPixCodeToClipboard;

async function checkCurrentPixPaymentStatus(manualTrigger = false) {
  if (!currentActivePixOrder || !currentActivePixOrder.orderId) return;

  const statusLabel = document.getElementById('pix-status-label');
  if (manualTrigger && statusLabel) {
    statusLabel.innerText = 'Consultando Mercado Pago...';
  }

  try {
    const url = \`/api/mercadopago/check-status?order_id=\${encodeURIComponent(currentActivePixOrder.orderId)}&banner_id=\${encodeURIComponent(currentActivePixOrder.bannerId || '')}&duration_days=\${currentActivePixOrder.durationDays}\`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.isPaid) {
      // PAGAMENTO CONFIRMADO COM SUCESSO!
      if (activePixPollingTimer) {
        clearInterval(activePixPollingTimer);
        activePixPollingTimer = null;
      }

      document.getElementById('ad-step-pix').style.display = 'none';
      document.getElementById('ad-step-success').style.display = 'block';

      const placementLabels = {
        home_feed: 'Feed da Página Inicial',
        search_sponsored: 'Busca & Categorias',
        profile_footer: 'Rodapé do Perfil',
        home_carousel: 'Carrossel Superior'
      };

      document.getElementById('success-advertiser-name').innerText = currentActivePixOrder.advertiser;
      document.getElementById('success-placement-name').innerText = placementLabels[currentActivePixOrder.placement] || currentActivePixOrder.placement;
      document.getElementById('success-duration-days').innerText = \`\${currentActivePixOrder.durationDays} dias (Ativo)\`;

      showToast('🎉 Pagamento Aprovado! Seu anúncio já está no ar!');
      try {
        if ('vibrate' in navigator) navigator.vibrate([150, 80, 150]);
      } catch (_) {}

      // Atualiza o motor de anúncios imediatamente para o novo anúncio aparecer na tela
      if (typeof renderAdBannerCarousel === 'function') {
        renderAdBannerCarousel(true);
      }
    } else if (manualTrigger) {
      showToast('Pagamento ainda não identificado. Se você já transferiu, aguarde alguns segundos.');
      if (statusLabel) {
        statusLabel.innerText = 'Aguardando transferência no seu banco...';
      }
    }
  } catch (err) {
    if (manualTrigger) showToast('Erro ao consultar status. Tente novamente.');
  }
}
window.checkCurrentPixPaymentStatus = checkCurrentPixPaymentStatus;

function backToAdForm() {
  if (activePixPollingTimer) {
    clearInterval(activePixPollingTimer);
    activePixPollingTimer = null;
  }
  document.getElementById('ad-step-pix').style.display = 'none';
  document.getElementById('ad-step-form').style.display = 'block';
}
window.backToAdForm = backToAdForm;

function closeAdvertiseModalAndShowAd() {
  closeAdvertiseModal();
  if (currentActivePixOrder) {
    if (currentActivePixOrder.placement === 'home_feed' || currentActivePixOrder.placement === 'home_carousel') {
      switchTab('home');
      window.scrollTo({ top: 350, behavior: 'smooth' });
    } else if (currentActivePixOrder.placement === 'search_sponsored') {
      switchTab('search');
    }
  }
  if (typeof renderAdBannerCarousel === 'function') {
    renderAdBannerCarousel(true);
  }
}
window.closeAdvertiseModalAndShowAd = closeAdvertiseModalAndShowAd;
`;

if (!js.includes('function openAdvertiseModal')) {
  js += '\n' + advertiseJsCode;
  console.log('✅ Funções JavaScript do Checkout PIX adicionadas ao app.js');
}

fs.writeFileSync(appJsPath, js, 'utf8');
console.log('💾 Todos os arquivos foram sincronizados e salvos com sucesso!');


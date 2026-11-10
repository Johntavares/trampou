const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'web', 'index.html');
const stylesCssPath = path.join(__dirname, '..', 'web', 'styles.css');
const appJsPath = path.join(__dirname, '..', 'web', 'app.js');

let html = fs.readFileSync(indexHtmlPath, 'utf8');
let css = fs.readFileSync(stylesCssPath, 'utf8');
let js = fs.readFileSync(appJsPath, 'utf8');

// ==============================================================================
// 1. REFINAMENTO DO HTML DO MODAL (#modal-advertise-checkout)
// ==============================================================================
const modernModalHtml = `
  <!-- ==============================================================================
       MODAL DE CONTRATAÇÃO DE ANÚNCIOS TRAMPOU ADS (NOVA UI MOBILE-FIRST)
       ============================================================================== -->
  <div id="modal-advertise-checkout" class="ad-modal-backdrop" style="display: none;">
    <div class="ad-modal-card">
      
      <!-- Pull Bar para Mobile -->
      <div class="ad-modal-drag-handle"></div>

      <!-- Header Fixo -->
      <div class="ad-modal-header">
        <div class="ad-modal-title-group">
          <div class="ad-modal-icon-badge">
            <i class="fa-solid fa-bullhorn"></i>
          </div>
          <div>
            <div class="ad-modal-badge-row">
              <span class="ad-badge-instant"><i class="fa-solid fa-bolt"></i> Ativação Instantânea</span>
              <span class="ad-badge-pix"><i class="fa-brands fa-pix"></i> Pix Oficial</span>
            </div>
            <h3 class="ad-modal-title">Anunciar no Trampou</h3>
            <p class="ad-modal-subtitle">Destaque sua empresa para clientes da sua cidade</p>
          </div>
        </div>
        <button type="button" class="ad-modal-close-btn" onclick="closeAdvertiseModal()" title="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Corpo com Scroll Suave -->
      <div class="ad-modal-body" id="ad-checkout-body-content">
        
        <!-- ================= ETAPA 1: FORMULÁRIO E SELEÇÃO ================= -->
        <div id="ad-step-form">

          <!-- 1. SELEÇÃO DE ESPAÇO / POSICIONAMENTO -->
          <div class="ad-section">
            <div class="ad-section-title">
              <span class="ad-step-num">1</span>
              <div>
                <strong>Onde você quer anunciar?</strong>
                <small>Escolha o espaço que melhor se adapta à sua campanha</small>
              </div>
            </div>

            <div class="ad-placements-list">
              <!-- Feed Principal -->
              <div class="ad-place-card active" data-placement="home_feed" onclick="selectAdPlacementOption('home_feed')">
                <div class="ad-place-icon feed">
                  <i class="fa-solid fa-newspaper"></i>
                </div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Feed da Página Inicial</strong>
                    <span class="ad-tag-pop">Mais Popular</span>
                  </div>
                  <p>Card patrocinado integrado no feed principal de serviços</p>
                </div>
                <div class="ad-place-radio">
                  <div class="ad-radio-dot"></div>
                </div>
              </div>

              <!-- Carrossel do Topo -->
              <div class="ad-place-card" data-placement="home_carousel" onclick="selectAdPlacementOption('home_carousel')">
                <div class="ad-place-icon carousel">
                  <i class="fa-solid fa-images"></i>
                </div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Carrossel de Destaques Topo</strong>
                    <span class="ad-tag-gold">Destaque Nobre</span>
                  </div>
                  <p>Banner horizontal deslizante logo no topo do aplicativo</p>
                </div>
                <div class="ad-place-radio">
                  <div class="ad-radio-dot"></div>
                </div>
              </div>

              <!-- Busca e Categorias -->
              <div class="ad-place-card" data-placement="search_sponsored" onclick="selectAdPlacementOption('search_sponsored')">
                <div class="ad-place-icon search">
                  <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Busca & Categorias</strong>
                    <span class="ad-tag-blue">Alta Conversão</span>
                  </div>
                  <p>Aparece fixo no topo quando o cliente pesquisa profissionais</p>
                </div>
                <div class="ad-place-radio">
                  <div class="ad-radio-dot"></div>
                </div>
              </div>

              <!-- Rodapé do Perfil -->
              <div class="ad-place-card" data-placement="profile_footer" onclick="selectAdPlacementOption('profile_footer')">
                <div class="ad-place-icon profile">
                  <i class="fa-solid fa-store"></i>
                </div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Rodapé dos Prestadores</strong>
                    <span class="ad-tag-green">Parceiro Oficial</span>
                  </div>
                  <p>Exibição no final de todos os perfis públicos de profissionais</p>
                </div>
                <div class="ad-place-radio">
                  <div class="ad-radio-dot"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. SELEÇÃO DE PERÍODO & PACOTE -->
          <div class="ad-section">
            <div class="ad-section-title">
              <span class="ad-step-num">2</span>
              <div>
                <strong>Escolha a duração</strong>
                <small>Pagamento avulso único • Sem mensalidade ou fidelidade</small>
              </div>
            </div>

            <div class="ad-plans-grid">
              <!-- 7 Dias -->
              <div class="ad-plan-card" data-days="7" data-price="29.90" onclick="selectAdDurationOption(7, 29.90)">
                <div class="ad-plan-days">7 Dias</div>
                <div class="ad-plan-price">R$ 29,90</div>
                <div class="ad-plan-daily">R$ 4,27 / dia</div>
              </div>

              <!-- 15 Dias (Recomendado) -->
              <div class="ad-plan-card active" data-days="15" data-price="49.90" onclick="selectAdDurationOption(15, 49.90)">
                <span class="ad-plan-badge-top">⭐ Mais Escolhido</span>
                <div class="ad-plan-days">15 Dias</div>
                <div class="ad-plan-price">R$ 49,90</div>
                <div class="ad-plan-daily">R$ 3,32 / dia</div>
              </div>

              <!-- 30 Dias -->
              <div class="ad-plan-card" data-days="30" data-price="89.90" onclick="selectAdDurationOption(30, 89.90)">
                <span class="ad-plan-badge-save">Economize 30%</span>
                <div class="ad-plan-days">30 Dias</div>
                <div class="ad-plan-price">R$ 89,90</div>
                <div class="ad-plan-daily">R$ 2,99 / dia</div>
              </div>
            </div>

            <div class="ad-security-guarantee">
              <i class="fa-solid fa-shield-halved"></i>
              <span>Cobrança única via PIX. Não renova automaticamente.</span>
            </div>
          </div>

          <!-- 3. PRÉVIA AO VIVO DO ANÚNCIO -->
          <div class="ad-section ad-preview-section">
            <div class="ad-preview-header-bar">
              <i class="fa-solid fa-sparkles" style="color: #7C3AED;"></i>
              <span>Prévia ao vivo de como seu anúncio aparecerá:</span>
            </div>

            <div class="ad-live-card-container">
              <div class="ad-live-media-wrap">
                <img id="ad-live-preview-img" src="https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80" alt="Banner Preview">
                <span class="ad-live-tag-pill">Patrocinado</span>
              </div>
              <div class="ad-live-content-wrap">
                <div class="ad-live-company" id="ad-live-preview-advertiser">Sua Empresa ou Negócio</div>
                <h4 class="ad-live-title" id="ad-live-preview-title">Título do seu anúncio em destaque no app</h4>
                <p class="ad-live-desc" id="ad-live-preview-desc">Apresente sua oferta, diferencial ou serviços para clientes locais.</p>
                <div class="ad-live-footer-row">
                  <span class="ad-live-city"><i class="fa-solid fa-location-dot"></i> <span id="ad-live-preview-city">Parauapebas, PA</span></span>
                  <span class="ad-live-btn" id="ad-live-preview-cta">Chamar no WhatsApp <i class="fa-brands fa-whatsapp"></i></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. DADOS DO ANUNCIANTE & CRIATIVO -->
          <div class="ad-section">
            <div class="ad-section-title">
              <span class="ad-step-num">3</span>
              <div>
                <strong>Preencha os dados do anúncio</strong>
                <small>Tudo o que seus clientes verão ao tocar no seu card</small>
              </div>
            </div>

            <div class="ad-inputs-container">
              <!-- Nome da Empresa -->
              <div class="ad-field">
                <label class="ad-field-label">Nome da Empresa / Anunciante <span class="req">*</span></label>
                <div class="ad-field-input-wrap">
                  <i class="fa-solid fa-store ad-field-icon"></i>
                  <input type="text" id="ad-input-advertiser" placeholder="Ex: Disk Caçambas Carajás, Studio Prime" oninput="updateLiveAdPreview()" required>
                </div>
              </div>

              <!-- Título do Anúncio -->
              <div class="ad-field">
                <label class="ad-field-label">Título Chamativo da Oferta <span class="req">*</span></label>
                <div class="ad-field-input-wrap">
                  <i class="fa-solid fa-heading ad-field-icon"></i>
                  <input type="text" id="ad-input-title" placeholder="Ex: Locação de Caçambas 24h com 15% de Desconto" oninput="updateLiveAdPreview()" required>
                </div>
              </div>

              <!-- Descrição Curta -->
              <div class="ad-field">
                <label class="ad-field-label">Descrição / Detalhes Rápidos (Opcional)</label>
                <div class="ad-field-input-wrap">
                  <textarea id="ad-input-desc" rows="2" placeholder="Ex: Atendimento rápido em toda a cidade, descarte legalizado e nota fiscal." oninput="updateLiveAdPreview()"></textarea>
                </div>
              </div>

              <!-- Contatos: WhatsApp e E-mail em 2 colunas -->
              <div class="ad-two-cols">
                <div class="ad-field">
                  <label class="ad-field-label">WhatsApp de Atendimento <span class="req">*</span></label>
                  <div class="ad-field-input-wrap">
                    <i class="fa-brands fa-whatsapp ad-field-icon" style="color: #10B981;"></i>
                    <input type="tel" id="ad-input-phone" placeholder="(94) 99123-4567" required>
                  </div>
                </div>

                <div class="ad-field">
                  <label class="ad-field-label">E-mail para Comprovante <span class="req">*</span></label>
                  <div class="ad-field-input-wrap">
                    <i class="fa-solid fa-envelope ad-field-icon"></i>
                    <input type="email" id="ad-input-email" placeholder="financeiro@empresa.com" required>
                  </div>
                </div>
              </div>

              <!-- Texto do Botão e Cidade -->
              <div class="ad-two-cols">
                <div class="ad-field">
                  <label class="ad-field-label">Texto do Botão de Ação</label>
                  <div class="ad-field-input-wrap">
                    <select id="ad-input-cta-text" onchange="updateLiveAdPreview()">
                      <option value="Chamar no WhatsApp" selected>Chamar no WhatsApp</option>
                      <option value="Falar Conosco">Falar Conosco</option>
                      <option value="Ver Oferta Especial">Ver Oferta Especial</option>
                      <option value="Pedir Orçamento">Pedir Orçamento</option>
                      <option value="Conhecer Agora">Conhecer Agora</option>
                    </select>
                  </div>
                </div>

                <div class="ad-field">
                  <label class="ad-field-label">Cidade de Veiculação</label>
                  <div class="ad-field-input-wrap">
                    <i class="fa-solid fa-location-dot ad-field-icon"></i>
                    <input type="text" id="ad-input-city" value="Parauapebas, PA" readonly style="background: #F8FAFC; color: #475569;">
                  </div>
                </div>
              </div>

              <!-- Upload de Imagem ou Flyer -->
              <div class="ad-field">
                <label class="ad-field-label">Foto, Flyer ou Logo da Campanha (Opcional)</label>
                <div class="ad-upload-tile" onclick="document.getElementById('ad-file-input').click()">
                  <input type="file" id="ad-file-input" accept="image/*" style="display: none;" onchange="handleAdImageFile(event)">
                  <div id="ad-upload-placeholder" class="ad-upload-inner">
                    <div class="ad-upload-icon-circle">
                      <i class="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <strong>Toque para escolher foto da sua galeria</strong>
                    <span>Formato JPG, PNG ou WEBP (Otimizado para o app)</span>
                  </div>
                  <div id="ad-upload-preview-wrap" style="display: none; position: relative;">
                    <img id="ad-upload-preview" src="" alt="Prévia" class="ad-uploaded-image">
                    <button type="button" class="ad-btn-remove-photo" onclick="event.stopPropagation(); removeAdImagePreview();" title="Trocar foto">
                      <i class="fa-solid fa-trash"></i> Trocar foto
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- ================= ETAPA 2: PAGAMENTO PIX MERCADO PAGO ================= -->
        <div id="ad-step-pix" style="display: none;">
          <div class="ad-pix-screen-card">
            
            <div class="ad-pix-header">
              <span class="ad-pix-secure-badge">
                <i class="fa-brands fa-pix"></i> PIX Dinâmico • Mercado Pago
              </span>
              <h3 class="ad-pix-headline">Pague com PIX para ativar na hora</h3>
              <p class="ad-pix-summary-sub" id="pix-summary-text">Feed da Home • 15 dias • R$ 49,90</p>
            </div>

            <!-- Card com o QR Code oficial -->
            <div class="ad-pix-qr-box">
              <div class="ad-pix-qr-frame">
                <img id="pix-qr-img" src="" alt="QR Code PIX">
              </div>
              <span class="ad-pix-timer-hint"><i class="fa-regular fa-clock"></i> Código válido por 30 minutos</span>
            </div>

            <!-- Status do Polling -->
            <div class="ad-pix-status-pill" id="pix-status-box">
              <span class="ad-pix-pulse-indicator"></span>
              <span id="pix-status-label">Aguardando confirmação do banco...</span>
            </div>

            <!-- Copia e Cola -->
            <div class="ad-pix-copy-section">
              <label class="ad-pix-copy-label">PIX Copia e Cola:</label>
              <div class="ad-pix-input-group">
                <input type="text" id="pix-copia-cola-input" readonly>
                <button type="button" class="ad-btn-copy-action" id="btn-copy-pix-code" onclick="copyPixCodeToClipboard()">
                  <i class="fa-solid fa-copy"></i>
                  <span>Copiar</span>
                </button>
              </div>
            </div>

            <!-- Passos para Pagar -->
            <div class="ad-pix-how-to-card">
              <strong><i class="fa-solid fa-mobile-screen-button"></i> Como concluir:</strong>
              <ol>
                <li>Abra o app do seu banco (Nubank, Inter, Caixa, Itaú, etc.).</li>
                <li>Selecione <strong>Área PIX</strong> ➔ <strong>PIX Copia e Cola</strong> (ou aponte a câmera pro QR Code).</li>
                <li>Cole o código e confirme o valor.</li>
                <li>Assim que concluir, o sistema ativa seu anúncio imediatamente!</li>
              </ol>
            </div>

            <!-- Botões de Ação na Tela PIX -->
            <div class="ad-pix-actions-row">
              <button type="button" class="ad-btn-check-status" onclick="checkCurrentPixPaymentStatus(true)">
                <i class="fa-solid fa-arrows-rotate"></i> Verificar Agora
              </button>
              <button type="button" class="ad-btn-back-form" onclick="backToAdForm()">
                Editar Dados
              </button>
            </div>

          </div>
        </div>

        <!-- ================= ETAPA 3: SUCESSO E ATIVAÇÃO ================= -->
        <div id="ad-step-success" style="display: none;">
          <div class="ad-success-screen">
            <div class="ad-success-icon-wrap">
              <i class="fa-solid fa-check"></i>
            </div>
            <h2>Pagamento Confirmado!</h2>
            <p class="ad-success-desc">
              Parabéns! Seu anúncio já está ativo e sendo exibido para os clientes em Parauapebas.
            </p>

            <div class="ad-success-receipt-card">
              <div class="ad-receipt-row">
                <span>Anunciante:</span>
                <strong id="success-advertiser-name">-</strong>
              </div>
              <div class="ad-receipt-row">
                <span>Espaço de Exibição:</span>
                <strong id="success-placement-name">-</strong>
              </div>
              <div class="ad-receipt-row">
                <span>Período Ativo:</span>
                <strong id="success-duration-days" style="color: #059669;">-</strong>
              </div>
              <div class="ad-receipt-row">
                <span>Status da Campanha:</span>
                <span class="ad-badge-active-green">● Em Veiculação</span>
              </div>
            </div>

            <button type="button" class="ad-btn-finish-view" onclick="closeAdvertiseModalAndShowAd()">
              <i class="fa-solid fa-eye"></i>
              <span>Ver Meu Anúncio no App</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Rodapé Fixo (Sticky Footer com Resumo do Valor & Botão de Ação) -->
      <div class="ad-modal-footer" id="ad-checkout-sticky-footer">
        <div class="ad-footer-summary">
          <span class="ad-footer-plan-tag" id="footer-plan-label">15 dias • Feed da Home</span>
          <div class="ad-footer-price" id="footer-price-display">R$ 49,90</div>
        </div>
        <button type="button" class="ad-btn-primary-cta" id="btn-submit-ad-pix" onclick="submitAdAndGeneratePix()">
          <i class="fa-brands fa-pix"></i>
          <span id="btn-submit-pix-label">Gerar PIX</span>
        </button>
      </div>

    </div>
  </div>
`;

// Substitui o modal anterior no index.html
const modalRegex = /<!-- ==============================================================================[\s\S]*?MODAL DE CONTRATAÇÃO DE ANÚNCIOS TRAMPOU ADS[\s\S]*?id="modal-advertise-checkout"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

if (modalRegex.test(html)) {
  html = html.replace(modalRegex, modernModalHtml.trim());
  console.log('✅ Modal HTML antigo substituído pela nova UI com sucesso!');
} else {
  // Fallback: busca pelo id
  const startIdx = html.indexOf('<div id="modal-advertise-checkout"');
  if (startIdx !== -1) {
    const navIdx = html.indexOf('<nav class="app-bottom-nav">', startIdx);
    if (navIdx !== -1) {
      html = html.slice(0, startIdx) + modernModalHtml.trim() + '\n\n' + html.slice(navIdx);
      console.log('✅ Modal HTML substituído via fallback de índice!');
    }
  }
}
fs.writeFileSync(indexHtmlPath, html, 'utf8');

// ==============================================================================
// 2. CSS MODERNO E ULTRA-POLIDO (styles.css)
// ==============================================================================
const modernAdsCss = `
/* ==============================================================================
   TRAMPOU ADS: NOVA UI PREMIUM DE ANÚNCIOS & CHECKOUT PIX
   ============================================================================== */
.ad-modal-backdrop {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 2200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  box-sizing: border-box;
  animation: adFadeIn 0.25s ease-out;
}

@media (min-width: 600px) {
  .ad-modal-backdrop {
    align-items: center;
    padding: 20px;
  }
}

.ad-modal-card {
  background: #FFFFFF;
  width: 100%;
  max-width: 520px;
  max-height: 92vh;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: adSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 600px) {
  .ad-modal-card {
    border-radius: 20px;
    max-height: 88vh;
  }
}

@keyframes adFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes adSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.ad-modal-drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 4px;
  background: #CBD5E1;
  margin: 10px auto 2px;
}

@media (min-width: 600px) {
  .ad-modal-drag-handle {
    display: none;
  }
}

/* Header */
.ad-modal-header {
  padding: 12px 18px 14px;
  border-bottom: 1px solid #F1F5F9;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.ad-modal-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ad-modal-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.28);
  flex-shrink: 0;
}

.ad-modal-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.ad-badge-instant {
  font-size: 10.5px;
  font-weight: 700;
  background: #FEF3C7;
  color: #B45309;
  padding: 1px 7px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ad-badge-pix {
  font-size: 10.5px;
  font-weight: 700;
  background: #ECFDF5;
  color: #047857;
  padding: 1px 7px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ad-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  color: #0F172A;
  letter-spacing: -0.3px;
}

.ad-modal-subtitle {
  margin: 1px 0 0;
  font-size: 12px;
  color: #64748B;
}

.ad-modal-close-btn {
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
  transition: all 0.15s;
}

.ad-modal-close-btn:hover {
  background: #E2E8F0;
  color: #0F172A;
}

/* Scrollable Body */
.ad-modal-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 16px 18px 24px;
  background: #FAFAFC;
}

/* Seções */
.ad-section {
  margin-bottom: 22px;
}

.ad-section-title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.ad-step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #7C3AED;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.ad-section-title strong {
  display: block;
  font-size: 14.5px;
  font-weight: 800;
  color: #1E293B;
  letter-spacing: -0.2px;
}

.ad-section-title small {
  display: block;
  font-size: 11.5px;
  color: #64748B;
  margin-top: 1px;
}

/* Lista de Posicionamentos */
.ad-placements-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ad-place-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #FFFFFF;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 11px 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ad-place-card:hover {
  border-color: #CBD5E1;
  background: #F8FAFC;
}

.ad-place-card.active {
  border-color: #7C3AED;
  background: #FAF5FF;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.1);
}

.ad-place-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}

.ad-place-icon.feed { background: #F3E8FF; color: #7C3AED; }
.ad-place-icon.carousel { background: #FEF3C7; color: #D97706; }
.ad-place-icon.search { background: #EFF6FF; color: #2563EB; }
.ad-place-icon.profile { background: #ECFDF5; color: #059669; }

.ad-place-info {
  flex: 1;
  min-width: 0;
}

.ad-place-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.ad-place-header strong {
  font-size: 13.5px;
  font-weight: 700;
  color: #1E293B;
}

.ad-place-info p {
  margin: 0;
  font-size: 11.5px;
  color: #64748B;
  line-height: 1.3;
}

.ad-tag-pop {
  font-size: 9.5px;
  font-weight: 700;
  background: #F3E8FF;
  color: #7E22CE;
  padding: 1px 6px;
  border-radius: 5px;
}

.ad-tag-gold {
  font-size: 9.5px;
  font-weight: 700;
  background: #FEF3C7;
  color: #B45309;
  padding: 1px 6px;
  border-radius: 5px;
}

.ad-tag-blue {
  font-size: 9.5px;
  font-weight: 700;
  background: #EFF6FF;
  color: #1D4ED8;
  padding: 1px 6px;
  border-radius: 5px;
}

.ad-tag-green {
  font-size: 9.5px;
  font-weight: 700;
  background: #ECFDF5;
  color: #047857;
  padding: 1px 6px;
  border-radius: 5px;
}

.ad-place-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ad-place-card.active .ad-place-radio {
  border-color: #7C3AED;
}

.ad-radio-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
  transition: all 0.2s;
}

.ad-place-card.active .ad-radio-dot {
  background: #7C3AED;
}

/* Grid de Planos / Período */
.ad-plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.ad-plan-card {
  position: relative;
  background: #FFFFFF;
  border: 1.5px solid #E2E8F0;
  border-radius: 14px;
  padding: 14px 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ad-plan-card:hover {
  border-color: #CBD5E1;
}

.ad-plan-card.active {
  border-color: #7C3AED;
  background: #FAF5FF;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.14);
}

.ad-plan-badge-top {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #7C3AED;
  color: #FFFFFF;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(124, 58, 237, 0.3);
}

.ad-plan-badge-save {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #059669;
  color: #FFFFFF;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 10px;
  white-space: nowrap;
}

.ad-plan-days {
  font-size: 13px;
  font-weight: 600;
  color: #64748B;
  margin-bottom: 4px;
}

.ad-plan-card.active .ad-plan-days {
  color: #7C3AED;
  font-weight: 700;
}

.ad-plan-price {
  font-size: 16px;
  font-weight: 900;
  color: #0F172A;
  margin-bottom: 2px;
}

.ad-plan-card.active .ad-plan-price {
  color: #6D28D9;
}

.ad-plan-daily {
  font-size: 10px;
  color: #94A3B8;
  font-weight: 500;
}

.ad-security-guarantee {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 11.5px;
  color: #64748B;
}

.ad-security-guarantee i {
  color: #059669;
}

/* Card de Prévia Ao Vivo */
.ad-preview-section {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}

.ad-preview-header-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 10px;
}

.ad-live-card-container {
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  overflow: hidden;
  background: #FFFFFF;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.ad-live-media-wrap {
  position: relative;
  width: 100%;
  height: 120px;
  background: #F1F5F9;
}

.ad-live-media-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.ad-live-tag-pill {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(15, 23, 42, 0.75);
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
}

.ad-live-content-wrap {
  padding: 12px;
}

.ad-live-company {
  font-size: 11px;
  font-weight: 700;
  color: #7C3AED;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
}

.ad-live-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1.3;
}

.ad-live-desc {
  margin: 0 0 10px;
  font-size: 12px;
  color: #64748B;
  line-height: 1.35;
}

.ad-live-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-top: 1px solid #F1F5F9;
  padding-top: 8px;
}

.ad-live-city {
  font-size: 11.5px;
  color: #64748B;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ad-live-city i {
  color: #EF4444;
}

.ad-live-btn {
  background: #10B981;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* Inputs Modernos */
.ad-inputs-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ad-two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ad-field {
  display: flex;
  flex-direction: column;
}

.ad-field-label {
  font-size: 12px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 5px;
}

.ad-field-label .req {
  color: #EF4444;
}

.ad-field-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ad-field-icon {
  position: absolute;
  left: 12px;
  color: #94A3B8;
  font-size: 13.5px;
  pointer-events: none;
}

.ad-field-input-wrap input,
.ad-field-input-wrap select,
.ad-field-input-wrap textarea {
  width: 100%;
  box-sizing: border-box;
  background: #FFFFFF;
  border: 1.5px solid #CBD5E1;
  border-radius: 12px;
  padding: 10px 12px 10px 36px;
  font-size: 13px;
  color: #1E293B;
  font-family: inherit;
  transition: all 0.2s;
}

.ad-field-input-wrap textarea {
  padding-left: 12px;
  resize: vertical;
}

.ad-field-input-wrap select {
  padding-left: 12px;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}

.ad-field-input-wrap input:focus,
.ad-field-input-wrap select:focus,
.ad-field-input-wrap textarea:focus {
  outline: none;
  border-color: #7C3AED;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.14);
}

/* Upload Tile */
.ad-upload-tile {
  background: #FFFFFF;
  border: 2px dashed #CBD5E1;
  border-radius: 14px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.ad-upload-tile:hover {
  border-color: #7C3AED;
  background: #FAF5FF;
}

.ad-upload-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.ad-upload-icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #F3E8FF;
  color: #7C3AED;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 2px;
}

.ad-upload-inner strong {
  font-size: 12.5px;
  color: #1E293B;
}

.ad-upload-inner span {
  font-size: 11px;
  color: #94A3B8;
}

.ad-uploaded-image {
  width: 100%;
  height: 130px;
  object-fit: cover;
  border-radius: 10px;
  display: block;
}

.ad-btn-remove-photo {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(15, 23, 42, 0.85);
  color: #FFFFFF;
  border: none;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

/* Sticky Footer */
.ad-modal-footer {
  padding: 12px 18px;
  background: #FFFFFF;
  border-top: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  box-shadow: 0 -4px 16px rgba(0,0,0,0.05);
}

.ad-footer-summary {
  display: flex;
  flex-direction: column;
}

.ad-footer-plan-tag {
  font-size: 11.5px;
  font-weight: 600;
  color: #64748B;
}

.ad-footer-price {
  font-size: 20px;
  font-weight: 900;
  color: #7C3AED;
  line-height: 1.1;
}

.ad-btn-primary-cta {
  background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
  color: #FFFFFF;
  border: none;
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 14.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
  transition: all 0.2s;
  flex-shrink: 0;
}

.ad-btn-primary-cta:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.ad-btn-primary-cta:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

/* Tela PIX */
.ad-pix-screen-card {
  padding: 10px 0;
  text-align: center;
}

.ad-pix-header {
  margin-bottom: 14px;
}

.ad-pix-secure-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: #ECFDF5;
  color: #047857;
  border: 1px solid #A7F3D0;
  font-size: 11.5px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 20px;
}

.ad-pix-headline {
  margin: 8px 0 2px;
  font-size: 18px;
  font-weight: 800;
  color: #0F172A;
}

.ad-pix-summary-sub {
  margin: 0;
  font-size: 13px;
  color: #64748B;
  font-weight: 600;
}

.ad-pix-qr-box {
  margin: 14px auto;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

.ad-pix-qr-frame {
  width: 210px;
  height: 210px;
  background: #FFFFFF;
  padding: 10px;
  border-radius: 16px;
  border: 2px solid #7C3AED;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ad-pix-qr-frame img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.ad-pix-timer-hint {
  font-size: 11.5px;
  color: #64748B;
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.ad-pix-status-pill {
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
  margin-bottom: 14px;
}

.ad-pix-pulse-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2563EB;
  animation: adPulseDot 1.2s infinite ease-in-out;
}

@keyframes adPulseDot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.ad-pix-copy-section {
  text-align: left;
  margin-bottom: 14px;
}

.ad-pix-copy-label {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 5px;
}

.ad-pix-input-group {
  display: flex;
  gap: 8px;
}

.ad-pix-input-group input {
  flex: 1;
  background: #F8FAFC;
  border: 1.5px solid #CBD5E1;
  border-radius: 10px;
  padding: 10px 12px;
  font-family: monospace;
  font-size: 12px;
  color: #334155;
}

.ad-btn-copy-action {
  background: #7C3AED;
  color: #FFFFFF;
  border: none;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.ad-btn-copy-action:hover {
  background: #6D28D9;
}

.ad-pix-how-to-card {
  text-align: left;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 12px;
  color: #475569;
  margin-bottom: 16px;
}

.ad-pix-how-to-card strong {
  display: block;
  color: #1E293B;
  margin-bottom: 6px;
}

.ad-pix-how-to-card ol {
  margin: 0;
  padding-left: 18px;
  line-height: 1.5;
}

.ad-pix-actions-row {
  display: flex;
  gap: 10px;
}

.ad-btn-check-status {
  flex: 1;
  background: #FFFFFF;
  border: 1.5px solid #CBD5E1;
  color: #1E293B;
  padding: 10px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.ad-btn-back-form {
  background: #F1F5F9;
  border: none;
  color: #64748B;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

/* Tela Sucesso */
.ad-success-screen {
  padding: 24px 10px 10px;
  text-align: center;
}

.ad-success-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #ECFDF5;
  color: #059669;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(5, 150, 105, 0.2);
}

.ad-success-screen h2 {
  margin: 0 0 6px;
  font-size: 20px;
  font-weight: 800;
  color: #065F46;
}

.ad-success-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: #047857;
  line-height: 1.4;
}

.ad-success-receipt-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 20px;
  text-align: left;
  font-size: 13px;
}

.ad-receipt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #F1F5F9;
}

.ad-receipt-row:last-child {
  border-bottom: none;
}

.ad-receipt-row span {
  color: #64748B;
}

.ad-badge-active-green {
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  background: #ECFDF5;
  padding: 2px 8px;
  border-radius: 6px;
}

.ad-btn-finish-view {
  width: 100%;
  background: #059669;
  color: #FFFFFF;
  border: none;
  padding: 13px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}
`;

// Remove CSS antigo se presente e injeta novo
if (css.includes('TRAMPOU ADS: MODAL DE CONTRATAÇÃO')) {
  const cssOldStart = css.indexOf('/* =========================================================\n   TRAMPOU ADS: MODAL DE CONTRATAÇÃO');
  if (cssOldStart !== -1) {
    css = css.slice(0, cssOldStart);
  }
}
css += '\n' + modernAdsCss;
fs.writeFileSync(stylesCssPath, css, 'utf8');
console.log('✅ Estilos CSS modernizados e injetados com sucesso!');

// ==============================================================================
// 3. JAVASCRIPT REFINADO COM LIVE PREVIEW E CONTROLE INTELIGENTE DO RODAPÉ (app.js)
// ==============================================================================
const jsUpdate = `
// ==============================================================================
// TRAMPOU ADS: ATUALIZAÇÕES VISUAIS E PRÉVIA EM TEMPO REAL
// ==============================================================================
function updateLiveAdPreview() {
  const adv = document.getElementById('ad-input-advertiser')?.value.trim() || 'Sua Empresa ou Negócio';
  const title = document.getElementById('ad-input-title')?.value.trim() || 'Título do seu anúncio em destaque no app';
  const desc = document.getElementById('ad-input-desc')?.value.trim() || 'Apresente sua oferta, diferencial ou serviços para clientes locais.';
  const cta = document.getElementById('ad-input-cta-text')?.value || 'Chamar no WhatsApp';
  const loc = currentActiveLocation || { city: 'Parauapebas', state: 'PA' };

  const prevAdv = document.getElementById('ad-live-preview-advertiser');
  const prevTitle = document.getElementById('ad-live-preview-title');
  const prevDesc = document.getElementById('ad-live-preview-desc');
  const prevCta = document.getElementById('ad-live-preview-cta');
  const prevCity = document.getElementById('ad-live-preview-city');
  const prevImg = document.getElementById('ad-live-preview-img');

  if (prevAdv) prevAdv.innerText = adv;
  if (prevTitle) prevTitle.innerText = title;
  if (prevDesc) prevDesc.innerText = desc;
  if (prevCity) prevCity.innerText = \`\${loc.city}, \${loc.state}\`;
  if (prevCta) prevCta.innerHTML = \`\${cta} <i class="fa-brands fa-whatsapp"></i>\`;

  if (prevImg) {
    if (currentAdUploadedImage) {
      prevImg.src = currentAdUploadedImage;
    } else {
      prevImg.src = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&auto=format&fit=crop&q=80';
    }
  }
}
window.updateLiveAdPreview = updateLiveAdPreview;
`;

if (!js.includes('updateLiveAdPreview')) {
  js += '\n' + jsUpdate;
}

// Atualizar selectAdPlacementOption para sincronizar com nova classe .ad-place-card
const oldPlacementFn = `function selectAdPlacementOption(placement) {
  selectedAdPlacement = placement;
  document.querySelectorAll('.ad-placement-option').forEach(el => {
    const isMatch = el.getAttribute('data-placement') === placement;
    el.classList.toggle('active', isMatch);
    const radio = el.querySelector('input[type="radio"]');
    if (radio) radio.checked = isMatch;
  });
}`;

const newPlacementFn = `function selectAdPlacementOption(placement) {
  selectedAdPlacement = placement;
  document.querySelectorAll('.ad-place-card, .ad-placement-option').forEach(el => {
    const isMatch = el.getAttribute('data-placement') === placement;
    el.classList.toggle('active', isMatch);
  });
  updateFooterSummary();
}`;

if (js.includes(oldPlacementFn)) {
  js = js.replace(oldPlacementFn, newPlacementFn);
}

// Atualizar selectAdDurationOption para sincronizar com nova classe .ad-plan-card e atualizar footer
const oldDurationFn = `function selectAdDurationOption(days, price) {
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
}`;

const newDurationFn = `function selectAdDurationOption(days, price) {
  selectedAdDurationDays = days;
  selectedAdPrice = price;

  document.querySelectorAll('.ad-plan-card, .ad-duration-pill').forEach(el => {
    const elDays = parseInt(el.getAttribute('data-days'), 10);
    el.classList.toggle('active', elDays === days);
  });

  updateFooterSummary();
}

function updateFooterSummary() {
  const placementLabels = {
    home_feed: 'Feed da Home',
    home_carousel: 'Carrossel Topo',
    search_sponsored: 'Busca & Categorias',
    profile_footer: 'Rodapé Perfil'
  };

  const footerPlan = document.getElementById('footer-plan-label');
  const footerPrice = document.getElementById('footer-price-display');
  const btnLabel = document.getElementById('btn-submit-pix-label');

  if (footerPlan) {
    footerPlan.innerText = \`\${selectedAdDurationDays} dias • \${placementLabels[selectedAdPlacement] || 'Feed'}\`;
  }
  if (footerPrice) {
    footerPrice.innerText = \`R$ \${selectedAdPrice.toFixed(2).replace('.', ',')}\`;
  }
  if (btnLabel) {
    btnLabel.innerText = \`Gerar PIX\`;
  }
}`;

if (js.includes(oldDurationFn)) {
  js = js.replace(oldDurationFn, newDurationFn);
}

// Atualizar openAdvertiseModal para esconder/mostrar o footer sticky corretamente
const oldOpenFnSnippet = `  document.getElementById('ad-step-form').style.display = 'block';
  document.getElementById('ad-step-pix').style.display = 'none';
  document.getElementById('ad-step-success').style.display = 'none';`;

const newOpenFnSnippet = `  document.getElementById('ad-step-form').style.display = 'block';
  document.getElementById('ad-step-pix').style.display = 'none';
  document.getElementById('ad-step-success').style.display = 'none';
  const stickyFooter = document.getElementById('ad-checkout-sticky-footer');
  if (stickyFooter) stickyFooter.style.display = 'flex';
  updateLiveAdPreview();
  updateFooterSummary();`;

if (js.includes(oldOpenFnSnippet)) {
  js = js.replace(oldOpenFnSnippet, newOpenFnSnippet);
}

// Quando avança pro PIX ou Sucesso, esconde o footer sticky
const oldPixStepSnippet = `    document.getElementById('ad-step-form').style.display = 'none';
    document.getElementById('ad-step-pix').style.display = 'block';`;

const newPixStepSnippet = `    document.getElementById('ad-step-form').style.display = 'none';
    document.getElementById('ad-step-pix').style.display = 'block';
    const stickyFooter = document.getElementById('ad-checkout-sticky-footer');
    if (stickyFooter) stickyFooter.style.display = 'none';`;

if (js.includes(oldPixStepSnippet)) {
  js = js.replace(oldPixStepSnippet, newPixStepSnippet);
}

// Quando volta pro form, reexibe o footer sticky
const oldBackSnippet = `function backToAdForm() {
  if (activePixPollingTimer) {
    clearInterval(activePixPollingTimer);
    activePixPollingTimer = null;
  }
  document.getElementById('ad-step-pix').style.display = 'none';
  document.getElementById('ad-step-form').style.display = 'block';
}`;

const newBackSnippet = `function backToAdForm() {
  if (activePixPollingTimer) {
    clearInterval(activePixPollingTimer);
    activePixPollingTimer = null;
  }
  document.getElementById('ad-step-pix').style.display = 'none';
  document.getElementById('ad-step-form').style.display = 'block';
  const stickyFooter = document.getElementById('ad-checkout-sticky-footer');
  if (stickyFooter) stickyFooter.style.display = 'flex';
}`;

if (js.includes(oldBackSnippet)) {
  js = js.replace(oldBackSnippet, newBackSnippet);
}

// No upload de foto, atualizar a prévia ao vivo também
const oldImgUploadEnd = `      preview.src = compressed;
      previewWrap.style.display = 'block';
      placeholder.style.display = 'none';
    }
  } catch (err) {`;

const newImgUploadEnd = `      preview.src = compressed;
      previewWrap.style.display = 'block';
      placeholder.style.display = 'none';
    }
    updateLiveAdPreview();
  } catch (err) {`;

if (js.includes(oldImgUploadEnd)) {
  js = js.replace(oldImgUploadEnd, newImgUploadEnd);
}

// Ao remover a foto, atualizar a prévia também
const oldRemoveImg = `  if (previewWrap) previewWrap.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
}`;

const newRemoveImg = `  if (previewWrap) previewWrap.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  updateLiveAdPreview();
}`;

if (js.includes(oldRemoveImg)) {
  js = js.replace(oldRemoveImg, newRemoveImg);
}

fs.writeFileSync(appJsPath, js, 'utf8');
console.log('✅ JavaScript atualizado com suporte à nova UI e live preview!');

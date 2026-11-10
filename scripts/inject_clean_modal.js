const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'web', 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Inserir botão "Anunciar no Trampou" no menu do Perfil (se não existir)
const profileShareTarget = '<div class="menu-item" onclick="openShareAppModal()">';
const advertiseMenuItem = `              <div class="menu-item advertise-menu-highlight" onclick="openAdvertiseModal()" style="background: linear-gradient(135deg, #FAF5FF, #F5F3FF); border-left: 3.5px solid #7C3AED; cursor: pointer;">
                <i class="fa-solid fa-bullhorn" style="color: #7C3AED; font-size: 18px;"></i>
                <div class="menu-text">
                  <span style="font-weight: 700; color: #6D28D9;">Anunciar no Trampou</span>
                  <small>Divulgue sua empresa e receba contatos no WhatsApp</small>
                </div>
                <span class="badge-pill-novo" style="font-size: 10px; background: #7C3AED; color: #FFF; padding: 2px 7px; border-radius: 10px; font-weight: 700;">PIX</span>
              </div>\n`;

if (!html.includes('openAdvertiseModal')) {
  if (html.includes(profileShareTarget)) {
    html = html.replace(profileShareTarget, advertiseMenuItem + profileShareTarget);
    console.log('✅ Botão "Anunciar no Trampou" adicionado ao menu Perfil');
  } else {
    console.warn('Alvo do menu Perfil não encontrado!');
  }
}

// 2. Inserir o modal limpo após o dpo-channel-modal
const modalHtml = `
  <!-- ==============================================================================
       MODAL DE CONTRATAÇÃO DE ANÚNCIOS TRAMPOU ADS (UI POLIDA & ISOLADA)
       ============================================================================== -->
  <div id="modal-advertise-checkout" class="modal-overlay ad-modal-backdrop" style="display: none; z-index: 2200;">
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
            <p class="ad-modal-subtitle">Destaque sua empresa para milhares de clientes</p>
          </div>
        </div>
        <button type="button" class="ad-modal-close-btn" onclick="closeAdvertiseModal()" title="Fechar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Corpo com Scroll Suave -->
      <div class="ad-modal-body" id="ad-checkout-body-content">
        
        <!-- ETAPA 1: FORMULÁRIO E SELEÇÃO -->
        <div id="ad-step-form">

          <!-- 1. SELEÇÃO DE ESPAÇO -->
          <div class="ad-section">
            <div class="ad-section-title">
              <span class="ad-step-num">1</span>
              <div>
                <strong>Onde você quer anunciar?</strong>
                <small>Escolha o espaço ideal para seu público</small>
              </div>
            </div>

            <div class="ad-placements-list">
              <div class="ad-place-card active" data-placement="home_feed" onclick="selectAdPlacementOption('home_feed')">
                <div class="ad-place-icon feed"><i class="fa-solid fa-newspaper"></i></div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Feed da Página Inicial</strong>
                    <span class="ad-tag-pop">Mais Popular</span>
                  </div>
                  <p>Card patrocinado integrado entre as postagens e destaques</p>
                </div>
                <div class="ad-place-radio"><div class="ad-radio-dot"></div></div>
              </div>

              <div class="ad-place-card" data-placement="home_carousel" onclick="selectAdPlacementOption('home_carousel')">
                <div class="ad-place-icon carousel"><i class="fa-solid fa-images"></i></div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Carrossel de Destaques Topo</strong>
                    <span class="ad-tag-gold">Destaque Nobre</span>
                  </div>
                  <p>Banner horizontal deslizante logo no topo do aplicativo</p>
                </div>
                <div class="ad-place-radio"><div class="ad-radio-dot"></div></div>
              </div>

              <div class="ad-place-card" data-placement="search_sponsored" onclick="selectAdPlacementOption('search_sponsored')">
                <div class="ad-place-icon search"><i class="fa-solid fa-magnifying-glass"></i></div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Busca & Categorias</strong>
                    <span class="ad-tag-blue">Alta Conversão</span>
                  </div>
                  <p>Aparece fixo no topo quando o cliente pesquisa profissionais</p>
                </div>
                <div class="ad-place-radio"><div class="ad-radio-dot"></div></div>
              </div>

              <div class="ad-place-card" data-placement="profile_footer" onclick="selectAdPlacementOption('profile_footer')">
                <div class="ad-place-icon profile"><i class="fa-solid fa-store"></i></div>
                <div class="ad-place-info">
                  <div class="ad-place-header">
                    <strong>Rodapé dos Prestadores</strong>
                    <span class="ad-tag-green">Parceiro</span>
                  </div>
                  <p>Exibição no final de todos os perfis públicos</p>
                </div>
                <div class="ad-place-radio"><div class="ad-radio-dot"></div></div>
              </div>
            </div>
          </div>

          <!-- 2. SELEÇÃO DE PERÍODO & PACOTE -->
          <div class="ad-section">
            <div class="ad-section-title">
              <span class="ad-step-num">2</span>
              <div>
                <strong>Escolha a duração</strong>
                <small>Pagamento avulso via PIX • Sem mensalidade</small>
              </div>
            </div>

            <div class="ad-plans-grid">
              <div class="ad-plan-card" data-days="7" data-price="29.90" onclick="selectAdDurationOption(7, 29.90)">
                <div class="ad-plan-days">7 Dias</div>
                <div class="ad-plan-price">R$ 29,90</div>
                <div class="ad-plan-daily">R$ 4,27 / dia</div>
              </div>

              <div class="ad-plan-card active" data-days="15" data-price="49.90" onclick="selectAdDurationOption(15, 49.90)">
                <span class="ad-plan-badge-top">⭐ Mais Escolhido</span>
                <div class="ad-plan-days">15 Dias</div>
                <div class="ad-plan-price">R$ 49,90</div>
                <div class="ad-plan-daily">R$ 3,32 / dia</div>
              </div>

              <div class="ad-plan-card" data-days="30" data-price="89.90" onclick="selectAdDurationOption(30, 89.90)">
                <span class="ad-plan-badge-save">Melhor Custo</span>
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

          <!-- 3. PRÉVIA AO VIVO -->
          <div class="ad-section ad-preview-section">
            <div class="ad-preview-header-bar">
              <i class="fa-solid fa-sparkles" style="color: #7C3AED;"></i>
              <span>Prévia ao vivo do seu anúncio no app:</span>
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

          <!-- 4. DADOS DO ANÚNCIO -->
          <div class="ad-section">
            <div class="ad-section-title">
              <span class="ad-step-num">3</span>
              <div>
                <strong>Preencha os dados do anúncio</strong>
                <small>Informações que serão exibidas para seus clientes</small>
              </div>
            </div>

            <div class="ad-inputs-container">
              <div class="ad-field">
                <label class="ad-field-label">Nome da Empresa / Negócio <span class="req">*</span></label>
                <div class="ad-field-input-wrap">
                  <i class="fa-solid fa-store ad-field-icon"></i>
                  <input type="text" id="ad-input-advertiser" placeholder="Ex: Disk Caçambas Carajás, Pizzaria Brasil" oninput="updateLiveAdPreview()" required>
                </div>
              </div>

              <div class="ad-field">
                <label class="ad-field-label">Título da Oferta / Chamada <span class="req">*</span></label>
                <div class="ad-field-input-wrap">
                  <i class="fa-solid fa-heading ad-field-icon"></i>
                  <input type="text" id="ad-input-title" placeholder="Ex: Aluguel de Caçambas 24h com 15% OFF" oninput="updateLiveAdPreview()" required>
                </div>
              </div>

              <div class="ad-field">
                <label class="ad-field-label">Descrição ou Oferta Curta (Opcional)</label>
                <div class="ad-field-input-wrap">
                  <textarea id="ad-input-desc" rows="2" placeholder="Ex: Entulho, reformas e poda com entrega imediata em qualquer bairro." oninput="updateLiveAdPreview()"></textarea>
                </div>
              </div>

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
                    <input type="email" id="ad-input-email" placeholder="contato@empresa.com" required>
                  </div>
                </div>
              </div>

              <div class="ad-two-cols">
                <div class="ad-field">
                  <label class="ad-field-label">Botão de Ação</label>
                  <div class="ad-field-input-wrap">
                    <select id="ad-input-cta-text" onchange="updateLiveAdPreview()">
                      <option value="Chamar no WhatsApp" selected>Chamar no WhatsApp</option>
                      <option value="Falar Conosco">Falar Conosco</option>
                      <option value="Ver Oferta Especial">Ver Oferta Especial</option>
                      <option value="Pedir Orçamento">Pedir Orçamento</option>
                    </select>
                  </div>
                </div>

                <div class="ad-field">
                  <label class="ad-field-label">Cidade</label>
                  <div class="ad-field-input-wrap">
                    <i class="fa-solid fa-location-dot ad-field-icon"></i>
                    <input type="text" id="ad-input-city" value="Parauapebas, PA" readonly style="background: #F8FAFC; color: #475569;">
                  </div>
                </div>
              </div>

              <!-- Upload de Imagem -->
              <div class="ad-field">
                <label class="ad-field-label">Foto, Flyer ou Logo (Opcional)</label>
                <div class="ad-upload-tile" onclick="document.getElementById('ad-file-input').click()">
                  <input type="file" id="ad-file-input" accept="image/*" style="display: none;" onchange="handleAdImageFile(event)">
                  <div id="ad-upload-placeholder" class="ad-upload-inner">
                    <div class="ad-upload-icon-circle"><i class="fa-solid fa-cloud-arrow-up"></i></div>
                    <strong>Toque para escolher imagem da galeria</strong>
                    <span>JPG, PNG ou WEBP (Otimizado automaticamente)</span>
                  </div>
                  <div id="ad-upload-preview-wrap" style="display: none; position: relative;">
                    <img id="ad-upload-preview" src="" alt="Prévia" class="ad-uploaded-image">
                    <button type="button" class="ad-btn-remove-photo" onclick="event.stopPropagation(); removeAdImagePreview();">
                      <i class="fa-solid fa-trash"></i> Trocar foto
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        <!-- ETAPA 2: PAGAMENTO PIX MERCADO PAGO -->
        <div id="ad-step-pix" style="display: none;">
          <div class="ad-pix-screen-card">
            
            <div class="ad-pix-header">
              <span class="ad-pix-secure-badge">
                <i class="fa-brands fa-pix"></i> PIX Dinâmico • Mercado Pago
              </span>
              <h3 class="ad-pix-headline">Pague com PIX para ativar na hora</h3>
              <p class="ad-pix-summary-sub" id="pix-summary-text">Feed da Home • 15 dias • R$ 49,90</p>
            </div>

            <div class="ad-pix-qr-box">
              <div class="ad-pix-qr-frame">
                <img id="pix-qr-img" src="" alt="QR Code PIX">
              </div>
              <span class="ad-pix-timer-hint"><i class="fa-regular fa-clock"></i> Código válido por 30 minutos</span>
            </div>

            <div class="ad-pix-status-pill" id="pix-status-box">
              <span class="ad-pix-pulse-indicator"></span>
              <span id="pix-status-label">Aguardando confirmação do banco...</span>
            </div>

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

            <div class="ad-pix-how-to-card">
              <strong><i class="fa-solid fa-mobile-screen-button"></i> Como concluir:</strong>
              <ol>
                <li>Abra o app do seu banco (Nubank, Inter, Caixa, Itaú, etc.).</li>
                <li>Selecione <strong>Área PIX</strong> ➔ <strong>PIX Copia e Cola</strong> (ou aponte a câmera pro QR Code).</li>
                <li>Cole o código e confirme o valor.</li>
                <li>Assim que concluir, o sistema ativa seu anúncio imediatamente!</li>
              </ol>
            </div>

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

        <!-- ETAPA 3: SUCESSO E ATIVAÇÃO -->
        <div id="ad-step-success" style="display: none;">
          <div class="ad-success-screen">
            <div class="ad-success-icon-wrap"><i class="fa-solid fa-check"></i></div>
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
                <span>Espaço:</span>
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

      <!-- Rodapé Fixo (Sticky Footer) -->
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
  </div>\n`;

// Localiza o fim do dpo-channel-modal:
const dpoIndex = html.indexOf('id="dpo-channel-modal"');
if (dpoIndex === -1) {
  console.error('dpo-channel-modal não encontrado!');
  process.exit(1);
}

// Procura o fechamento </div> do dpo-channel-modal:
const searchRegion = html.slice(dpoIndex, dpoIndex + 2500);
const closingPattern = /<\/div>\s*<\/div>\s*<\/div>/;
const match = searchRegion.match(closingPattern);

if (match) {
  const insertPos = dpoIndex + match.index + match[0].length;
  html = html.slice(0, insertPos) + '\n' + modalHtml + html.slice(insertPos);
  fs.writeFileSync(indexHtmlPath, html, 'utf8');
  console.log('✅ Modal injetado no index.html com precisão absoluta!');
} else {
  console.error('Fechamento de dpo-channel-modal não encontrado no bloco!');
}

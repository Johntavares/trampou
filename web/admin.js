/**
 * TRAMPOU ADMIN DASHBOARD — LÓGICA DO PAINEL DESKTOP
 * Gerenciamento de Anúncios, Usuários, Profissionais e Monetização
 */

(function () {
  'use strict';

  // Configurações do Supabase
  const SUPABASE_URL = 'https://txcmnqisfwekmhihdutt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y21ucWlzZndla21oaWhkdXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjQ3ODMsImV4cCI6MjEwNzkwMDc4M30.VF7amv-LqsCMw1pvGAU7_tesjjPxenVQMMHt8tk2P7E';
  
  // Senha Mestre Padrão
  const MASTER_PASSWORD_DEFAULT = 'admin@trampou2026';
  const SESSION_STORAGE_KEY = 'trampou_admin_auth_token';

  // Estado Local da Aplicação
  const state = {
    banners: [],
    professionals: [],
    users: [],
    categories: [],
    subscriptions: [],
    feedbacks: [],
    currentTab: 'dashboard',
    isLoading: false
  };

  // Headers comuns para o Supabase
  function getHeaders() {
    return {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // =========================================================
  // SISTEMA DE AUTENTICAÇÃO
  // =========================================================
  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'authenticated_true';
  }

  function handleLogin() {
    const pwdInput = document.getElementById('admin-password-input');
    const errorBox = document.getElementById('admin-login-error');
    const entered = (pwdInput.value || '').trim();

    const currentExpected = localStorage.getItem('trampou_admin_custom_pwd') || MASTER_PASSWORD_DEFAULT;

    if (entered === currentExpected) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'authenticated_true');
      errorBox.style.display = 'none';
      showAppLayout();
      initAdminData();
    } else {
      errorBox.style.display = 'flex';
      pwdInput.classList.add('error');
      setTimeout(() => pwdInput.classList.remove('error'), 600);
    }
  }

  function togglePasswordVisibility() {
    const input = document.getElementById('admin-password-input');
    const icon = document.getElementById('toggle-pwd-icon');
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  function logout() {
    if (confirm('Deseja realmente sair do painel administrativo?')) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      window.location.reload();
    }
  }

  function showAppLayout() {
    const authScreen = document.getElementById('admin-auth-screen');
    const appLayout = document.getElementById('admin-app-layout');
    if (authScreen) authScreen.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';
  }

  // =========================================================
  // NAVEGAÇÃO DE ABAS
  // =========================================================
  function initNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item, .bottom-nav-item[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.getAttribute('data-tab');
        if (targetTab) switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    state.currentTab = tabId;

    // Atualiza classes do menu
    document.querySelectorAll('.admin-nav-item, .bottom-nav-item[data-tab]').forEach(item => {
      if (item.getAttribute('data-tab') === tabId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Atualiza títulos do topo
    const titles = {
      dashboard: 'Visão Geral',
      banners: 'Gerenciador de Banners & Anúncios',
      professionals: 'Base de Profissionais Autônomos',
      users: 'Usuários Clientes',
      monetization: 'Monetização, Faturamento & Planos PRO',
      categories: 'Categorias de Serviços',
      feedbacks: 'Sugestões & Feedbacks dos Usuários'
    };
    const titleEl = document.getElementById('admin-current-page-title');
    if (titleEl) titleEl.textContent = titles[tabId] || 'Painel Administrativo';

    // Alterna a visualização da tela
    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`tab-${tabId}`);
    if (activePane) activePane.classList.add('active');
    if (typeof closeMobileSidebar === 'function') closeMobileSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'feedbacks' && typeof renderFeedbacks === 'function') {
      renderFeedbacks();
    }
  }

  // =========================================================
  // RELÓGIO AO VIVO
  // =========================================================
  function startLiveClock() {
    const clockEl = document.getElementById('admin-live-time');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString('pt-BR') + ' — ' + now.toLocaleTimeString('pt-BR');
    };
    update();
    setInterval(update, 1000);
  }

  // =========================================================
  // CARREGAMENTO DE DADOS (SUPABASE REST API)
  // =========================================================
  async function initAdminData() {
    await refreshAllData();
    setupDefaultDates();
  }

  function setupDefaultDates() {
    const dateInput = document.getElementById('sub-expires-at');
    if (dateInput && !dateInput.value) {
      const d = new Date();
      d.setDate(d.getDate() + 30); // 30 dias por padrão
      dateInput.value = d.toISOString().split('T')[0];
    }
  }

  async function refreshAllData() {
    try {
      state.isLoading = true;
      await Promise.all([
        fetchBanners(),
        fetchProfessionals(),
        fetchUsers(),
        fetchCategories(),
        fetchSubscriptions(),
        fetchFeedbacks()
      ]);

      renderDashboard();
      renderBanners();
      renderProfessionals();
      renderUsers();
      renderMonetization();
      renderCategories();
      renderFeedbacks();
      updateCounters();
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
    } finally {
      state.isLoading = false;
    }
  }

  function updateCounters() {
    const bCount = document.getElementById('nav-banners-count');
    const pCount = document.getElementById('nav-pros-count');
    const uCount = document.getElementById('nav-users-count');
    const sCount = document.getElementById('nav-subs-count');
    const cCount = document.getElementById('nav-cats-count');
    const fbCount = document.getElementById('nav-feedbacks-count');

    if (bCount) bCount.textContent = state.banners.length;
    if (pCount) pCount.textContent = state.professionals.length;
    if (uCount) uCount.textContent = state.users.length;
    if (sCount) sCount.textContent = state.subscriptions.filter(s => s.status === 'active').length;
    if (cCount) cCount.textContent = state.categories.length;
    const bbCount = document.getElementById('bottom-banners-count');
    const bpCount = document.getElementById('bottom-pros-count');
    const buCount = document.getElementById('bottom-users-count');
    if (bbCount) { bbCount.textContent = state.banners.length; bbCount.style.display = state.banners.length > 0 ? 'inline-block' : 'none'; }
    if (bpCount) { bpCount.textContent = state.professionals.length; bpCount.style.display = state.professionals.length > 0 ? 'inline-block' : 'none'; }
    if (buCount) { buCount.textContent = state.users.length; buCount.style.display = state.users.length > 0 ? 'inline-block' : 'none'; }
    if (fbCount) {
      const pendings = state.feedbacks.filter(f => f.status === 'pendente').length;
      fbCount.textContent = pendings;
      fbCount.title = `${pendings} feedback(s) pendente(s)`;
    }
  }

  // 1. Banners
  async function fetchBanners() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/banners?order=sort_order.asc,created_at.desc`, {
      headers: getHeaders()
    });
    if (res.ok) {
      state.banners = await res.json();
    } else {
      console.warn('Tabela banners ainda vazia ou inacessível via anon key');
      state.banners = [];
    }
  }

  // 2. Profissionais (com join em profiles e categories)
  async function fetchProfessionals() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/professional_profiles?select=*,profiles(*),categories(name,slug)&order=created_at.desc`, {
      headers: getHeaders()
    });
    if (res.ok) {
      const raw = await res.json();
      state.professionals = (raw || []).map(p => ({
        ...p,
        verified: Boolean(p.verified || (p.profiles && p.profiles.is_verified))
      }));
    } else {
      state.professionals = [];
    }
  }

  // 3. Usuários Clientes
  async function fetchUsers() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?order=created_at.desc`, {
      headers: getHeaders()
    });
    if (res.ok) {
      state.users = await res.json();
    } else {
      state.users = [];
    }
  }

  // 4. Categorias
  async function fetchCategories() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?order=name.asc`, {
      headers: getHeaders()
    });
    if (res.ok) {
      state.categories = await res.json();
    } else {
      state.categories = [];
    }
  }

  // 5. Assinaturas PRO
  async function fetchSubscriptions() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pro_subscriptions?select=*,professional_profiles(*,profiles(full_name,email,phone_whatsapp))&order=created_at.desc`, {
      headers: getHeaders()
    });
    if (res.ok) {
      state.subscriptions = await res.json();
    } else {
      state.subscriptions = [];
    }
  }

  // =========================================================
  // RENDERIZAÇÃO: DASHBOARD
  // =========================================================
  function renderDashboard() {
    // KPIs
    const totalUsersEl = document.getElementById('kpi-total-users');
    const totalProsEl = document.getElementById('kpi-total-pros');
    const verifiedProsEl = document.getElementById('kpi-verified-pros');
    const activeBannersEl = document.getElementById('kpi-active-banners');
    const mrrEl = document.getElementById('kpi-mrr');
    const activeSubsEl = document.getElementById('kpi-active-subs');

    if (totalUsersEl) totalUsersEl.textContent = state.users.length;
    if (totalProsEl) totalProsEl.textContent = state.professionals.length;

    const verifiedCount = state.professionals.filter(p => p.verified).length;
    if (verifiedProsEl) verifiedProsEl.textContent = `${verifiedCount} verificados com selo`;

    const activeBannersCount = state.banners.filter(b => b.active).length;
    if (activeBannersEl) activeBannersEl.textContent = activeBannersCount;

    // Calcula MRR somando as assinaturas ativas
    const activeSubs = state.subscriptions.filter(s => s.status === 'active');
    const totalMRR = activeSubs.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    if (mrrEl) mrrEl.textContent = formatCurrency(totalMRR);
    if (activeSubsEl) activeSubsEl.textContent = `${activeSubs.length} assinaturas ativas`;

    // KPI Feedbacks
    const totalFeedbacksEl = document.getElementById('kpi-total-feedbacks');
    const pendingFeedbacksEl = document.getElementById('kpi-pending-feedbacks');
    if (totalFeedbacksEl) totalFeedbacksEl.textContent = state.feedbacks.length;
    if (pendingFeedbacksEl) {
      const pend = state.feedbacks.filter(f => f.status === 'pendente').length;
      pendingFeedbacksEl.innerHTML = `<i class="fa-solid fa-comment-dots"></i> ${pend} pendente${pend === 1 ? '' : 's'}`;
    }

    // Resumo Banners
    const dashBanners = document.getElementById('dashboard-banners-preview');
    if (dashBanners) {
      const activeList = state.banners.filter(b => b.active).slice(0, 2);
      if (activeList.length === 0) {
        dashBanners.innerHTML = `<p style="font-size: 13px; color: #94A3B8; text-align: center; padding: 20px;">Nenhum banner ativo no momento.</p>`;
      } else {
        dashBanners.innerHTML = activeList.map(b => `
          <div class="banner-live-preview ${b.theme || 'purple-viral'}" style="min-height: 85px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="preview-badge-pill">${escapeHTML(b.badge_text || 'DESTAQUE')}</span>
              <span style="font-size: 11px; opacity: 0.85;">Ordem: ${b.sort_order || 1}</span>
            </div>
            <div class="preview-texts">
              <h5 style="margin: 4px 0 2px;">${escapeHTML(b.title)}</h5>
              <p style="font-size: 11px;">${escapeHTML(b.description || '')}</p>
            </div>
          </div>
        `).join('');
      }
    }

    // Resumo Últimos Profissionais
    const dashPros = document.getElementById('dashboard-recent-pros');
    if (dashPros) {
      const recentPros = state.professionals.slice(0, 5);
      if (recentPros.length === 0) {
        dashPros.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #94A3B8; padding: 20px;">Nenhum profissional encontrado.</td></tr>`;
      } else {
        dashPros.innerHTML = recentPros.map(p => {
          const name = p.profiles ? p.profiles.full_name : 'Profissional';
          const spec = p.specialty || (p.categories ? p.categories.name : 'Geral');
          return `
            <tr class="mobile-table-card">
              <td data-label="Profissional" class="td-card-header">
                <div style="font-weight: 700; color: #0F172A;">${escapeHTML(name)}</div>
              </td>
              <td data-label="Especialidade">${escapeHTML(spec)}</td>
              <td data-label="Status">
                ${p.verified 
                  ? `<span class="badge-status-pill success"><i class="fa-solid fa-circle-check"></i> Verificado</span>` 
                  : `<span class="badge-status-pill neutral">Pendente</span>`}
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // Resumo Feedbacks no Dashboard
    const dashFeedbacks = document.getElementById('dashboard-feedbacks-preview');
    if (dashFeedbacks) {
      const recentFbs = state.feedbacks.slice(0, 3);
      if (recentFbs.length === 0) {
        dashFeedbacks.innerHTML = `<p style="font-size: 13px; color: #94A3B8; text-align: center; padding: 20px;">Nenhuma sugestão ou feedback recebido ainda.</p>`;
      } else {
        dashFeedbacks.innerHTML = recentFbs.map(f => {
          const badgeLabels = {
            sugestao: '💡 Sugestão',
            elogio: '⭐ Elogio',
            problema: '⚠️ Problema',
            outro: '💬 Outro'
          };
          const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '';
          const hasReply = !!f.admin_reply;
          return `
            <div class="dash-feedback-preview-item">
              <div style="flex: 1; min-width: 200px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
                  <strong style="font-size: 13px; color: #0F172A;">${escapeHTML(f.user_name || 'Usuário')}</strong>
                  <span class="fb-badge ${f.feedback_type || 'sugestao'}" style="font-size: 10px; padding: 2px 8px;">${badgeLabels[f.feedback_type] || f.feedback_type}</span>
                  <span style="font-size: 11px; color: #94A3B8;">${dateStr}</span>
                  ${hasReply 
                    ? `<span style="font-size: 11px; color: #4F46E5; font-weight: 700;"><i class="fa-solid fa-check-double"></i> Respondido</span>` 
                    : `<span style="font-size: 11px; color: #D97706; font-weight: 700;"><i class="fa-solid fa-clock"></i> Aguardando resposta</span>`}
                </div>
                <div style="font-size: 12.5px; color: #334155; font-weight: 600;">${escapeHTML(f.title || '')}</div>
                <p style="font-size: 12px; color: #64748B; margin: 2px 0 0; max-height: 38px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${escapeHTML(f.message || '')}</p>
              </div>
              <div class="dash-feedback-preview-actions">
                <button class="btn-action-primary" style="padding: 6px 12px; font-size: 11.5px; background: #6825B3; border-color: #6825B3;" onclick="window.AdminApp.openFeedbackReplyModal('${f.id}')">
                  <i class="fa-solid fa-reply"></i> ${hasReply ? 'Ver / Editar Resposta' : 'Responder'}
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // Atualiza o Relógio do Tempo da Base Total
    renderAdminTimeClock();
  }

  // =========================================================
  // RENDERIZAÇÃO: BANNERS
  // =========================================================
  function renderBanners() {
    const grid = document.getElementById('banners-grid');
    if (!grid) return;

    if (state.banners.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #F8FAFC; border: 2px dashed #CBD5E1; border-radius: 16px;">
          <i class="fa-solid fa-rectangle-ad" style="font-size: 36px; color: #94A3B8; margin-bottom: 12px; display: block;"></i>
          <h4 style="font-size: 16px; color: #334155; margin-bottom: 6px;">Nenhum banner cadastrado</h4>
          <p style="font-size: 13px; color: #64748B; margin-bottom: 16px;">Crie seu primeiro banner de anúncio para monetizar ou destacar parceiros no Trampou.</p>
          <button class="btn-action-primary" onclick="window.AdminApp.openBannerModal()">
            <i class="fa-solid fa-plus"></i>
            <span>Criar Primeiro Banner</span>
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.banners.map(b => {
      return `
        <div class="banner-item-card ${b.active ? '' : 'inactive'}" id="banner-card-${b.id}">
          <!-- Prévia ao Vivo do Banner -->
          ${b.image_url ? `
            <div style="border-radius: 12px; overflow: hidden; aspect-ratio: 2.5 / 1; position: relative; background: #0F172A; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img src="${b.image_url}" alt="${escapeHTML(b.title)}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
            </div>
          ` : `
            <div class="banner-live-preview ${b.theme || 'purple-viral'}">
              <span class="preview-badge-pill">${escapeHTML(b.badge_text || 'PARCEIRO')}</span>
              <div class="preview-texts">
                <h5>${escapeHTML(b.title)}</h5>
                <p>${escapeHTML(b.description || '')}</p>
              </div>
              <div class="preview-cta-btn">
                <span>${escapeHTML(b.cta_text || 'Conhecer')}</span>
                <i class="fa-solid fa-arrow-right"></i>
              </div>
            </div>
          `}

          <!-- Informações e Destino -->
          <div style="font-size: 12px; color: #64748B; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Destino:</strong></span>
              <a href="${escapeHTML(b.cta_link)}" target="_blank" style="color: var(--admin-brand); font-weight: 600; text-decoration: none; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHTML(b.cta_link)}
              </a>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Ordem:</strong> ${b.sort_order || 1}</span>
              <span><strong>Tempo:</strong> ${b.display_seconds || 5}s</span>
              <span><strong>Status:</strong> ${b.active ? '<span style="color: #10B981; font-weight: 700;">Ativo</span>' : '<span style="color: #EF4444; font-weight: 700;">Pausado</span>'}</span>
            </div>
          </div>

          <!-- Controles / Ações -->
          <div class="banner-controls-row">
            <label class="switch-toggle-label">
              <input type="checkbox" ${b.active ? 'checked' : ''} onchange="window.AdminApp.toggleBannerActive('${b.id}', this.checked)">
              <span>${b.active ? 'Exibindo no App' : 'Desativado'}</span>
            </label>

            <div style="display: flex; gap: 6px;">
              <button class="btn-action-icon" title="Editar Banner" onclick="window.AdminApp.editBanner('${b.id}')">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button class="btn-action-icon danger" title="Excluir Banner" onclick="window.AdminApp.deleteBanner('${b.id}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================
  // RENDERIZAÇÃO: PROFISSIONAIS
  // =========================================================
  function renderProfessionals(list = state.professionals) {
    const tbody = document.getElementById('pro-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 32px; color: #94A3B8;">Nenhum profissional cadastrado ou correspondente ao filtro.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const name = p.profiles ? p.profiles.full_name : 'Profissional';
      const email = p.profiles ? (p.profiles.email || 'Não informado') : 'Não informado';
      const phone = p.profiles ? (p.profiles.phone_whatsapp || p.profiles.phone || '') : '';
      const avatar = p.profiles ? p.profiles.avatar_url : null;
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      const categoryName = p.categories ? p.categories.name : (p.specialty || 'Diversos');

      // Verifica se possui plano PRO ativo
      const hasPro = state.subscriptions.some(s => s.professional_id === p.id && s.status === 'active');

      return `
        <tr class="mobile-table-card">
          <td data-label="Profissional" class="td-card-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${avatar 
                ? `<img src="${escapeHTML(avatar)}" alt="${escapeHTML(name)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">` 
                : `<div class="admin-avatar-circle" style="width: 36px; height: 36px; font-size: 13px;">${escapeHTML(name.substring(0, 2).toUpperCase())}</div>`}
              <div>
                <div style="font-weight: 700; color: #0F172A;">${escapeHTML(name)}</div>
                <div style="font-size: 11px; color: #94A3B8;">ID: ${p.id.substring(0, 8)}...</div>
              </div>
            </div>
          </td>
          <td data-label="E-mail">
            ${email !== 'Não informado' 
              ? `<a href="mailto:${escapeHTML(email)}" style="color: #4F46E5; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; word-break: break-all;">
                   <i class="fa-regular fa-envelope" style="opacity: 0.7;"></i> ${escapeHTML(email)}
                 </a>` 
              : `<span style="color: #94A3B8;">Não informado</span>`}
          </td>
          <td data-label="WhatsApp">
            ${cleanPhone 
              ? `<a href="https://wa.me/55${cleanPhone}" target="_blank" style="color: #059669; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                   <i class="fa-brands fa-whatsapp"></i> ${escapeHTML(phone)}
                 </a>` 
              : `<span style="color: #94A3B8;">Não informado</span>`}
          </td>
          <td data-label="Especialidade">
            <span class="badge-status-pill neutral">${escapeHTML(categoryName)}</span>
          </td>
          <td data-label="Avaliação">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: 700; color: #F59E0B;">
              <i class="fa-solid fa-star"></i>
              <span>${p.rating || '5.0'}</span>
              <span style="font-size: 11px; color: #94A3B8; font-weight: normal;">(${p.total_reviews || 0})</span>
            </div>
          </td>
          <td data-label="Selo Verificado">
            <label class="switch-toggle-label" title="Clique para ativar/desativar selo oficial verificado">
              <input type="checkbox" ${p.verified ? 'checked' : ''} onchange="window.AdminApp.toggleProfessionalVerified('${p.id}', ${Boolean(p.verified)})">
              <span>${p.verified ? '<strong style="color: #10B981;"><i class="fa-solid fa-circle-check"></i> Verificado</strong>' : '<span style="color: #94A3B8;">Não verificado</span>'}</span>
            </label>
          </td>
          <td data-label="Plano PRO">
            ${hasPro 
              ? `<span class="badge-status-pill pro"><i class="fa-solid fa-crown"></i> PRO Ativo</span>` 
              : `<span class="badge-status-pill neutral">Gratuito</span>`}
          </td>
          <td data-label="Ações Rápidas" class="td-card-actions">
            <div style="display: flex; gap: 6px; justify-content: flex-end; width: 100%;">
              <button class="btn-action-primary" style="padding: 6px 10px; font-size: 11px;" onclick="window.AdminApp.openSubscriptionModal('${p.id}')">
                <i class="fa-solid fa-crown"></i>
                <span>Dar PRO</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterProfessionals() {
    const query = (document.getElementById('search-pros-input')?.value || '').toLowerCase().trim();
    const status = document.getElementById('filter-pro-status')?.value || 'all';

    const filtered = state.professionals.filter(p => {
      const name = (p.profiles?.full_name || '').toLowerCase();
      const email = (p.profiles?.email || '').toLowerCase();
      const phone = (p.profiles?.phone_whatsapp || p.profiles?.phone || '').toLowerCase();
      const spec = (p.specialty || p.categories?.name || '').toLowerCase();

      const matchesQuery = !query || name.includes(query) || email.includes(query) || phone.includes(query) || spec.includes(query);

      let matchesStatus = true;
      if (status === 'verified') matchesStatus = p.verified === true;
      if (status === 'unverified') matchesStatus = !p.verified;

      return matchesQuery && matchesStatus;
    });

    renderProfessionals(filtered);
  }

  // =========================================================
  // RENDERIZAÇÃO: USUÁRIOS
  // =========================================================
  function renderUsers(list = state.users) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px; color: #94A3B8;">Nenhum cliente cadastrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(u => {
      const name = u.full_name || 'Usuário Sem Nome';
      const email = u.email || 'Não informado';
      const phone = u.phone_whatsapp || u.phone || '';
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      const role = u.role || 'client';
      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-';

      return `
        <tr class="mobile-table-card">
          <td data-label="Usuário" class="td-card-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="admin-avatar-circle" style="width: 34px; height: 34px; font-size: 12px; background: #3B82F6;">
                ${escapeHTML(name.substring(0, 2).toUpperCase())}
              </div>
              <div style="font-weight: 700; color: #0F172A;">${escapeHTML(name)}</div>
            </div>
          </td>
          <td data-label="E-mail">
            ${email !== 'Não informado' 
              ? `<a href="mailto:${escapeHTML(email)}" style="color: #4F46E5; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; word-break: break-all;">
                   <i class="fa-regular fa-envelope" style="opacity: 0.7;"></i> ${escapeHTML(email)}
                 </a>` 
              : `<span style="color: #94A3B8;">Não informado</span>`}
          </td>
          <td data-label="Telefone">${phone ? escapeHTML(phone) : '<span style="color: #94A3B8;">Não cadastrado</span>'}</td>
          <td data-label="Tipo">
            <span class="badge-status-pill ${role === 'professional' ? 'pro' : 'neutral'}">
              ${role === 'professional' ? 'Profissional' : 'Cliente'}
            </span>
          </td>
          <td data-label="Cadastro">${created}</td>
          <td data-label="Contato" class="td-card-actions">
            ${cleanPhone 
              ? `<a href="https://wa.me/55${cleanPhone}" target="_blank" class="btn-action-primary" style="padding: 5px 10px; font-size: 11px; text-decoration: none; background: #059669; border-color: #059669;">
                   <i class="fa-brands fa-whatsapp"></i> Conversar
                 </a>` 
              : `<span style="font-size: 11px; color: #94A3B8;">Sem WhatsApp</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  function filterUsers() {
    const query = (document.getElementById('search-users-input')?.value || '').toLowerCase().trim();
    const filtered = state.users.filter(u => {
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone_whatsapp || u.phone || '').toLowerCase();
      return !query || name.includes(query) || email.includes(query) || phone.includes(query);
    });
    renderUsers(filtered);
  }

  // =========================================================
  // RENDERIZAÇÃO: MONETIZAÇÃO & PLANOS PRO
  // =========================================================
  function renderMonetization() {
    const tbody = document.getElementById('subs-table-body');
    const mrrVal = document.getElementById('monetization-mrr-val');
    const activeCount = document.getElementById('monetization-active-count');

    // Preenche select do modal de assinaturas
    const proSelect = document.getElementById('sub-pro-id');
    if (proSelect) {
      proSelect.innerHTML = `<option value="">Selecione o profissional...</option>` + 
        state.professionals.map(p => {
          const name = p.profiles?.full_name || 'Profissional';
          return `<option value="${p.id}">${escapeHTML(name)} (${escapeHTML(p.specialty || 'Diversos')})</option>`;
        }).join('');
    }

    // Calcula KPIs
    const activeSubs = state.subscriptions.filter(s => s.status === 'active');
    const totalMRR = activeSubs.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    if (mrrVal) mrrVal.textContent = formatCurrency(totalMRR);
    if (activeCount) activeCount.textContent = activeSubs.length;

    if (!tbody) return;

    if (state.subscriptions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px; color: #94A3B8;">
            <i class="fa-solid fa-crown" style="font-size: 28px; color: #CBD5E1; margin-bottom: 8px; display: block;"></i>
            Nenhuma assinatura PRO registrada até o momento.<br>
            <button class="btn-action-primary" style="margin-top: 12px;" onclick="window.AdminApp.openSubscriptionModal()">
              <i class="fa-solid fa-plus"></i> Registrar Primeira Assinatura
            </button>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.subscriptions.map(s => {
      const proName = s.professional_profiles?.profiles?.full_name || 'Profissional';
      const plan = s.plan_name || 'Plano PRO';
      const amount = formatCurrency(parseFloat(s.amount) || 0);
      const start = s.starts_at ? new Date(s.starts_at).toLocaleDateString('pt-BR') : '-';
      const expires = s.expires_at ? new Date(s.expires_at).toLocaleDateString('pt-BR') : '-';
      const isActive = s.status === 'active';

      return `
        <tr class="mobile-table-card">
          <td data-label="Profissional" class="td-card-header">
            <div style="font-weight: 700; color: #0F172A;">${escapeHTML(proName)}</div>
          </td>
          <td data-label="Plano"><span class="badge-status-pill pro">${escapeHTML(plan)}</span></td>
          <td data-label="Valor" style="font-weight: 800; color: #059669;">${amount}</td>
          <td data-label="Início">${start}</td>
          <td data-label="Expiração">${expires}</td>
          <td data-label="Status">
            ${isActive 
              ? `<span class="badge-status-pill success"><i class="fa-solid fa-circle-check"></i> Ativo</span>` 
              : `<span class="badge-status-pill danger">Expirado</span>`}
          </td>
          <td data-label="Ações" class="td-card-actions">
            ${isActive 
              ? `<button class="btn-action-icon danger" title="Cancelar Assinatura" onclick="window.AdminApp.cancelSubscription('${s.id}')">
                   <i class="fa-solid fa-ban"></i>
                 </button>` 
              : `<span style="font-size: 11px; color: #94A3B8;">Finalizado</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================
  // RENDERIZAÇÃO: CATEGORIAS
  // =========================================================
  function renderCategories() {
    const tbody = document.getElementById('categories-table-body');
    if (!tbody) return;

    if (state.categories.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #94A3B8;">Nenhuma categoria encontrada.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.categories.map(c => {
      // Conta quantos profissionais pertencem a essa categoria
      const count = state.professionals.filter(p => p.category_id === c.id).length;
      return `
        <tr class="mobile-table-card">
          <td data-label="Ícone" class="td-card-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="kpi-icon-box purple" style="width: 32px; height: 32px; font-size: 13px;">
                <i class="fa-solid fa-briefcase"></i>
              </div>
              <span class="mobile-only-cat-name" style="font-weight: 700; color: #0F172A; display: none;">${escapeHTML(c.name)}</span>
            </div>
          </td>
          <td data-label="Categoria" style="font-weight: 700; color: #0F172A;">${escapeHTML(c.name)}</td>
          <td data-label="Slug"><code>${escapeHTML(c.slug)}</code></td>
          <td data-label="Profissionais">
            <span class="badge-status-pill neutral"><strong>${count}</strong> profissionais</span>
          </td>
          <td data-label="Status">
            <span class="badge-status-pill success"><i class="fa-solid fa-check"></i> Ativa</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================
  // GESTÃO DE IMAGENS E LINKS DOS BANNERS NO ADMIN
  // =========================================================
  let pendingBannerFile = null;

  function updateBannerImagePreview(url) {
    const preview = document.getElementById('banner-image-preview');
    const placeholder = document.getElementById('banner-upload-placeholder');
    const cleanUrl = (url || '').trim();
    if (cleanUrl) {
      if (preview) {
        preview.src = cleanUrl;
        preview.style.display = 'block';
      }
      if (placeholder) placeholder.style.display = 'none';
    } else {
      if (preview) {
        preview.src = '';
        preview.style.display = 'none';
      }
      if (placeholder) placeholder.style.display = 'block';
    }
  }

  function clearBannerImage() {
    pendingBannerFile = null;
    const fileInp = document.getElementById('banner-image-file');
    const urlInp = document.getElementById('banner-image-url');
    const status = document.getElementById('banner-upload-status');
    if (fileInp) fileInp.value = '';
    if (urlInp) urlInp.value = '';
    if (status) status.style.display = 'none';
    updateBannerImagePreview('');
  }

  function handleBannerImageSelect(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem selecionada é maior que 5 MB. Escolha uma imagem menor.');
      input.value = '';
      return;
    }
    pendingBannerFile = file;
    const localUrl = URL.createObjectURL(file);
    updateBannerImagePreview(localUrl);
    const status = document.getElementById('banner-upload-status');
    if (status) {
      status.textContent = `Imagem selecionada: ${file.name} (${Math.round(file.size / 1024)} KB) — será enviada ao salvar`;
      status.style.display = 'block';
    }
  }

  async function uploadBannerFileToSupabase(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
    const filename = `banner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${cleanExt}`;

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/banners/${filename}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': file.type || 'image/jpeg'
      },
      body: file
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Falha no upload da imagem: ${res.status} ${errText}`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/banners/${filename}`;
  }

  function handleBannerLinkTypeChange() {
    const typeSelect = document.getElementById('banner-link-type');
    const linkGroup = document.getElementById('banner-link-value-group');
    const linkLabel = document.getElementById('banner-link-value-label');
    const linkInput = document.getElementById('banner-cta-link');
    if (!typeSelect || !linkGroup || !linkLabel || !linkInput) return;

    const val = typeSelect.value;
    linkGroup.style.display = 'block';
    linkInput.disabled = false;

    if (val === 'instagram') {
      linkLabel.textContent = 'Perfil ou Link do Instagram *';
      linkInput.placeholder = 'Ex: @hubboficial ou https://instagram.com/hubboficial';
    } else if (val === 'whatsapp') {
      linkLabel.textContent = 'Número do WhatsApp (com DDD) *';
      linkInput.placeholder = 'Ex: 94991234567 ou link direto';
    } else if (val === 'site') {
      linkLabel.textContent = 'Endereço do Site / Página *';
      linkInput.placeholder = 'Ex: https://meusite.com.br';
    } else if (val === 'share') {
      linkLabel.textContent = 'Ação no App';
      linkInput.value = 'share';
      linkInput.disabled = true;
    } else if (val === 'pwa') {
      linkLabel.textContent = 'Ação no App';
      linkInput.value = 'pwa';
      linkInput.disabled = true;
    } else if (val === 'none') {
      linkLabel.textContent = 'Destino';
      linkInput.value = '#';
      linkGroup.style.display = 'none';
    }
  }

  function normalizeBannerTargetLink(type, rawVal) {
    const raw = (rawVal || '').trim();
    if (type === 'share') return 'share';
    if (type === 'pwa') return 'pwa';
    if (type === 'none') return '#';

    if (type === 'instagram') {
      if (!raw) return 'https://www.instagram.com/';
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
      const cleanHandle = raw.replace(/^@/, '').trim();
      return `https://www.instagram.com/${cleanHandle}/`;
    }

    if (type === 'whatsapp') {
      if (!raw) return 'share';
      if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
      const digits = raw.replace(/\D/g, '');
      const fullNum = digits.startsWith('55') ? digits : `55${digits}`;
      return `https://wa.me/${fullNum}`;
    }

    if (type === 'site') {
      if (!raw) return '';
      if (/^[a-zA-Z]+:\/\//.test(raw)) return raw;
      return `https://${raw}`;
    }

    return raw;
  }

  function detectBannerLinkType(ctaLink) {
    const link = (ctaLink || '').trim().toLowerCase();
    if (!link || link === '#' || link === 'javascript:void(0)') return { type: 'none', value: '' };
    if (link === 'share' || link === '#share') return { type: 'share', value: '' };
    if (link === 'pwa' || link === '#pwa' || link === 'install') return { type: 'pwa', value: '' };
    if (link.includes('instagram.com/')) {
      const match = link.match(/instagram\.com\/([a-zA-Z0-9._-]+)/i);
      return { type: 'instagram', value: match ? `@${match[1]}` : ctaLink };
    }
    if (link.includes('wa.me/') || link.includes('api.whatsapp.com')) {
      const match = link.match(/\/(?:send\?phone=)?(\d+)/);
      return { type: 'whatsapp', value: match ? match[1].replace(/^55/, '') : ctaLink };
    }
    return { type: 'site', value: ctaLink };
  }

  // =========================================================
  // MODAIS & OPERAÇÕES CRUD DE BANNERS
  // =========================================================
  function openBannerModal(bannerData = null) {
    const modal = document.getElementById('modal-banner');
    const titleEl = document.getElementById('modal-banner-title');
    const form = document.getElementById('form-banner');
    if (!modal || !form) return;

    form.reset();
    clearBannerImage();

    const typeSelect = document.getElementById('banner-link-type');
    const linkInput = document.getElementById('banner-cta-link');
    const durationInput = document.getElementById('banner-duration');

    if (bannerData) {
      titleEl.textContent = 'Editar Banner de Anúncio';
      document.getElementById('banner-id').value = bannerData.id || '';
      document.getElementById('banner-title').value = bannerData.title || '';
      document.getElementById('banner-description').value = bannerData.description || '';
      document.getElementById('banner-badge').value = bannerData.badge_text || '';
      document.getElementById('banner-theme').value = bannerData.theme || 'purple-viral';
      document.getElementById('banner-cta-text').value = bannerData.cta_text || '';

      const detected = detectBannerLinkType(bannerData.cta_link);
      if (typeSelect) typeSelect.value = detected.type;
      handleBannerLinkTypeChange();
      if (linkInput) linkInput.value = detected.value || bannerData.cta_link || '';

      const imgInput = document.getElementById('banner-image-url');
      if (imgInput) imgInput.value = bannerData.image_url || '';
      updateBannerImagePreview(bannerData.image_url || '');

      document.getElementById('banner-sort-order').value = bannerData.sort_order ?? 10;
      if (durationInput) durationInput.value = bannerData.display_seconds ?? 5;
      document.getElementById('banner-active').checked = bannerData.active !== false;

      const details = document.getElementById('banner-text-options');
      if (details && !bannerData.image_url && (bannerData.description || bannerData.badge_text)) {
        details.open = true;
      }
    } else {
      titleEl.textContent = 'Criar Novo Banner de Anúncio';
      document.getElementById('banner-id').value = '';
      if (typeSelect) typeSelect.value = 'instagram';
      handleBannerLinkTypeChange();
      if (linkInput) linkInput.value = '';
      document.getElementById('banner-theme').value = 'purple-viral';
      document.getElementById('banner-sort-order').value = 10;
      if (durationInput) durationInput.value = 5;
      document.getElementById('banner-active').checked = true;
    }

    modal.classList.add('active');
  }

  function closeBannerModal() {
    const modal = document.getElementById('modal-banner');
    if (modal) modal.classList.remove('active');
    clearBannerImage();
  }

  function editBanner(id) {
    const banner = state.banners.find(b => b.id === id);
    if (banner) {
      openBannerModal(banner);
    }
  }

  async function saveBanner() {
    const id = document.getElementById('banner-id').value;
    const title = (document.getElementById('banner-title')?.value || '').trim();
    if (!title) {
      alert('Informe o nome ou título do anúncio.');
      return;
    }

    const btn = document.getElementById('btn-save-banner');
    const originalBtnHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Salvando banner...</span>';
    }

    try {
      let finalImageUrl = (document.getElementById('banner-image-url')?.value || '').trim() || null;

      // 1. Upload de nova imagem para o Supabase Storage se houver arquivo selecionado
      if (pendingBannerFile) {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up fa-spin"></i> <span>Enviando imagem...</span>';
        finalImageUrl = await uploadBannerFileToSupabase(pendingBannerFile);
      }

      // Validação de segurança: se o usuário não enviou imagem nem preencheu texto descritivo
      if (!finalImageUrl && !document.getElementById('banner-description')?.value?.trim()) {
        if (!confirm('Este banner está sendo salvo SEM imagem de arte. Ele será exibido como um card com texto e botão. Deseja continuar?')) {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalBtnHtml || '<i class="fa-solid fa-check"></i> <span>Salvar Banner</span>';
          }
          return;
        }
      }

      // 2. Monta o link normalizado conforme a opção escolhida
      const linkType = document.getElementById('banner-link-type')?.value || 'instagram';
      const rawLinkVal = document.getElementById('banner-cta-link')?.value || '';
      const finalCtaLink = normalizeBannerTargetLink(linkType, rawLinkVal);

      const durationSec = Math.min(60, Math.max(2, parseInt(document.getElementById('banner-duration')?.value, 10) || 5));
      const sortOrder = parseInt(document.getElementById('banner-sort-order')?.value, 10) || 0;
      const isActive = document.getElementById('banner-active')?.checked !== false;

      const desc = (document.getElementById('banner-description')?.value || '').trim();
      const badge = (document.getElementById('banner-badge')?.value || '').trim() || (finalImageUrl ? 'Anúncio' : 'DESTAQUE');
      const theme = document.getElementById('banner-theme')?.value || 'purple-viral';
      const ctaText = (document.getElementById('banner-cta-text')?.value || '').trim() || (linkType === 'instagram' ? 'Ver Instagram' : (linkType === 'whatsapp' ? 'Chamar no WhatsApp' : 'Saiba Mais'));

      const payload = {
        title: title,
        description: desc || null,
        badge_text: badge,
        theme: theme,
        cta_text: ctaText,
        cta_link: finalCtaLink,
        image_url: finalImageUrl,
        sort_order: sortOrder,
        display_seconds: durationSec,
        active: isActive,
        updated_at: new Date().toISOString()
      };

      let res;
      if (id) {
        res = await fetch(`${SUPABASE_URL}/rest/v1/banners?id=eq.${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${SUPABASE_URL}/rest/v1/banners`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        closeBannerModal();
        await fetchBanners();
        renderDashboard();
        renderBanners();
        updateCounters();
        alert('✅ Banner salvo com sucesso e sincronizado em tempo real no app!');
      } else {
        const errData = await res.text();
        alert('Erro ao salvar banner no banco: ' + errData);
      }
    } catch (err) {
      alert('Falha ao processar banner: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml || '<i class="fa-solid fa-check"></i> <span>Salvar Banner</span>';
      }
    }
  }



  async function toggleBannerActive(id, newStatus) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/banners?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ active: newStatus, updated_at: new Date().toISOString() })
      });

      if (res.ok) {
        const b = state.banners.find(item => item.id === id);
        if (b) b.active = newStatus;
        renderDashboard();
        renderBanners();
      } else {
        alert('Erro ao alterar status do banner no Supabase.');
      }
    } catch (err) {
      alert('Falha de rede ao alterar status do banner: ' + err.message);
    }
  }

  async function deleteBanner(id) {
    if (!confirm('Tem certeza que deseja excluir permanentemente este banner de anúncio?')) {
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/banners?id=eq.${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (res.ok) {
        state.banners = state.banners.filter(b => b.id !== id);
        renderDashboard();
        renderBanners();
        updateCounters();
      } else {
        alert('Erro ao excluir banner.');
      }
    } catch (err) {
      alert('Falha ao excluir banner: ' + err.message);
    }
  }

  // =========================================================
  // OPERAÇÕES: PROFISSIONAIS
  // =========================================================
  async function toggleProfessionalVerified(id, currentStatus) {
    const pro = state.professionals.find(p => p.id === id);
    const baseStatus = pro ? Boolean(pro.verified) : Boolean(currentStatus);
    const newStatus = !baseStatus;
    try {
      let savedOk = false;

      // 1. Tenta via RPC SECURITY DEFINER (atualiza professional_profiles.verified e profiles.is_verified simultaneamente)
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_set_professional_verified`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ p_pro_id: id, p_verified: newStatus })
      });

      if (rpcRes.ok) {
        savedOk = true;
      } else {
        // 2. Fallback direto via PATCH na tabela professional_profiles
        const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/professional_profiles?id=eq.${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify({ verified: newStatus, updated_at: new Date().toISOString() })
        });
        if (patchRes.ok) {
          const rows = await patchRes.json().catch(() => []);
          savedOk = Array.isArray(rows) ? rows.length > 0 : true;
        }
      }

      if (savedOk) {
        if (pro) {
          pro.verified = newStatus;
          if (pro.profiles) pro.profiles.is_verified = newStatus;
        }
        renderDashboard();
        filterProfessionals();
      } else {
        alert('Erro ao salvar o status de verificação no banco de dados.');
        filterProfessionals();
      }
    } catch (err) {
      alert('Falha ao atualizar status de verificação: ' + err.message);
      filterProfessionals();
    }
  }

  // =========================================================
  // MODAIS & OPERAÇÕES: ASSINATURAS PRO
  // =========================================================
  function openSubscriptionModal(proId = null) {
    const modal = document.getElementById('modal-subscription');
    const proSelect = document.getElementById('sub-pro-id');
    if (!modal) return;

    if (proId && proSelect) {
      proSelect.value = proId;
    }
    modal.classList.add('active');
  }

  function closeSubscriptionModal() {
    const modal = document.getElementById('modal-subscription');
    if (modal) modal.classList.remove('active');
  }

  async function saveSubscription() {
    const proId = document.getElementById('sub-pro-id').value;
    const planName = document.getElementById('sub-plan-name').value;
    const amount = parseFloat(document.getElementById('sub-amount').value) || 29.90;
    const expiresAt = document.getElementById('sub-expires-at').value;
    const paymentMethod = document.getElementById('sub-payment-method').value;

    if (!proId) {
      alert('Selecione um profissional para associar ao plano PRO.');
      return;
    }

    const payload = {
      professional_id: proId,
      plan_name: planName,
      amount: amount,
      payment_method: paymentMethod,
      status: 'active',
      starts_at: new Date().toISOString(),
      expires_at: new Date(expiresAt).toISOString()
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pro_subscriptions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        closeSubscriptionModal();
        await fetchSubscriptions();
        renderDashboard();
        renderProfessionals();
        renderMonetization();
        updateCounters();
        alert('Assinatura PRO ativada com sucesso!');
      } else {
        const err = await res.text();
        alert('Erro ao salvar assinatura PRO: ' + err);
      }
    } catch (err) {
      alert('Erro de conexão ao ativar assinatura: ' + err.message);
    }
  }

  async function cancelSubscription(id) {
    if (!confirm('Deseja realmente cancelar esta assinatura PRO?')) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pro_subscriptions?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'cancelled', updated_at: new Date().toISOString() })
      });

      if (res.ok) {
        await fetchSubscriptions();
        renderDashboard();
        renderProfessionals();
        renderMonetization();
        updateCounters();
      } else {
        alert('Erro ao cancelar assinatura.');
      }
    } catch (err) {
      alert('Erro de rede: ' + err.message);
    }
  }

  // =========================================================
  // RELÓGIO DO TEMPO DA BASE — CONTADOR CLIENTES + PROS
  // =========================================================
  let adminConfettiInterval = null;
  let adminPreviousTotal = 0;

  function renderAdminTimeClock() {
    const clientsCount = state.users.filter(u => u.role !== 'professional').length || state.users.length;
    const prosCount = state.professionals.length;
    const totalCount = clientsCount + prosCount;

    // Atualiza tags discriminadas
    const clientsTag = document.getElementById('admin-clock-clients-tag');
    const prosTag = document.getElementById('admin-clock-pros-tag');
    const totalTag = document.getElementById('admin-clock-total-tag');

    if (clientsTag) clientsTag.innerHTML = `<i class="fa-solid fa-user"></i> ${clientsCount} Clientes`;
    if (prosTag) prosTag.innerHTML = `<i class="fa-solid fa-user-tie"></i> ${prosCount} Profissionais`;
    if (totalTag) totalTag.textContent = `Total: ${totalCount}`;

    // Atualiza dados no modal festivo
    const celebClients = document.getElementById('celeb-clients-count');
    const celebPros = document.getElementById('celeb-pros-count');
    if (celebClients) celebClients.textContent = clientsCount;
    if (celebPros) celebPros.textContent = prosCount;

    // Animação de subida mecânica dos dígitos do odômetro
    animateAdminDigits(adminPreviousTotal, totalCount, 1200);
    adminPreviousTotal = totalCount;

    // Se bater 1.000 usuários reais no banco, ativa a comemoração automática!
    const banner = document.getElementById('admin-time-clock-widget');
    if (totalCount >= 1000 && banner) {
      banner.classList.add('celebration-mode');
      const targetPill = document.getElementById('admin-clock-target-pill');
      if (targetPill) {
        targetPill.innerHTML = `<i class="fa-solid fa-trophy"></i> META 1.000 ALCANÇADA!`;
        targetPill.style.background = 'rgba(245, 158, 11, 0.4)';
      }
    }
  }

  function setDigitValues(val) {
    const clamped = Math.max(0, Math.min(9999, Math.round(val)));
    const str = String(clamped).padStart(4, '0');

    const dThous = document.getElementById('admin-digit-thousands');
    const dHund = document.getElementById('admin-digit-hundreds');
    const dTens = document.getElementById('admin-digit-tens');
    const dUnits = document.getElementById('admin-digit-units');

    if (dThous) dThous.textContent = str[0];
    if (dHund) dHund.textContent = str[1];
    if (dTens) dTens.textContent = str[2];
    if (dUnits) dUnits.textContent = str[3];

    // Barra de progresso
    const fill = document.getElementById('admin-clock-progress-fill');
    const label = document.getElementById('admin-clock-progress-label');
    const percentEl = document.getElementById('admin-clock-percent-val');

    const percent = Math.min(100, (clamped / 1000) * 100);
    if (fill) fill.style.width = `${percent.toFixed(1)}%`;
    if (percentEl) percentEl.textContent = `${percent.toFixed(1)}%`;

    if (label) {
      if (clamped >= 1000) {
        label.innerHTML = `<strong>1.000+ Usuários</strong> · Meta Histórica Conquistada! 🎉`;
      } else {
        const remaining = 1000 - clamped;
        label.textContent = `${clamped} de 1.000 usuários (Faltam apenas ${remaining})`;
      }
    }
  }

  function animateAdminDigits(start, target, duration = 1200) {
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = start + (target - start) * easeOut;

      setDigitValues(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDigitValues(target);
      }
    }

    requestAnimationFrame(step);
  }

  // =========================================================
  // SISTEMA DE COMEMORAÇÃO & CONFETES (ADMIN)
  // =========================================================
  function triggerCelebration(isManual = false) {
    const modal = document.getElementById('admin-celebration-modal');
    const banner = document.getElementById('admin-time-clock-widget');
    if (!modal) return;

    if (isManual) {
      // Efeito visual imediato com o odômetro batendo 1.000 no painel
      animateAdminDigits(adminPreviousTotal, 1000, 1000);
      if (banner) banner.classList.add('celebration-mode');
    }

    modal.style.display = 'flex';
    startAdminConfetti();
  }

  function closeCelebration() {
    const modal = document.getElementById('admin-celebration-modal');
    if (modal) modal.style.display = 'none';
    stopAdminConfetti();

    // Se foi simulação, volta os dígitos ao valor real acumulado
    const clientsCount = state.users.filter(u => u.role !== 'professional').length || state.users.length;
    const prosCount = state.professionals.length;
    const realTotal = clientsCount + prosCount;
    setDigitValues(realTotal);
    const banner = document.getElementById('admin-time-clock-widget');
    if (realTotal < 1000 && banner) {
      banner.classList.remove('celebration-mode');
    }
  }

  function shareMilestoneOnWhatsapp() {
    const text = `🎉 MARCA HISTÓRICA DO TRAMPOU EM PARAUAPEBAS!\n\nAcabamos de atingir a meta oficial de 1.000 usuários e profissionais cadastrados na nossa plataforma!\n\nObrigado a cada parceiro e cidadão por fazer parte desse marco.\nAcesse e contrate com facilidade:\nhttps://trampou.jw.tec.br`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  function startAdminConfetti() {
    const canvas = document.getElementById('admin-confetti-canvas');
    if (!canvas) return;

    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const confettiCount = 150;
    const colors = ['#6825B3', '#9333EA', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#FBBF24', '#06B6D4'];
    const confetti = [];

    for (let i = 0; i < confettiCount; i++) {
      confetti.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * confettiCount,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0,
        speed: Math.random() * 3 + 2.5
      });
    }

    let angle = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;

      for (let i = 0; i < confettiCount; i++) {
        const p = confetti[i];
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) / 2 * p.speed;
        p.x += Math.sin(angle);
        p.tilt = Math.sin(p.tiltAngle) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
        ctx.stroke();

        if (p.y > canvas.height) {
          confetti[i] = {
            x: Math.random() * canvas.width,
            y: -20,
            r: p.r,
            d: p.d,
            color: p.color,
            tilt: p.tilt,
            tiltAngleIncremental: p.tiltAngleIncremental,
            tiltAngle: p.tiltAngle,
            speed: p.speed
          };
        }
      }
    }

    if (adminConfettiInterval) clearInterval(adminConfettiInterval);
    adminConfettiInterval = setInterval(draw, 20);
  }

  function stopAdminConfetti() {
    const canvas = document.getElementById('admin-confetti-canvas');
    if (adminConfettiInterval) {
      clearInterval(adminConfettiInterval);
      adminConfettiInterval = null;
    }
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
  }

  // =========================================================
  // UTILITÁRIOS
  // =========================================================
  function formatCurrency(val) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================
  // INICIALIZAÇÃO
  // =========================================================
  function ensureFeedbackStyles() {
    if (document.getElementById('trampou-feedbacks-ui-styles')) return;
    const style = document.createElement('style');
    style.id = 'trampou-feedbacks-ui-styles';
    style.textContent = `.btn-admin-primary,.btn-action-primary{background:#6825B3;color:#FFFFFF!important;border:1px solid #6825B3;border-radius:8px;padding:8px 14px;font-size:12.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:all .15s ease;text-decoration:none}.btn-admin-primary:hover,.btn-action-primary:hover{background:#4C1D95;border-color:#4C1D95;transform:translateY(-1px)}.tab-header-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:20px 24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.05)}.tab-title{font-size:18px;font-weight:800;color:#0F172A;letter-spacing:-.3px;margin:0 0 4px}.tab-subtitle{font-size:13px;color:#64748B;margin:0;line-height:1.4}.tab-actions-row{display:flex;align-items:center;gap:10px}.btn-admin-secondary{display:inline-flex;align-items:center;gap:8px;background:#FFFFFF;border:1px solid #E2E8F0;color:#334155;font-size:13px;font-weight:700;padding:9px 16px;border-radius:10px;cursor:pointer;transition:all .15s ease}.btn-admin-secondary:hover{background:#F8FAFC;border-color:#6825B3;color:#6825B3}.admin-stats-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:18px!important;margin-bottom:24px!important}.admin-stat-card{background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:18px 20px;box-shadow:0 1px 3px rgba(0,0,0,.05);display:flex;align-items:center;gap:16px}.stat-icon-circle{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}.stat-icon-circle.purple{background:#EDE9FE;color:#6825B3}.stat-icon-circle.gold{background:#FEF3C7;color:#D97706}.stat-icon-circle.blue{background:#EFF6FF;color:#2563EB}.stat-icon-circle.red{background:#FEF2F2;color:#DC2626}.stat-info{display:flex;flex-direction:column;gap:4px;min-width:0}.stat-label{font-size:12.5px;font-weight:600;color:#64748B}.stat-number{font-size:24px;font-weight:900;color:#0F172A;line-height:1.1}.admin-filter-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:14px 18px;margin-bottom:22px;box-shadow:0 1px 3px rgba(0,0,0,.05)}.filter-search-wrap{position:relative;flex:1;min-width:240px;display:flex;align-items:center}.filter-search-wrap i{position:absolute;left:14px;color:#94A3B8;font-size:13.5px;pointer-events:none}.filter-search-wrap input{width:100%;height:40px;padding:0 14px 0 38px;border:1px solid #E2E8F0;border-radius:10px;font-size:13px;color:#0F172A;background:#F1F5F9;outline:none}.filter-search-wrap input:focus{background:#FFFFFF;border-color:#6825B3}.filter-select-wrap{min-width:185px}.filter-select-wrap select{width:100%;height:40px;padding:0 12px;border:1px solid #E2E8F0;border-radius:10px;font-size:13px;font-weight:600;color:#334155;background:#FFFFFF;outline:none;cursor:pointer}`;
    document.head.appendChild(style);
  }

  let deferredInstallPrompt = null;

  function toggleMobileSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-sidebar-overlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('admin-sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
  }

  function promptInstallPWA() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          const btn = document.getElementById('btn-install-pwa');
          if (btn) btn.style.display = 'none';
        }
        deferredInstallPrompt = null;
      });
    } else {
      alert('📱 Como instalar o Trampou Admin no seu celular:\n\n• No Android (Chrome): Toque nos 3 pontinhos do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".\n\n• No iPhone (Safari): Toque no botão Compartilhar e escolha "Adicionar à Tela de Início".');
    }
  }

  function init() {
    ensureFeedbackStyles();
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById('btn-install-pwa');
      if (btn) btn.style.display = 'inline-flex';
    });
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => { if (k !== 'trampou-admin-v2.0.0') caches.delete(k); }));
    }
    if ('serviceWorker' in navigator && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
    }
    startLiveClock();
    initNavigation();

    if (isAuthenticated()) {
      showAppLayout();
      initAdminData();
    } else {
      const authScreen = document.getElementById('admin-auth-screen');
      if (authScreen) authScreen.style.display = 'flex';
    }
  }

  // =========================================================
  // GESTÃO DE SUGESTÕES & FEEDBACKS DOS USUÁRIOS
  // =========================================================
  async function fetchFeedbacks() {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_feedbacks?select=*&order=created_at.desc`, {
        headers: getHeaders()
      });
      if (res.ok) {
        state.feedbacks = await res.json();
        updateCounters();
        return;
      }
    } catch (err) {
      console.warn('Erro ao buscar feedbacks do Supabase:', err);
    }
    state.feedbacks = [];
  }

  function renderFeedbacks() {
    const listEl = document.getElementById('admin-feedbacks-list');
    if (!listEl) return;

    const searchVal = (document.getElementById('filter-feedback-search')?.value || '').toLowerCase().trim();
    const typeVal = document.getElementById('filter-feedback-type')?.value || 'all';
    const statusVal = document.getElementById('filter-feedback-status')?.value || 'all';

    // Filtragem
    const filtered = (state.feedbacks || []).filter(f => {
      if (typeVal !== 'all' && f.feedback_type !== typeVal) return false;
      if (statusVal !== 'all' && f.status !== statusVal) return false;
      if (searchVal) {
        const name = (f.user_name || '').toLowerCase();
        const title = (f.title || '').toLowerCase();
        const msg = (f.message || '').toLowerCase();
        const city = (f.city || '').toLowerCase();
        if (!name.includes(searchVal) && !title.includes(searchVal) && !msg.includes(searchVal) && !city.includes(searchVal)) {
          return false;
        }
      }
      return true;
    });

    // Atualiza stats cards
    const total = state.feedbacks.length;
    const suggestions = state.feedbacks.filter(f => f.feedback_type === 'sugestao').length;
    const issues = state.feedbacks.filter(f => f.feedback_type === 'problema').length;
    const ratings = state.feedbacks.map(f => Number(f.rating) || 5);
    const avgRating = total > 0 ? (ratings.reduce((a, b) => a + b, 0) / total).toFixed(1) : '5.0';

    const statTotal = document.getElementById('stat-feedbacks-total');
    const statRating = document.getElementById('stat-feedbacks-rating');
    const statSuggestions = document.getElementById('stat-feedbacks-suggestions');
    const statIssues = document.getElementById('stat-feedbacks-issues');

    if (statTotal) statTotal.textContent = total;
    if (statRating) statRating.textContent = `${avgRating} ⭐`;
    if (statSuggestions) statSuggestions.textContent = suggestions;
    if (statIssues) statIssues.textContent = issues;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="feedbacks-empty-state">
          <i class="fa-solid fa-lightbulb"></i>
          <h4>Nenhum feedback encontrado</h4>
          <p>Nenhuma sugestão enviada com os filtros atuais.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(f => {
      const badgeLabels = {
        sugestao: '<i class="fa-solid fa-lightbulb"></i> Sugestão',
        elogio: '<i class="fa-solid fa-star"></i> Elogio',
        problema: '<i class="fa-solid fa-triangle-exclamation"></i> Problema',
        outro: '<i class="fa-solid fa-comment-dots"></i> Outro'
      };

      const starsCount = Math.max(1, Math.min(5, Number(f.rating) || 5));
      const starsHtml = Array.from({ length: 5 }, (_, i) => `<i class="fa-${i < starsCount ? 'solid' : 'regular'} fa-star"></i>`).join('');

      const dateStr = f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recente';

      // Cruza com a tabela public.profiles (state.users) para identificar a conta real do usuário
      const rawPhone = (f.user_phone || '').trim();
      const rawCleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
      const rawEmail = (f.user_email || '').trim().toLowerCase();

      const matchedProfile = (state.users || []).find(u => {
        if (f.user_id && u.id === f.user_id) return true;
        if (rawEmail && u.email && u.email.trim().toLowerCase() === rawEmail) return true;
        const uPhone = (u.phone_whatsapp || u.phone || '').replace(/\D/g, '');
        if (rawCleanPhone && uPhone && uPhone === rawCleanPhone) return true;
        return false;
      });

      const displayName = matchedProfile?.full_name || f.user_name || 'Usuário';
      const phone = (matchedProfile?.phone_whatsapp || matchedProfile?.phone || f.user_phone || '').trim();
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      const email = (matchedProfile?.email || f.user_email || '').trim();

      const defaultZapMsg = `Olá ${displayName}! Aqui é da equipe do Trampou. Recebemos sua mensagem sobre "${f.title || 'o app'}" e estamos entrando em contato para te responder!`;
      const whatsappLink = cleanPhone
        ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(f.admin_reply ? `Olá ${displayName}! Aqui é da equipe do Trampou.\n\nEm resposta à sua mensagem sobre "${f.title || 'o app'}":\n\n${f.admin_reply}` : defaultZapMsg)}`
        : null;

      const emailSubject = encodeURIComponent(`Resposta da equipe Trampou: ${f.title || 'Seu Feedback'}`);
      const emailBody = encodeURIComponent(`Olá ${displayName},\n\nAqui é da equipe do Trampou!\n\n${f.admin_reply || 'Agradecemos pelo seu contato sobre o app.'}\n\nAtenciosamente,\nEquipe Trampou`);
      const emailLink = email ? `mailto:${email}?subject=${emailSubject}&body=${emailBody}` : null;

      const hasReply = !!f.admin_reply;
      const replyDateStr = f.admin_replied_at 
        ? new Date(f.admin_replied_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '';

      const verificationBadgeHtml = matchedProfile
        ? `<span class="badge-status-pill success" style="font-size: 10px; padding: 2px 8px;" title="Conta real autenticada na tabela profiles (ID: ${matchedProfile.id})">
             <i class="fa-solid fa-user-check"></i> Conta Verificada (${matchedProfile.role === 'professional' ? 'Profissional' : 'Cliente'})
           </span>`
        : `<span class="badge-status-pill danger" style="font-size: 10px; padding: 2px 8px;" title="Este e-mail/ID não foi localizado na tabela profiles">
             <i class="fa-solid fa-triangle-exclamation"></i> Conta Não Identificada no DB
           </span>`;

      return `
        <div class="admin-feedback-card status-${f.status || 'pendente'}">
          <div class="fb-card-top">
            <span class="fb-badge ${f.feedback_type || 'sugestao'}">
              ${badgeLabels[f.feedback_type] || '<i class="fa-solid fa-comment"></i> ' + f.feedback_type}
            </span>
            <span class="fb-card-date">${dateStr}</span>
          </div>

          <div class="fb-card-rating">
            ${starsHtml}
            <span>(${starsCount}/5)</span>
          </div>

          ${f.title ? `<h4 class="fb-card-title">${escapeHTML(f.title)}</h4>` : ''}
          <p class="fb-card-message">${escapeHTML(f.message || '')}</p>

          ${hasReply ? `
            <div class="fb-reply-box">
              <div class="fb-reply-header">
                <span><i class="fa-solid fa-reply"></i> Resposta Oficial da Equipe Trampou</span>
                <span style="font-size: 11px; color: #581C87; font-weight: 500;">${replyDateStr}</span>
              </div>
              <p class="fb-reply-text">${escapeHTML(f.admin_reply)}</p>
            </div>
          ` : ''}

          ${f.admin_notes ? `
            <div class="fb-notes-box">
              <i class="fa-solid fa-note-sticky"></i>
              <span><strong>Nota Interna:</strong> ${escapeHTML(f.admin_notes)}</span>
            </div>
          ` : ''}

          <div class="fb-card-user-info">
            <div class="fb-user-details">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="fb-user-name">${escapeHTML(displayName)}</span>
                ${verificationBadgeHtml}
              </div>
              <span class="fb-user-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(f.city || 'Parauapebas')}, ${escapeHTML(f.state || 'PA')}</span>
              ${email ? `<span style="font-size: 11px; color: #4F46E5; margin-top: 2px; word-break: break-all;"><i class="fa-regular fa-envelope"></i> ${escapeHTML(email)}</span>` : ''}
              ${phone ? `<span style="font-size: 11px; color: #059669; margin-top: 1px;"><i class="fa-brands fa-whatsapp"></i> ${escapeHTML(phone)}</span>` : ''}
              ${matchedProfile ? `<span style="font-size: 10.5px; color: #94A3B8; margin-top: 1px;">ID da Conta: <code>${escapeHTML(matchedProfile.id.substring(0, 8))}...</code></span>` : ''}
            </div>

            <div class="fb-card-actions-group" style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              ${whatsappLink ? `
                <a href="${whatsappLink}" target="_blank" class="fb-contact-btn" title="Conversar no WhatsApp">
                  <i class="fa-brands fa-whatsapp"></i> WhatsApp
                </a>
              ` : ''}
              ${emailLink ? `
                <a href="${emailLink}" class="fb-contact-btn" style="background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8;" title="Enviar E-mail">
                  <i class="fa-regular fa-envelope"></i> E-mail
                </a>
              ` : ''}
              <button class="btn-action-primary" style="padding: 5px 12px; font-size: 11.5px; background: #6825B3; border-color: #6825B3;" onclick="window.AdminApp.openFeedbackReplyModal('${f.id}')">
                <i class="fa-solid fa-reply"></i> ${hasReply ? 'Editar Resposta' : 'Responder'}
              </button>
            </div>
          </div>

          <div class="fb-card-footer">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748B;">Status:</span>
              <select class="fb-status-select" onchange="window.AdminApp.updateFeedbackStatus('${f.id}', this.value)">
                <option value="pendente" ${f.status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
                <option value="respondido" ${f.status === 'respondido' ? 'selected' : ''}>💬 Respondido</option>
                <option value="em_analise" ${f.status === 'em_analise' ? 'selected' : ''}>🔍 Em Análise</option>
                <option value="implementado" ${f.status === 'implementado' ? 'selected' : ''}>✅ Implementado</option>
                <option value="arquivado" ${f.status === 'arquivado' ? 'selected' : ''}>📁 Arquivado</option>
              </select>
            </div>
            <button class="btn-delete-fb" onclick="window.AdminApp.deleteFeedback('${f.id}')" title="Excluir feedback">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  let currentReplyFeedback = null;

  function openFeedbackReplyModal(id) {
    const feedback = state.feedbacks.find(f => f.id === id);
    if (!feedback) return;

    currentReplyFeedback = feedback;

    const modal = document.getElementById('modal-feedback-reply');
    if (!modal) return;

    const idInput = document.getElementById('reply-feedback-id');
    if (idInput) idInput.value = feedback.id;

    const nameEl = document.getElementById('reply-user-name');
    if (nameEl) nameEl.textContent = feedback.user_name || 'Usuário Sem Nome';
    
    const initials = (feedback.user_name || 'U').substring(0, 2).toUpperCase();
    const avatarEl = document.getElementById('reply-user-avatar');
    if (avatarEl) avatarEl.textContent = initials;

    const badgeEl = document.getElementById('reply-feedback-badge');
    if (badgeEl) {
      badgeEl.className = `fb-badge ${feedback.feedback_type || 'sugestao'}`;
      const badgeLabels = {
        sugestao: '💡 Sugestão',
        elogio: '⭐ Elogio',
        problema: '⚠️ Problema',
        outro: '💬 Outro'
      };
      badgeEl.innerHTML = badgeLabels[feedback.feedback_type] || feedback.feedback_type;
    }

    const titleEl = document.getElementById('reply-feedback-title');
    if (titleEl) titleEl.textContent = feedback.title || '';

    const msgEl = document.getElementById('reply-feedback-message');
    if (msgEl) msgEl.textContent = feedback.message || '';

    const contactsEl = document.getElementById('reply-user-contacts');
    if (contactsEl) {
      const parts = [];
      if (feedback.user_email) parts.push(`<span><i class="fa-regular fa-envelope"></i> ${escapeHTML(feedback.user_email)}</span>`);
      if (feedback.user_phone) parts.push(`<span><i class="fa-brands fa-whatsapp"></i> ${escapeHTML(feedback.user_phone)}</span>`);
      parts.push(`<span><i class="fa-solid fa-location-dot"></i> ${escapeHTML(feedback.city || 'Parauapebas')}, ${escapeHTML(feedback.state || 'PA')}</span>`);
      contactsEl.innerHTML = parts.join('');
    }

    const replyInput = document.getElementById('feedback-reply-text');
    if (replyInput) {
      replyInput.value = feedback.admin_reply || `Olá ${feedback.user_name || ''}! Agradecemos muito pelo seu feedback. Analisamos sua mensagem e ficamos felizes em te responder!`;
    }

    const statusSelect = document.getElementById('feedback-reply-status');
    if (statusSelect) {
      statusSelect.value = feedback.status === 'pendente' ? 'respondido' : (feedback.status || 'respondido');
    }

    const notesInput = document.getElementById('feedback-admin-notes');
    if (notesInput) {
      notesInput.value = feedback.admin_notes || '';
    }

    const btnZap = document.getElementById('btn-reply-whatsapp');
    if (btnZap) {
      btnZap.style.display = feedback.user_phone ? 'inline-flex' : 'none';
    }

    const btnEmail = document.getElementById('btn-reply-email');
    if (btnEmail) {
      btnEmail.style.display = feedback.user_email ? 'inline-flex' : 'none';
    }

    modal.classList.add('active');
  }

  function closeFeedbackReplyModal() {
    const modal = document.getElementById('modal-feedback-reply');
    if (modal) modal.classList.remove('active');
    currentReplyFeedback = null;
  }

  async function saveFeedbackReply() {
    const id = document.getElementById('reply-feedback-id')?.value;
    const replyText = document.getElementById('feedback-reply-text')?.value.trim();
    const newStatus = document.getElementById('feedback-reply-status')?.value || 'respondido';
    const adminNotes = document.getElementById('feedback-admin-notes')?.value.trim();

    if (!id || !replyText) {
      alert('Por favor, digite uma resposta para salvar.');
      return;
    }

    const btn = document.getElementById('btn-submit-reply');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvando...';
    }

    try {
      const now = new Date().toISOString();
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_feedbacks?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({
          admin_reply: replyText,
          admin_replied_at: now,
          status: newStatus,
          admin_notes: adminNotes || null,
          updated_at: now
        })
      });

      if (res.ok) {
        const item = state.feedbacks.find(f => f.id === id);
        if (item) {
          item.admin_reply = replyText;
          item.admin_replied_at = now;
          item.status = newStatus;
          item.admin_notes = adminNotes || null;
        }
        updateCounters();
        renderFeedbacks();
        renderDashboard();
        closeFeedbackReplyModal();
        alert('✅ Resposta oficial salva com sucesso no sistema!');
      } else {
        alert('Erro ao salvar resposta no banco de dados.');
      }
    } catch (err) {
      console.error('Erro ao salvar resposta:', err);
      alert('Erro de conexão ao salvar resposta: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salvar Resposta Oficial';
      }
    }
  }

  function sendReplyViaWhatsApp() {
    if (!currentReplyFeedback || !currentReplyFeedback.user_phone) {
      alert('Este usuário não informou telefone/WhatsApp.');
      return;
    }
    const cleanPhone = currentReplyFeedback.user_phone.replace(/\D/g, '');
    const replyText = document.getElementById('feedback-reply-text')?.value.trim() || '';
    const message = `Olá ${currentReplyFeedback.user_name || ''}! Aqui é da equipe do Trampou.\n\nEm resposta à sua mensagem sobre "${currentReplyFeedback.title || 'o aplicativo'}":\n\n${replyText}\n\nMuito obrigado pela colaboração!`;
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  function sendReplyViaEmail() {
    if (!currentReplyFeedback || !currentReplyFeedback.user_email) {
      alert('Este usuário não informou e-mail.');
      return;
    }
    const replyText = document.getElementById('feedback-reply-text')?.value.trim() || '';
    const subject = encodeURIComponent(`Resposta da equipe Trampou: ${currentReplyFeedback.title || 'Seu Feedback'}`);
    const body = encodeURIComponent(`Olá ${currentReplyFeedback.user_name || ''},\n\nAqui é da equipe de suporte do Trampou!\n\n${replyText}\n\nMuito obrigado pelo seu feedback!\n\nAtenciosamente,\nEquipe Trampou`);
    window.location.href = `mailto:${currentReplyFeedback.user_email}?subject=${subject}&body=${body}`;
  }

  async function updateFeedbackStatus(id, newStatus) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_feedbacks?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() })
      });
      if (res.ok) {
        const item = state.feedbacks.find(f => f.id === id);
        if (item) item.status = newStatus;
        updateCounters();
        renderFeedbacks();
        renderDashboard();
      }
    } catch (err) {
      console.error('Erro ao atualizar status do feedback:', err);
    }
  }

  async function deleteFeedback(id) {
    if (!confirm('Deseja realmente excluir este feedback?')) return;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/app_feedbacks?id=eq.${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        state.feedbacks = state.feedbacks.filter(f => f.id !== id);
        updateCounters();
        renderFeedbacks();
        renderDashboard();
      }
    } catch (err) {
      console.error('Erro ao excluir feedback:', err);
    }
  }

  // Expõe a API pública do Admin no objeto global
  window.AdminApp = {
    handleLogin,
    togglePasswordVisibility,
    logout,
    switchTab,
    refreshAllData,
    handleBannerImageSelect,
    clearBannerImage,
    updateBannerImagePreview,
    handleBannerLinkTypeChange,
    openBannerModal,
    closeBannerModal,
    editBanner,
    saveBanner,
    toggleBannerActive,
    deleteBanner,
    toggleProfessionalVerified,
    openSubscriptionModal,
    closeSubscriptionModal,
    saveSubscription,
    cancelSubscription,
    filterProfessionals,
    filterUsers,
    triggerCelebration,
    closeCelebration,
    shareMilestoneOnWhatsapp,
    refreshFeedbacks: async function () {
      await fetchFeedbacks();
      renderFeedbacks();
      renderDashboard();
    },
    filterFeedbacks: renderFeedbacks,
    updateFeedbackStatus,
    deleteFeedback,
    openFeedbackReplyModal,
    closeFeedbackReplyModal,
    saveFeedbackReply,
    sendReplyViaWhatsApp,
    sendReplyViaEmail,
    toggleMobileSidebar,
    closeMobileSidebar,
    promptInstallPWA
  };

  // Dispara no carregamento da DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


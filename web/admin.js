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
    const navItems = document.querySelectorAll('.admin-nav-item');
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
    document.querySelectorAll('.admin-nav-item').forEach(item => {
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
      state.professionals = await res.json();
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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pro_subscriptions?select=*,professional_profiles(*,profiles(full_name,email,phone))&order=created_at.desc`, {
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
            <tr>
              <td>
                <div style="font-weight: 700; color: #0F172A;">${escapeHTML(name)}</div>
              </td>
              <td>${escapeHTML(spec)}</td>
              <td>
                ${p.verified 
                  ? `<span class="badge-status-pill success"><i class="fa-solid fa-circle-check"></i> Verificado</span>` 
                  : `<span class="badge-status-pill neutral">Pendente</span>`}
              </td>
            </tr>
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
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: #94A3B8;">Nenhum profissional cadastrado ou correspondente ao filtro.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => {
      const name = p.profiles ? p.profiles.full_name : 'Profissional';
      const phone = p.profiles ? p.profiles.phone : '';
      const avatar = p.profiles ? p.profiles.avatar_url : null;
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      const categoryName = p.categories ? p.categories.name : (p.specialty || 'Diversos');

      // Verifica se possui plano PRO ativo
      const hasPro = state.subscriptions.some(s => s.professional_id === p.id && s.status === 'active');

      return `
        <tr>
          <td>
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
          <td>
            ${cleanPhone 
              ? `<a href="https://wa.me/55${cleanPhone}" target="_blank" style="color: #059669; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                   <i class="fa-brands fa-whatsapp"></i> ${escapeHTML(phone)}
                 </a>` 
              : `<span style="color: #94A3B8;">Não informado</span>`}
          </td>
          <td>
            <span class="badge-status-pill neutral">${escapeHTML(categoryName)}</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 4px; font-weight: 700; color: #F59E0B;">
              <i class="fa-solid fa-star"></i>
              <span>${p.rating || '5.0'}</span>
              <span style="font-size: 11px; color: #94A3B8; font-weight: normal;">(${p.total_reviews || 0})</span>
            </div>
          </td>
          <td>
            <label class="switch-toggle-label" title="Clique para ativar/desativar selo oficial verificado">
              <input type="checkbox" ${p.verified ? 'checked' : ''} onchange="window.AdminApp.toggleProfessionalVerified('${p.id}', ${p.verified})">
              <span>${p.verified ? '<strong style="color: #10B981;">Verificado</strong>' : '<span style="color: #94A3B8;">Não verificado</span>'}</span>
            </label>
          </td>
          <td>
            ${hasPro 
              ? `<span class="badge-status-pill pro"><i class="fa-solid fa-crown"></i> PRO Ativo</span>` 
              : `<span class="badge-status-pill neutral">Gratuito</span>`}
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
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
      const phone = (p.profiles?.phone || '').toLowerCase();
      const spec = (p.specialty || p.categories?.name || '').toLowerCase();

      const matchesQuery = !query || name.includes(query) || phone.includes(query) || spec.includes(query);

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
      const phone = u.phone || '';
      const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
      const role = u.role || 'client';
      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="admin-avatar-circle" style="width: 34px; height: 34px; font-size: 12px; background: #3B82F6;">
                ${escapeHTML(name.substring(0, 2).toUpperCase())}
              </div>
              <div style="font-weight: 700; color: #0F172A;">${escapeHTML(name)}</div>
            </div>
          </td>
          <td>${escapeHTML(email)}</td>
          <td>${phone ? escapeHTML(phone) : '<span style="color: #94A3B8;">Não cadastrado</span>'}</td>
          <td>
            <span class="badge-status-pill ${role === 'professional' ? 'pro' : 'neutral'}">
              ${role === 'professional' ? 'Profissional' : 'Cliente'}
            </span>
          </td>
          <td>${created}</td>
          <td>
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
      const phone = (u.phone || '').toLowerCase();
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
        <tr>
          <td>
            <div style="font-weight: 700; color: #0F172A;">${escapeHTML(proName)}</div>
          </td>
          <td><span class="badge-status-pill pro">${escapeHTML(plan)}</span></td>
          <td style="font-weight: 800; color: #059669;">${amount}</td>
          <td>${start}</td>
          <td>${expires}</td>
          <td>
            ${isActive 
              ? `<span class="badge-status-pill success"><i class="fa-solid fa-circle-check"></i> Ativo</span>` 
              : `<span class="badge-status-pill danger">Expirado</span>`}
          </td>
          <td>
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
        <tr>
          <td>
            <div class="kpi-icon-box purple" style="width: 32px; height: 32px; font-size: 13px;">
              <i class="fa-solid fa-briefcase"></i>
            </div>
          </td>
          <td style="font-weight: 700; color: #0F172A;">${escapeHTML(c.name)}</td>
          <td><code>${escapeHTML(c.slug)}</code></td>
          <td>
            <span class="badge-status-pill neutral"><strong>${count}</strong> profissionais</span>
          </td>
          <td>
            <span class="badge-status-pill success"><i class="fa-solid fa-check"></i> Ativa</span>
          </td>
        </tr>
      `;
    }).join('');
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

    if (bannerData) {
      titleEl.textContent = 'Editar Banner de Anúncio';
      document.getElementById('banner-id').value = bannerData.id || '';
      document.getElementById('banner-title').value = bannerData.title || '';
      document.getElementById('banner-description').value = bannerData.description || '';
      document.getElementById('banner-badge').value = bannerData.badge_text || '';
      document.getElementById('banner-theme').value = bannerData.theme || 'purple-viral';
      document.getElementById('banner-cta-text').value = bannerData.cta_text || '';
      document.getElementById('banner-cta-link').value = bannerData.cta_link || '';
      document.getElementById('banner-sort-order').value = bannerData.sort_order || 10;
      document.getElementById('banner-active').checked = bannerData.active !== false;
    } else {
      titleEl.textContent = 'Criar Novo Banner de Anúncio';
      document.getElementById('banner-id').value = '';
      document.getElementById('banner-theme').value = 'purple-viral';
      document.getElementById('banner-sort-order').value = 10;
      document.getElementById('banner-active').checked = true;
    }

    modal.classList.add('active');
  }

  function closeBannerModal() {
    const modal = document.getElementById('modal-banner');
    if (modal) modal.classList.remove('active');
  }

  function editBanner(id) {
    const banner = state.banners.find(b => b.id === id);
    if (banner) {
      openBannerModal(banner);
    }
  }

  async function saveBanner() {
    const id = document.getElementById('banner-id').value;
    const payload = {
      title: document.getElementById('banner-title').value.trim(),
      description: document.getElementById('banner-description').value.trim(),
      badge_text: document.getElementById('banner-badge').value.trim() || 'DESTAQUE',
      theme: document.getElementById('banner-theme').value,
      cta_text: document.getElementById('banner-cta-text').value.trim() || 'Saiba Mais',
      cta_link: document.getElementById('banner-cta-link').value.trim(),
      sort_order: parseInt(document.getElementById('banner-sort-order').value, 10) || 10,
      active: document.getElementById('banner-active').checked,
      updated_at: new Date().toISOString()
    };

    try {
      const btn = document.getElementById('btn-save-banner');
      if (btn) btn.disabled = true;

      let res;
      if (id) {
        // Atualização
        res = await fetch(`${SUPABASE_URL}/rest/v1/banners?id=eq.${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
      } else {
        // Criação
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
        alert('Banner salvo com sucesso!');
      } else {
        const errData = await res.text();
        alert('Erro ao salvar banner no banco: ' + errData);
      }
    } catch (err) {
      alert('Falha na conexão ao salvar banner: ' + err.message);
    } finally {
      const btn = document.getElementById('btn-save-banner');
      if (btn) btn.disabled = false;
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
    const newStatus = !currentStatus;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/professional_profiles?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ verified: newStatus, updated_at: new Date().toISOString() })
      });

      if (res.ok) {
        const pro = state.professionals.find(p => p.id === id);
        if (pro) pro.verified = newStatus;
        renderDashboard();
        renderProfessionals();
      } else {
        alert('Erro ao atualizar verificação do profissional.');
      }
    } catch (err) {
      alert('Falha ao atualizar status de verificação: ' + err.message);
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
  function init() {
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

      const contact = f.user_phone || f.user_email || '';
      const isPhone = contact && contact.replace(/\D/g, '').length >= 10;
      const whatsappLink = isPhone
        ? `https://wa.me/55${contact.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${f.user_name || ''}! Aqui é da equipe do Trampou. Recebemos sua mensagem sobre "${f.title || 'o app'}" e gostaríamos de te agradecer!`)}`
        : null;

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

          <div class="fb-card-user-info">
            <div class="fb-user-details">
              <span class="fb-user-name">${escapeHTML(f.user_name || 'Usuário')}</span>
              <span class="fb-user-loc"><i class="fa-solid fa-location-dot"></i> ${escapeHTML(f.city || 'Parauapebas')}, ${escapeHTML(f.state || 'PA')}</span>
            </div>
            ${whatsappLink ? `
              <a href="${whatsappLink}" target="_blank" class="fb-contact-btn" title="Conversar no WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> Responder
              </a>
            ` : (contact ? `<span style="font-size: 11px; color: #64748B;">${escapeHTML(contact)}</span>` : '')}
          </div>

          <div class="fb-card-footer">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: #64748B;">Status:</span>
              <select class="fb-status-select" onchange="window.AdminApp.updateFeedbackStatus('${f.id}', this.value)">
                <option value="pendente" ${f.status === 'pendente' ? 'selected' : ''}>⏳ Pendente</option>
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
    refreshFeedbacks: fetchFeedbacks,
    filterFeedbacks: renderFeedbacks,
    updateFeedbackStatus,
    deleteFeedback
  };

  // Dispara no carregamento da DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


// Configurações do Supabase
const SUPABASE_URL = 'https://txcmnqisfwekmhihdutt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y21ucWlzZndla21oaWhkdXR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMjQ3ODMsImV4cCI6MjEwNzkwMDc4M30.VF7amv-LqsCMw1pvGAU7_tesjjPxenVQMMHt8tk2P7E';
const OFFICIAL_APP_URL = 'https://trampou.jw.tec.br';

// Dados em memória de Profissionais (carregados em tempo real do Supabase ou cadastro local)
let PROFESSIONALS = [];

let userRequests = [];

// Conversas em memória
let conversations = [];

function loadStoredConversations() {
  try {
    const raw = localStorage.getItem('trampou_conversations');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        conversations = parsed.filter(c => c && c.clientName !== 'João da Silva' && c.id !== 'c1' && c.id !== 'c2');
      }
    }
  } catch (e) {
    conversations = [];
  }
}

function saveStoredConversations() {
  try {
    localStorage.setItem('trampou_conversations', JSON.stringify(conversations));
  } catch (e) {
    console.error('Erro ao salvar conversas', e);
  }
}

let activeChat = null;
let selectedBairro = 'Todos';

// ==========================================
// EXPANSÃO NACIONAL: ESTADO & GEOLOCALIZAÇÃO
// ==========================================
let currentActiveLocation = {
  city: localStorage.getItem('trampou_active_city') || 'Parauapebas',
  state: localStorage.getItem('trampou_active_state') || 'PA',
  lat: localStorage.getItem('trampou_active_lat') ? parseFloat(localStorage.getItem('trampou_active_lat')) : null,
  lng: localStorage.getItem('trampou_active_lng') ? parseFloat(localStorage.getItem('trampou_active_lng')) : null,
  isGps: localStorage.getItem('trampou_active_is_gps') === 'true'
};

// Geocodificação reversa rápida e gratuita (BigDataCloud com fallback Nominatim)
async function reverseGeocodeCoords(lat, lng) {
  try {
    const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`);
    if (bdcRes.ok) {
      const data = await bdcRes.json();
      const city = data.city || data.locality || data.principalSubdivision || 'Parauapebas';
      let state = 'PA';
      if (data.principalSubdivisionCode) {
        state = data.principalSubdivisionCode.replace('BR-', '');
      } else if (data.principalSubdivision) {
        state = data.principalSubdivision.substring(0, 2).toUpperCase();
      }
      return { city, state };
    }
  } catch (err) {
    console.warn('BigDataCloud geocode fallback:', err);
  }

  try {
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
      headers: { 'Accept-Language': 'pt-BR' }
    });
    if (osmRes.ok) {
      const data = await osmRes.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || 'Parauapebas';
      const state = addr['ISO3166-2-lvl4'] ? addr['ISO3166-2-lvl4'].replace('BR-', '') : (addr.state ? addr.state.substring(0, 2).toUpperCase() : 'PA');
      return { city, state };
    }
  } catch (err) {
    console.warn('OSM geocode fallback erro:', err);
  }

  return { city: 'Parauapebas', state: 'PA' };
}

// Cálculo geodésico de distância em km (Fórmula de Haversine)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lat1 === undefined || lon1 === null || lon1 === undefined ||
      lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined) {
    return null;
  }
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function updateLocationDisplay() {
  const el = document.getElementById('home-location-text');
  const icon = document.querySelector('#home-location .loc-icon');
  if (icon) {
    if (currentActiveLocation.isGps) {
      icon.className = 'fa-solid fa-location-crosshairs loc-icon';
      icon.title = 'Localização via GPS';
    } else {
      icon.className = 'fa-solid fa-location-dot loc-icon';
      icon.title = 'Localização definida';
    }
  }
  const cityLabel = `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
  if (el) {
    el.textContent = cityLabel;
  }
  const exploreCityTag = document.getElementById('explore-city-tag-text');
  if (exploreCityTag) {
    exploreCityTag.textContent = `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
  }
  const exploreSub = document.querySelector('#tab-search .explore-sub');
  if (exploreSub) {
    exploreSub.textContent = `Autônomos verificados em ${cityLabel}`;
  }
}

// Mapeamento das capitais e principais cidades de cada estado brasileiro
const STATE_DEFAULT_CITIES = {
  AC: ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira'],
  AL: ['Maceió', 'Arapiraca', 'Palmeira dos Índios'],
  AP: ['Macapá', 'Santana', 'Laranjal do Jari'],
  AM: ['Manaus', 'Parintins', 'Itacoatiara'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari'],
  CE: ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Sobral'],
  DF: ['Brasília', 'Ceilândia', 'Taguatinga', 'Samambaia'],
  ES: ['Vitória', 'Vila Velha', 'Serra', 'Cariacica'],
  GO: ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde'],
  MA: ['São Luís', 'Imperatriz', 'Caxias', 'Timon'],
  MT: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Sorriso'],
  MS: ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim'],
  PA: ['Parauapebas', 'Belém', 'Marabá', 'Ananindeua', 'Santarém', 'Canaã dos Carajás', 'Castanhal', 'Curionópolis', 'Eldorado do Carajás', 'Xinguara', 'Redenção', 'Tucuruí', 'Altamira', 'Itaituba', 'abaetetuba', 'Paragominas'],
  PB: ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos'],
  PR: ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel'],
  PE: ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina'],
  PI: ['Teresina', 'Parnaíba', 'Picos', 'Floriano'],
  RJ: ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói'],
  RN: ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante'],
  RS: ['Porto Alegre', 'Caxias do Sul', 'Canoas', 'Pelotas', 'Santa Maria'],
  RO: ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena'],
  RR: ['Boa Vista', 'Rorainópolis'],
  SC: ['Florianópolis', 'Joinville', 'Blumenau', 'São José', 'Chapecó'],
  SP: ['São Paulo', 'Campinas', 'Guarulhos', 'São Bernardo do Campo', 'Ribeirão Preto', 'Santos'],
  SE: ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana'],
  TO: ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional']
};

// Cache em memória de municípios do IBGE por UF para autocompletar qualquer cidade do Brasil
const ibgeCitiesCache = {};

async function fetchIbgeCitiesForState(uf) {
  const cleanUf = (uf || 'PA').toUpperCase();
  if (ibgeCitiesCache[cleanUf]) {
    populateCityDatalist(ibgeCitiesCache[cleanUf]);
    return ibgeCitiesCache[cleanUf];
  }
  const fallback = STATE_DEFAULT_CITIES[cleanUf] || [];
  populateCityDatalist(fallback);
  try {
    const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${cleanUf}/municipios?orderBy=nome`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const names = data.map(m => m.nome);
        // Coloca as principais cidades do estado no topo da lista
        const merged = [...new Set([...fallback, ...names])];
        ibgeCitiesCache[cleanUf] = merged;
        populateCityDatalist(merged);
        return merged;
      }
    }
  } catch (err) {
    // Usa fallback local silenciosamente
  }
  return fallback;
}

function populateCityDatalist(cities) {
  let datalist = document.getElementById('city-picker-datalist');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'city-picker-datalist';
    document.body.appendChild(datalist);
  }
  datalist.innerHTML = (cities || []).map(c => `<option value="${c}">`).join('');
}

function handleFormStateChange(uf, cityInputId) {
  const cleanUf = (uf || 'PA').toUpperCase();
  fetchIbgeCitiesForState(cleanUf);
  const cityInput = document.getElementById(cityInputId);
  if (cityInput) {
    const defaults = STATE_DEFAULT_CITIES[cleanUf] || [];
    cityInput.placeholder = defaults[0] ? `Ex: ${defaults[0]}` : 'Digite o nome da sua cidade';
  }
}

// Busca automática de Cidade e UF pelo CEP (ViaCEP)
let cepLookupAbortController = null;
async function handleCepLookup(rawValue, target) {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 8);
  const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;

  const inputMap = {
    'picker': { cepId: 'picker-cep-input', stateId: 'picker-manual-uf', cityId: 'picker-manual-city', statusId: 'picker-cep-status' },
    'client': { cepId: 'client-cep', stateId: 'client-state', cityId: 'client-city', statusId: 'client-location-status' },
    'pro': { cepId: 'pro-cep', stateId: 'pro-state', cityId: 'pro-city', statusId: 'pro-location-status' },
    'edit-pro': { cepId: 'edit-pro-cep', stateId: 'edit-pro-state', cityId: 'edit-pro-city', statusId: 'edit-pro-location-status' },
    'edit-profile': { cepId: 'edit-profile-cep', stateId: 'edit-profile-state', cityId: 'edit-profile-city', statusId: 'edit-profile-location-status' }
  };

  const cfg = inputMap[target];
  if (!cfg) return;

  const cepInput = document.getElementById(cfg.cepId);
  if (cepInput && cepInput.value !== formatted) {
    cepInput.value = formatted;
  }

  const statusEl = document.getElementById(cfg.statusId);
  if (digits.length < 8) {
    if (statusEl) statusEl.style.display = 'none';
    return;
  }

  if (statusEl) {
    statusEl.style.display = 'flex';
    statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Buscando cidade pelo CEP ${formatted}...`;
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) throw new Error('Falha ao consultar CEP');
    const data = await res.json();

    if (data.erro || !data.localidade) {
      if (statusEl) {
        statusEl.style.display = 'flex';
        statusEl.innerHTML = `<span style="color: #DC2626;"><i class="fa-solid fa-circle-exclamation"></i> CEP não encontrado. Digite o nome da cidade abaixo.</span>`;
      }
      return;
    }

    const city = data.localidade;
    const state = (data.uf || 'PA').toUpperCase();
    const stateEl = document.getElementById(cfg.stateId);
    const cityEl = document.getElementById(cfg.cityId);

    if (stateEl) stateEl.value = state;
    if (cityEl) cityEl.value = city;
    fetchIbgeCitiesForState(state);

    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.innerHTML = `<span style="color: #059669; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> Cidade identificada: ${city}, ${state}</span>`;
    }

    if (target === 'picker') {
      setActiveLocation(city, state, null, null, false);
      setTimeout(() => {
        closeLocationPickerModal();
        showToast(`📍 Cidade alterada para ${city}, ${state} (CEP ${formatted})`);
      }, 450);
    } else {
      showToast(`📍 Cidade preenchida pelo CEP: ${city}, ${state}`);
    }
  } catch (err) {
    if (statusEl) {
      statusEl.style.display = 'flex';
      statusEl.innerHTML = `<span style="color: #D97706;"><i class="fa-solid fa-circle-info"></i> Não foi possível consultar o CEP agora. Digite o nome da cidade abaixo.</span>`;
    }
  }
}

function handleStateSelectChange(uf) {
  const cityInput = document.getElementById('picker-manual-city') || document.getElementById('user-city-input');
  const cities = STATE_DEFAULT_CITIES[uf] || [];

  fetchIbgeCitiesForState(uf);

  if (cityInput) {
    cityInput.setAttribute('list', 'city-picker-datalist');
    cityInput.placeholder = cities[0] ? `Digite a cidade (ex: ${cities[0]})...` : 'Digite o nome da cidade...';
    cityInput.value = '';
    cityInput.focus();
  }

  // Atualiza os chips de cidades populares abaixo
  updatePopularCitiesChips(uf);
}

function getAvailableProCities() {
  const map = new Map();
  (PROFESSIONALS || []).forEach(p => {
    const c = (p.city || 'Parauapebas').trim();
    const s = (p.state || 'PA').trim().toUpperCase();
    const key = `${c.toLowerCase()}_${s}`;
    if (!map.has(key)) {
      map.set(key, { city: c, state: s, count: 1 });
    } else {
      map.get(key).count += 1;
    }
  });
  return Array.from(map.values());
}

function updatePopularCitiesChips(uf) {
  const chipsContainer = document.getElementById('popular-cities-chips');
  if (!chipsContainer) return;

  const currentUf = uf || currentActiveLocation.state || 'PA';
  const stateCities = STATE_DEFAULT_CITIES[currentUf] || [];
  const activeProCities = getAvailableProCities();

  const nationalHighlights = [
    { city: 'Parauapebas', state: 'PA' },
    { city: 'Belém', state: 'PA' },
    { city: 'Marabá', state: 'PA' },
    { city: 'São Paulo', state: 'SP' },
    { city: 'Rio de Janeiro', state: 'RJ' },
    { city: 'Belo Horizonte', state: 'MG' },
    { city: 'Brasília', state: 'DF' },
    { city: 'Goiânia', state: 'GO' }
  ];

  const renderedList = [];

  // 1. Cidades que já possuem profissionais cadastrados na plataforma vêm primeiro!
  activeProCities.forEach(ac => {
    if (!renderedList.some(r => r.city.toLowerCase() === ac.city.toLowerCase() && r.state === ac.state)) {
      renderedList.push({ city: ac.city, state: ac.state, count: ac.count });
    }
  });

  // 2. Cidades do estado selecionado
  stateCities.forEach(c => {
    if (!renderedList.some(r => r.city.toLowerCase() === c.toLowerCase() && r.state === currentUf)) {
      renderedList.push({ city: c, state: currentUf, count: 0 });
    }
  });

  // 3. Principais nacionais
  nationalHighlights.forEach(h => {
    if (!renderedList.some(r => r.city.toLowerCase() === h.city.toLowerCase() && r.state === h.state)) {
      renderedList.push({ city: h.city, state: h.state, count: 0 });
    }
  });

  chipsContainer.innerHTML = renderedList.slice(0, 12).map(item => {
    const isActive = (item.city.toLowerCase() === currentActiveLocation.city.toLowerCase() && item.state === currentActiveLocation.state);
    const badge = item.count > 0 ? ` <small style="opacity:0.85; font-weight:700;">(${item.count})</small>` : '';
    return `
      <button type="button" class="loc-chip ${isActive ? 'active' : ''}" onclick="selectCityOption('${item.city}', '${item.state}')">
        ${item.city}, ${item.state}${badge}
      </button>
    `;
  }).join('');
}

function initLocationManager() {
  updateLocationDisplay();
  fetchIbgeCitiesForState(currentActiveLocation.state || 'PA');
}

function setActiveLocation(city, state, lat = null, lng = null, isGps = false) {
  currentActiveLocation.city = city || 'Parauapebas';
  currentActiveLocation.state = state || 'PA';
  currentActiveLocation.lat = lat;
  currentActiveLocation.lng = lng;
  currentActiveLocation.isGps = !!isGps;

  localStorage.setItem('trampou_active_city', currentActiveLocation.city);
  localStorage.setItem('trampou_active_state', currentActiveLocation.state);
  if (lat && lng) {
    localStorage.setItem('trampou_active_lat', lat.toString());
    localStorage.setItem('trampou_active_lng', lng.toString());
  } else {
    localStorage.removeItem('trampou_active_lat');
    localStorage.removeItem('trampou_active_lng');
  }
  localStorage.setItem('trampou_active_is_gps', isGps ? 'true' : 'false');

  updateLocationDisplay();

  // Re-renderiza vitrine e busca com a nova cidade ativa e sincroniza com o banco em tempo real
  if (typeof renderRecommendedProfessionals === 'function') renderRecommendedProfessionals();
  if (typeof renderSearchResults === 'function') renderSearchResults();
  if (typeof loadProfessionalsFromSupabase === 'function') loadProfessionalsFromSupabase();
}

function openLocationPickerModal() {
  const modal = document.getElementById('modal-location-picker');
  if (modal) {
    modal.classList.add('active');
    const uState = document.getElementById('picker-manual-uf') || document.getElementById('user-state-select');
    const uCity = document.getElementById('picker-manual-city') || document.getElementById('user-city-input');
    const cepInp = document.getElementById('picker-cep-input');
    const cepStatus = document.getElementById('picker-cep-status');
    if (cepInp) cepInp.value = '';
    if (cepStatus) cepStatus.style.display = 'none';
    if (uState && currentActiveLocation.state) uState.value = currentActiveLocation.state;
    if (uCity && currentActiveLocation.city) uCity.value = currentActiveLocation.city;
    fetchIbgeCitiesForState(currentActiveLocation.state || 'PA');
    updatePopularCitiesChips(currentActiveLocation.state);
  }
}

function closeLocationPickerModal() {
  const modal = document.getElementById('modal-location-picker');
  if (modal) modal.classList.remove('active');
}

function selectCityOption(city, state) {
  setActiveLocation(city, state, null, null, false);
  closeLocationPickerModal();
  showToast(`📍 Cidade alterada para ${city}, ${state}`);
}

function applyManualCityChoice() {
  const stateSelect = document.getElementById('picker-manual-uf') || document.getElementById('user-state-select');
  const cityInput = document.getElementById('picker-manual-city') || document.getElementById('user-city-input');
  let state = stateSelect ? stateSelect.value : (currentActiveLocation.state || 'PA');
  let rawCity = cityInput && cityInput.value.trim() ? cityInput.value.trim() : '';

  // Se o usuário digitou um CEP no campo de cidade, faz lookup automático
  const cepDigits = rawCity.replace(/\D/g, '');
  if (cepDigits.length === 8) {
    handleCepLookup(cepDigits, 'picker');
    return;
  }

  // Se o usuário digitou "Cidade, UF" ou "Cidade - UF"
  if (rawCity.includes(',') || rawCity.includes('-')) {
    const parts = rawCity.split(/[,-]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2 && parts[parts.length - 1].length === 2) {
      rawCity = parts[0];
      state = parts[parts.length - 1].toUpperCase();
    }
  } else if (rawCity) {
    // Verifica se a cidade digitada pertence a outro estado conhecido
    const normTyped = rawCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const currentStateCities = (STATE_DEFAULT_CITIES[state] || []).map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    if (!currentStateCities.includes(normTyped)) {
      for (const [ufKey, list] of Object.entries(STATE_DEFAULT_CITIES)) {
        const match = list.find(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normTyped);
        if (match) {
          rawCity = match;
          state = ufKey;
          break;
        }
      }
    }
  }

  const city = rawCity || (STATE_DEFAULT_CITIES[state] ? STATE_DEFAULT_CITIES[state][0] : 'Parauapebas');

  setActiveLocation(city, state, null, null, false);
  closeLocationPickerModal();
  showToast(`📍 Visualizando profissionais de ${city}, ${state}`);
}

async function detectUserLocationGPS() {
  const statusEl = document.getElementById('gps-detect-status');
  if (!navigator.geolocation) {
    if (statusEl) statusEl.textContent = 'Geolocalização não é suportada pelo seu navegador.';
    return;
  }

  if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Conectando ao GPS do aparelho...';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Identificando cidade...';

      const geo = await reverseGeocodeCoords(lat, lng);
      setActiveLocation(geo.city, geo.state, lat, lng, true);

      if (statusEl) statusEl.innerHTML = `<span style="color: #10B981;"><i class="fa-solid fa-check"></i> Você está em ${geo.city}, ${geo.state}</span>`;

      setTimeout(() => {
        closeLocationPickerModal();
        showToast(`📍 GPS Conectado: ${geo.city}, ${geo.state}`);
      }, 700);
    },
    (err) => {
      console.warn('Erro GPS:', err);
      if (statusEl) {
        statusEl.innerHTML = '<span style="color: #EF4444;"><i class="fa-solid fa-triangle-exclamation"></i> GPS não disponível. Selecione sua cidade manualmente abaixo.</span>';
      }
      showToast('Permissão de GPS indisponível.');
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

// Detecção no formulário de cadastro de cliente
async function detectClientLocationGPS() {
  if (!navigator.geolocation) {
    showToast('Geolocalização não suportada.');
    return;
  }
  showToast('Obtendo sua localização pelo GPS...');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const geo = await reverseGeocodeCoords(lat, lng);

    const stateEl = document.getElementById('client-state');
    const cityEl = document.getElementById('client-city');
    const latEl = document.getElementById('client-lat');
    const lngEl = document.getElementById('client-lng');

    if (stateEl) stateEl.value = geo.state;
    if (cityEl) cityEl.value = geo.city;
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;

    showToast(`📍 Localização definida: ${geo.city}, ${geo.state}`);
  }, () => {
    showToast('Não foi possível obter localização via GPS.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// Detecção no formulário de cadastro do profissional (wizard etapa 2)
async function detectProLocationGPS() {
  if (!navigator.geolocation) {
    showToast('Geolocalização não suportada.');
    return;
  }
  showToast('Obtendo base profissional pelo GPS...');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const geo = await reverseGeocodeCoords(lat, lng);

    const stateEl = document.getElementById('pro-state');
    const cityEl = document.getElementById('pro-city');
    const latEl = document.getElementById('pro-lat');
    const lngEl = document.getElementById('pro-lng');

    if (stateEl) stateEl.value = geo.state;
    if (cityEl) cityEl.value = geo.city;
    if (latEl) latEl.value = lat;
    if (lngEl) lngEl.value = lng;

    showToast(`📍 Base profissional definida: ${geo.city}, ${geo.state}`);
  }, () => {
    showToast('Não foi possível obter localização via GPS.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

// Detecção no modal de edição do perfil profissional
async function detectEditProLocationGPS() {
  if (!navigator.geolocation) {
    showToast('Geolocalização não suportada.');
    return;
  }
  showToast('Obtendo sua cidade pelo GPS...');
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const geo = await reverseGeocodeCoords(lat, lng);

    const stateEl = document.getElementById('edit-pro-state');
    const cityEl = document.getElementById('edit-pro-city');
    if (stateEl) stateEl.value = geo.state;
    if (cityEl) cityEl.value = geo.city;
    fetchIbgeCitiesForState(geo.state);
    showToast(`📍 Cidade preenchida pelo GPS: ${geo.city}, ${geo.state}`);
  }, () => {
    showToast('Não foi possível obter localização via GPS.');
  }, { enableHighAccuracy: true, timeout: 10000 });
}

window.handleCepLookup = handleCepLookup;
window.handleFormStateChange = handleFormStateChange;
window.detectEditProLocationGPS = detectEditProLocationGPS;

// Função utilitária para filtrar e calcular distâncias
function filterAndSortProsByLocation(prosList) {
  function norm(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  const activeCityNorm = norm(currentActiveLocation.city);
  const userLat = currentActiveLocation.lat;
  const userLng = currentActiveLocation.lng;

  // Filtra por cidade de atuação
  const filtered = (prosList || []).filter(p => {
    const pCityNorm = norm(p.city || 'Parauapebas');
    const serviceCities = (p.serviceCities || []).map(norm);
    const pNeighNorm = norm(p.neighborhood || '');

    return (pCityNorm === activeCityNorm) ||
           serviceCities.includes(activeCityNorm) ||
           pNeighNorm.includes(activeCityNorm);
  });

  // Calcula distância se houver coordenadas ativas
  filtered.forEach(p => {
    if (userLat !== null && userLng !== null && p.latitude && p.longitude) {
      p._distanceKm = calculateDistanceKm(userLat, userLng, p.latitude, p.longitude);
    } else {
      p._distanceKm = null;
    }
  });

  // Ordena prioritariamente os profissionais mais recentemente criados na cidade (com desempate por proximidade se GPS ativo)
  filtered.sort((a, b) => {
    if (currentActiveLocation.isGps && userLat !== null && userLng !== null && a._distanceKm !== null && b._distanceKm !== null) {
      const diff = a._distanceKm - b._distanceKm;
      if (Math.abs(diff) > 0.5) return diff; // Se a diferença de distância for significativa (>500m)
    }
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return filtered;
}

// ==========================================
// PWA (PROGRESSIVE WEB APP) SERVICE WORKER & INSTALL
// ==========================================
let deferredInstallPrompt = null;

function isPWAInstalled() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

function updatePWAInstallVisibility() {
  const installed = isPWAInstalled();
  const installBtns = document.querySelectorAll('.btn-pwa-install');
  const installCard = document.getElementById('pwa-install-banner');

  if (installed) {
    installBtns.forEach(btn => btn.style.display = 'none');
    if (installCard) installCard.style.display = 'none';
  }
}

function initPWA() {
  updatePWAInstallVisibility();

  if (window.matchMedia) {
    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    if (standaloneMedia.addEventListener) {
      standaloneMedia.addEventListener('change', updatePWAInstallVisibility);
    }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('✅ Trampou PWA Service Worker registrado:', reg.scope);
        })
        .catch((err) => {
          console.warn('⚠️ Erro ao registrar Service Worker:', err);
        });
    });
  }

  // Captura evento de instalação nativa do navegador
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('📱 PWA pronto para instalação!');
    if (isPWAInstalled()) return;

    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.style.display = 'inline-flex');

    const installCard = document.getElementById('pwa-install-banner');
    if (installCard) installCard.style.display = 'flex';
  });

  window.addEventListener('appinstalled', () => {
    console.log('🎉 Trampou PWA instalado com sucesso!');
    deferredInstallPrompt = null;
    updatePWAInstallVisibility();
    const installBtns = document.querySelectorAll('.btn-pwa-install');
    installBtns.forEach(btn => btn.style.display = 'none');
    const installCard = document.getElementById('pwa-install-banner');
    if (installCard) installCard.style.display = 'none';
    showToast('Trampou instalado com sucesso!');
  });
}

function triggerPWAInstall() {
  if (isPWAInstalled()) {
    showToast('O aplicativo Trampou já está instalado no seu aparelho! 🎉');
    return;
  }

  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
      } else {
        console.log('Usuário recusou a instalação do PWA');
      }
      deferredInstallPrompt = null;
    });
  } else {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent || '') ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) {
      showToast('No iPhone/iPad: toque no botão Compartilhar do Safari e selecione "Adicionar à Tela de Início" 📲');
    } else {
      showToast('Para instalar: no menu do navegador selecione "Adicionar à Tela de Início" ou "Instalar Aplicativo" 📲');
    }
  }
}
window.triggerPWAInstall = triggerPWAInstall;
window.isPWAInstalled = isPWAInstalled;

// Roteador de atalhos do PWA (shortcuts do manifest.json) e links compartilhados (#explore, #sos, #showcase, #pro/...)
function handlePWADeepLinks() {
  const rawHash = (window.location.hash || '').replace(/^#\/?/, '').trim();
  if (!rawHash) return;

  const lowerHash = rawHash.toLowerCase();

  if (lowerHash === 'explore' || lowerHash === 'search') {
    if (typeof switchTab === 'function') switchTab('search');
  } else if (lowerHash === 'sos') {
    if (typeof openSOSRequestModal === 'function') openSOSRequestModal();
  } else if (lowerHash === 'showcase') {
    if (typeof switchTab === 'function') switchTab('search');
    setTimeout(() => {
      const showcaseEl = document.getElementById('showcase-container');
      if (showcaseEl) showcaseEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  } else if (lowerHash.startsWith('pro/')) {
    const proSlug = rawHash.slice(4).trim().toLowerCase();
    if (!proSlug) return;
    const matchPro = (PROFESSIONALS || []).find(p =>
      (p.id && p.id.toLowerCase() === proSlug) ||
      (p.handle && p.handle.toLowerCase() === proSlug) ||
      (p.name && p.name.toLowerCase().replace(/\s+/g, '.') === proSlug)
    );
    if (matchPro && typeof openProDetail === 'function') {
      openProDetail(matchPro.id);
    }
  }
}
window.handlePWADeepLinks = handlePWADeepLinks;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initPWA();
  initLocationManager();
  loadStoredConversations();
  loadProfessionalsFromStorage();
  initAuthManager();
  renderAdBannerCarousel();
  fetchCategories();
  loadProfessionalsFromSupabase().then(() => {
    if ((window.location.hash || '').toLowerCase().includes('pro/')) {
      handlePWADeepLinks();
    }
  });
  initRealtimeDatabaseSync();
  renderRecommendedProfessionals();
  renderNewsFeed();
  renderConversations();
  renderShowcase();
  renderTroublePills();
  updatePriceThermometer();
  renderExploreCategoryChips();
  renderSearchResults();
  setupEvents();
  checkFirstTimeOnboarding();
  initLgpdConsent();
  handlePWADeepLinks();
  window.addEventListener('hashchange', handlePWADeepLinks);
});

// Renderiza Carrossel de Anúncios antes das categorias (Integrado com Supabase + Painel Admin)
async function renderAdBannerCarousel() {
  const track = document.getElementById('home-banner-track');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!track) return;

  // Banners padrão de exibição imediata
  const defaultBanners = [
    {
      id: 'default-share',
      image_url: 'banner-share-trampou.webp',
      image_url_fallback: 'banner-share-trampou.png',
      badge_text: 'Compartilhe o Trampou',
      title: 'Indique o Trampou para amigos e vizinhos!',
      description: 'Ajude a valorizar os profissionais autônomos da nossa cidade. Compartilhe no WhatsApp!',
      cta_text: 'Compartilhar App',
      cta_link: 'share',
      theme: 'purple-viral'
    },
    {
      id: 'default-pwa',
      image_url: 'banner-home-2.webp',
      image_url_fallback: 'banner-home-2.jpg',
      badge_text: 'APP LEVE & RÁPIDO',
      title: 'O Trampou não consome o seu espaço!',
      description: 'O app é leve, otimizado e não ocupa armazenamento no seu celular. Mais praticidade para o seu dia a dia!',
      cta_text: 'Instalar App',
      cta_link: 'pwa',
      theme: 'amber-deal'
    }
  ];

  // Renderizador de HTML de um banner
  function buildBannerHtml(banner, index) {
    // Se o banner possuir imagem dedicada (1080x432 px / 2.5:1)
    if (banner.image_url) {
      const isWebp = banner.image_url.endsWith('.webp');
      const fallbackUrl = banner.image_url_fallback || (isWebp ? banner.image_url.replace('.webp', '.jpg').replace('.webp', '.png') : banner.image_url);
      return `
        <div class="ad-slide-card ad-slide-img-card" data-slide-index="${index}" data-banner-id="${banner.id || ''}" role="banner" style="cursor: pointer;">
          <picture>
            ${isWebp ? `<source srcset="${banner.image_url}" type="image/webp">` : ''}
            <img src="${fallbackUrl}" alt="${escapeHTML(banner.title || 'Banner Trampou')}" loading="${index === 0 ? 'eager' : 'lazy'}">
          </picture>
        </div>
      `;
    }

    const themeClass = banner.theme ? `theme-${banner.theme.replace('theme-', '')}` : 'theme-purple-viral';
    const badgeText = banner.badge_text || 'Destaque';
    const isShare = (banner.cta_link || '').toLowerCase().includes('share');
    const ctaIcon = isShare ? '<i class="fa-brands fa-whatsapp" style="color: #16A34A; font-size: 14px; margin-right: 4px;"></i>' : '<i class="fa-solid fa-arrow-right" style="margin-left: 4px;"></i>';

    return `
      <div class="ad-slide-card ${themeClass}" data-slide-index="${index}" data-banner-id="${banner.id || ''}" role="banner" style="cursor: pointer;">
        <div class="slide-body">
          <span class="badge-anuncio" style="background: rgba(255, 255, 255, 0.2); color: #FFFFFF; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.3);">
            <i class="fa-solid ${isShare ? 'fa-heart' : 'fa-bullhorn'}" style="color: #FDA4AF; margin-right: 4px;"></i> ${escapeHTML(badgeText)}
          </span>
          <div class="slide-content">
            <h5 style="color: #FFFFFF; font-size: 15px; font-weight: 800; line-height: 1.3; margin: 4px 0 2px;">${escapeHTML(banner.title)}</h5>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 11.5px; line-height: 1.35; margin-bottom: 8px;">${escapeHTML(banner.description || '')}</p>
          </div>
          <button class="btn-slide-cta" type="button" style="background: #FFFFFF; color: #1E1B4B; font-weight: 800; box-shadow: 0 4px 12px rgba(0,0,0,0.18);">
            ${isShare ? ctaIcon : ''} ${escapeHTML(banner.cta_text || 'Conhecer')} ${!isShare ? ctaIcon : '<i class="fa-solid fa-share-nodes" style="margin-left: 4px;"></i>'}
          </button>
        </div>
        <div class="slide-art" aria-hidden="true" style="opacity: 0.28; font-size: 80px; right: 12px; bottom: 8px; color: #FFFFFF;">
          <i class="fa-solid ${isShare ? 'fa-share-nodes' : 'fa-rectangle-ad'}"></i>
        </div>
      </div>
    `;
  }

  function handleBannerClick(banner) {
    const link = (banner.cta_link || '').trim();
    if (!link || link === 'share' || link === '#share') {
      if (typeof openShareAppModal === 'function') {
        openShareAppModal();
      } else if (navigator.share) {
        navigator.share({
          title: 'Trampou — Profissionais Perto de Você',
          text: 'Conheça o Trampou: encontre eletricistas, encanadores, pintores e diaristas de confiança em Parauapebas!',
          url: OFFICIAL_APP_URL
        }).catch(() => {});
      }
    } else if (link === 'pwa' || link === '#pwa' || link === 'install') {
      if (typeof triggerPWAInstall === 'function') {
        triggerPWAInstall();
      }
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }

  let currentBannerIdx = 0;
  window.goToBannerSlide = function(idx) {
    if (!track) return;
    const slides = track.querySelectorAll('.ad-slide-card');
    if (!slides.length) return;
    currentBannerIdx = ((idx % slides.length) + slides.length) % slides.length;
    const targetSlide = slides[currentBannerIdx];
    if (targetSlide) {
      track.scrollTo({ left: targetSlide.offsetLeft, behavior: 'smooth' });
    }
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.carousel-dot').forEach((d, i) => {
        d.classList.toggle('active', i === currentBannerIdx);
      });
    }
  };

  function startBannerAutoPlay(totalSlides) {
    if (window._bannerCarouselInterval) clearInterval(window._bannerCarouselInterval);
    if (totalSlides <= 1) return;

    window._bannerCarouselInterval = setInterval(() => {
      const slides = track.querySelectorAll('.ad-slide-card');
      if (slides.length <= 1) return;
      currentBannerIdx = (currentBannerIdx + 1) % slides.length;
      goToBannerSlide(currentBannerIdx);
    }, 3000); // Rotação a cada 3 segundos
  }

  function applyBanners(bannersList) {
    if (!bannersList || bannersList.length === 0) {
      bannersList = defaultBanners;
    }

    track.innerHTML = bannersList.map((b, idx) => buildBannerHtml(b, idx)).join('');

    // Adiciona listener de clique em cada card
    const cards = track.querySelectorAll('.ad-slide-card');
    cards.forEach((card, idx) => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        handleBannerClick(bannersList[idx]);
      });
    });

    // Configuração dos pontinhos (dots) se houver mais de 1 banner
    if (dotsContainer) {
      if (bannersList.length > 1) {
        dotsContainer.style.display = 'flex';
        dotsContainer.innerHTML = bannersList.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" data-dot-index="${i}" onclick="goToBannerSlide(${i})"></span>`).join('');

        track.onscroll = () => {
          const scrollLeft = track.scrollLeft;
          const slides = track.querySelectorAll('.ad-slide-card');
          slides.forEach((slide, i) => {
            if (Math.abs(slide.offsetLeft - scrollLeft) < 40) {
              currentBannerIdx = i;
              dotsContainer.querySelectorAll('.carousel-dot').forEach((d, idx) => {
                d.classList.toggle('active', idx === i);
              });
            }
          });
        };

        // Pausa ao interagir (touch ou hover) e retoma após soltar
        track.onmouseenter = () => { if (window._bannerCarouselInterval) clearInterval(window._bannerCarouselInterval); };
        track.onmouseleave = () => { startBannerAutoPlay(bannersList.length); };
        track.ontouchstart = () => { if (window._bannerCarouselInterval) clearInterval(window._bannerCarouselInterval); };
        track.ontouchend = () => { startBannerAutoPlay(bannersList.length); };

        // Inicia a rotação automática a cada 3 segundos
        startBannerAutoPlay(bannersList.length);

      } else {
        dotsContainer.style.display = 'none';
        if (window._bannerCarouselInterval) clearInterval(window._bannerCarouselInterval);
      }
    }
  }

  // Renderização inicial rápida com fallback
  applyBanners(defaultBanners);

  // Busca banners ativos em tempo real do Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/banners?active=eq.true&order=sort_order.asc,created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const dbBanners = await res.json();
      if (Array.isArray(dbBanners) && dbBanners.length > 0) {
        applyBanners(dbBanners);
      }
    }
  } catch (err) {
    console.warn('Usando banners padrão locais:', err);
  }
}

// Busca Categorias do Supabase (Compacta)
async function fetchCategories() {
  const container = document.getElementById('categories-container');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,name,slug,icon_name&active=eq.true&order=name.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (res.ok) {
      const categories = await res.json();
      if (categories && categories.length > 0) {
        renderCategories(categories.slice(0, 10));
        return;
      }
    }
  } catch (err) {
    console.warn('Usando categorias locais:', err);
  }

  // Fallback com categorias padrão + novas categorias criadas por profissionais
  const baseCats = [
    { name: 'Ar-Condicionado', icon_name: 'Wind' },
    { name: 'Eletricista', icon_name: 'Zap' },
    { name: 'Encanador', icon_name: 'Droplets' },
    { name: 'Pedreiro', icon_name: 'Home' },
    { name: 'Pintor', icon_name: 'Paintbrush' },
    { name: 'Diarista', icon_name: 'Sparkles' },
    { name: 'Mecânico', icon_name: 'Wrench' },
    { name: 'Informática', icon_name: 'Laptop' }
  ];
  const customList = (typeof getCustomCategories === 'function' ? getCustomCategories() : []).map(cat => ({
    name: cat,
    icon_name: 'Hammer'
  }));

  renderCategories([...baseCats, ...customList]);
}

function getIconClass(slugOrIcon, slug = '', name = '') {
  const map = {
    // Supabase DB icons
    'Wind': 'fa-snowflake',
    'Zap': 'fa-bolt',
    'Droplets': 'fa-faucet-drip',
    'Truck': 'fa-truck',
    'Scissors': 'fa-scissors',
    'Wrench': 'fa-wrench',
    'Home': 'fa-trowel-bricks',
    'Paintbrush': 'fa-paint-roller',
    'Laptop': 'fa-laptop',
    'Sparkles': 'fa-broom',
    'TreePine': 'fa-tree',
    'Hammer': 'fa-hammer',
    'Shovel': 'fa-seedling',
    'yard': 'fa-seedling',
    'Box': 'fa-couch',
    'Boxes': 'fa-boxes-stacked',
    // Slugs / Tags
    'jardinagem': 'fa-seedling',
    'marceneiro': 'fa-couch',
    'marcenaria': 'fa-couch',
    'diarista': 'fa-broom',
    'eletricista': 'fa-bolt',
    'encanador': 'fa-faucet-drip',
    'fretes': 'fa-truck',
    'mecanico': 'fa-wrench',
    'pedreiro': 'fa-hammer',
    'pintor': 'fa-paint-roller',
    'ar-condicionado': 'fa-snowflake',
    'informatica': 'fa-laptop',
    'beleza-estetica': 'fa-scissors',
    // Legacy / Material map
    'ac_unit': 'fa-snowflake',
    'bolt': 'fa-bolt',
    'plumbing': 'fa-faucet-drip',
    'construction': 'fa-trowel-bricks',
    'format_paint': 'fa-paint-roller',
    'cleaning_services': 'fa-broom',
    'build': 'fa-wrench',
    'computer': 'fa-laptop',
    'local_shipping': 'fa-truck',
    'handyman': 'fa-hammer'
  };

  if (slugOrIcon && map[slugOrIcon]) return map[slugOrIcon];
  if (slug && map[slug]) return map[slug];

  // Identificação inteligente por palavras-chave no nome da categoria
  const lowerName = String(name || slugOrIcon || '').toLowerCase();
  if (lowerName.includes('jardim') || lowerName.includes('lote') || lowerName.includes('planta') || lowerName.includes('poda')) return 'fa-seedling';
  if (lowerName.includes('marcen') || lowerName.includes('móve') || lowerName.includes('move')) return 'fa-couch';
  if (lowerName.includes('faxina') || lowerName.includes('diarista') || lowerName.includes('limpeza')) return 'fa-broom';
  if (lowerName.includes('eletric')) return 'fa-bolt';
  if (lowerName.includes('encanad') || lowerName.includes('hidrául') || lowerName.includes('hidraul')) return 'fa-faucet-drip';
  if (lowerName.includes('ar-cond') || lowerName.includes('refrig')) return 'fa-snowflake';
  if (lowerName.includes('manicure') || lowerName.includes('cabelo') || lowerName.includes('estét') || lowerName.includes('estet') || lowerName.includes('beleza')) return 'fa-scissors';
  if (lowerName.includes('frete') || lowerName.includes('carreto') || lowerName.includes('mudan')) return 'fa-truck';
  if (lowerName.includes('mecan') || lowerName.includes('mecân') || lowerName.includes('auto')) return 'fa-wrench';
  if (lowerName.includes('pedreir') || lowerName.includes('reforma') || lowerName.includes('obra')) return 'fa-hammer';
  if (lowerName.includes('pint')) return 'fa-paint-roller';
  if (lowerName.includes('informát') || lowerName.includes('comput') || lowerName.includes('celular') || lowerName.includes('rede')) return 'fa-laptop';

  // Se já for uma classe fa- válida, usa diretamente
  if (typeof slugOrIcon === 'string' && slugOrIcon.startsWith('fa-')) {
    return slugOrIcon;
  }

  return 'fa-screwdriver-wrench';
}

// Tom visual (fundo suave) por tipo de categoria — harmonioso com a identidade visual
function getCategoryTone(iconName, name = '') {
  const lowerName = String(name || '').toLowerCase();
  if (lowerName.includes('jardim') || lowerName.includes('lote') || iconName === 'Shovel' || iconName === 'yard' || iconName === 'TreePine') return 'tone-green';
  if (lowerName.includes('marcen') || lowerName.includes('móve') || lowerName.includes('move') || iconName === 'Box') return 'tone-amber';
  if (lowerName.includes('manicure') || lowerName.includes('cabelo') || lowerName.includes('estét') || lowerName.includes('estet') || iconName === 'Scissors') return 'tone-rose';
  if (lowerName.includes('ar-cond') || iconName === 'Wind') return 'tone-blue';
  if (lowerName.includes('encanad') || iconName === 'Droplets') return 'tone-blue';
  if (lowerName.includes('eletric') || iconName === 'Zap') return 'tone-amber';
  if (lowerName.includes('frete') || iconName === 'Truck') return 'tone-amber';
  if (lowerName.includes('faxina') || lowerName.includes('diarista') || iconName === 'Sparkles') return 'tone-green';
  if (lowerName.includes('pedreir') || lowerName.includes('reforma') || iconName === 'Hammer' || iconName === 'Home') return 'tone-lavender';
  if (lowerName.includes('mecan') || iconName === 'Wrench') return 'tone-slate';
  if (lowerName.includes('pint') || iconName === 'Paintbrush') return 'tone-rose';
  if (lowerName.includes('informát') || iconName === 'Laptop') return 'tone-lavender';

  const byIcon = {
    'Wind': 'tone-blue',
    'Zap': 'tone-amber',
    'Droplets': 'tone-blue',
    'Truck': 'tone-amber',
    'Scissors': 'tone-rose',
    'Wrench': 'tone-slate',
    'Home': 'tone-slate',
    'Paintbrush': 'tone-rose',
    'Laptop': 'tone-lavender',
    'Sparkles': 'tone-green',
    'TreePine': 'tone-green',
    'Shovel': 'tone-green',
    'yard': 'tone-green',
    'Box': 'tone-amber',
    'Hammer': 'tone-lavender',
    'ac_unit': 'tone-blue',
    'bolt': 'tone-amber',
    'plumbing': 'tone-blue',
    'construction': 'tone-slate',
    'format_paint': 'tone-rose',
    'cleaning_services': 'tone-green',
    'build': 'tone-slate',
    'computer': 'tone-lavender',
    'local_shipping': 'tone-amber',
    'handyman': 'tone-lavender'
  };
  if (byIcon[iconName]) return byIcon[iconName];
  const tones = ['tone-lavender', 'tone-blue', 'tone-green', 'tone-amber', 'tone-slate', 'tone-rose'];
  const hash = String(name).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return tones[hash % tones.length];
}

function renderCategories(list) {
  const container = document.getElementById('categories-container');
  if (!container) return;
  container.removeAttribute('aria-busy');

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="state-block">
        <div class="state-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></div>
        <h6>Nenhuma categoria disponível</h6>
        <p>Assim que novas categorias forem cadastradas, elas aparecerão aqui.</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(c => `
    <div class="cat-item-compact" role="button" tabindex="0" title="${c.name}" onclick="filterByCategory('${c.name}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
      <div class="cat-icon-circle ${getCategoryTone(c.icon_name, c.name)}">
        <i class="fa-solid ${getIconClass(c.icon_name, c.slug, c.name)}" aria-hidden="true"></i>
      </div>
      <span class="cat-label-text">${c.name}</span>
    </div>
  `).join('');
}

// Helpers de apresentação dos cards
function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function renderStarIcons(rating) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  let full = Math.floor(value);
  const frac = value - full;
  let half = false;
  if (frac >= 0.75) full += 1;
  else if (frac >= 0.25) half = true;
  let html = '';
  for (let i = 0; i < 5; i++) {
    if (i < full) html += '<i class="fa-solid fa-star"></i>';
    else if (i === full && half) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    else html += '<i class="fa-solid fa-star star-empty"></i>';
  }
  return html;
}

function renderProAvatar(p) {
  const initials = getInitials(p.name);
  if (p.avatar) {
    return `<div class="pro-card-avatar"><img src="${p.avatar}" alt="Foto de ${p.name}" loading="lazy" onerror="this.parentElement.textContent='${initials}'"></div>`;
  }
  return `<div class="pro-card-avatar" aria-hidden="true">${initials}</div>`;
}

// 4. Renderiza Profissionais em Destaque (Cards com Foco em Avaliações e Proximidade)
function renderRecommendedProfessionals() {
  const container = document.getElementById('featured-professionals-container');
  if (!container) return;

  const filteredPros = filterAndSortProsByLocation(PROFESSIONALS || []);

  if (!filteredPros || filteredPros.length === 0) {
    const locLabel = `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
    const availableCities = typeof getAvailableProCities === 'function' ? getAvailableProCities() : [];
    const quickCitiesHtml = availableCities.length > 0 ? `
      <div style="margin-top: 10px; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        ${availableCities.map(c => `
          <button type="button" class="loc-chip" onclick="selectCityOption('${c.city}', '${c.state}')" style="font-size: 11.5px; padding: 5px 10px;">
            📍 Ver ${c.city}, ${c.state} (${c.count})
          </button>
        `).join('')}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="state-block" style="flex: 1 0 100%; text-align: center; padding: 24px 16px;">
        <div class="state-icon" style="color: #6366F1; font-size: 32px; margin-bottom: 8px;"><i class="fa-solid fa-location-dot" aria-hidden="true"></i></div>
        <h6 style="font-size: 15px; font-weight: 700; color: #1E293B;">Nenhum profissional em ${locLabel}</h6>
        <p style="font-size: 13px; color: #64748B; margin: 4px 0 14px;">Ainda não há profissionais cadastrados nesta cidade. Escolha outra cidade abaixo ou cadastre seu perfil:</p>
        <button type="button" class="btn-reset-filters" style="margin: 0 auto; display: inline-flex;" onclick="openLocationPickerModal()">
          <i class="fa-solid fa-map-location-dot"></i> Alterar Cidade ou CEP
        </button>
        ${quickCitiesHtml}
      </div>`;
    setupProsScrollIndicator();
    return;
  }

  container.innerHTML = filteredPros.map(p => {
    const hasReviews = Number(p.reviewsCount) > 0;
    const review = p.latestReview && p.latestReview.text ? p.latestReview : null;
    const reviewMeta = review ? [review.author, review.date].filter(Boolean).join(' · ') : '';
    const done = Number(p.completedServices) > 0 ? p.completedServices : null;
    const distBadge = (p._distanceKm !== null && p._distanceKm !== undefined)
      ? `<span class="pro-distance-badge"><i class="fa-solid fa-location-crosshairs"></i> ${p._distanceKm < 1 ? Math.round(p._distanceKm * 1000) + ' m' : p._distanceKm.toFixed(1) + ' km'}</span>`
      : '';

    return `
    <article class="pro-review-card" role="button" tabindex="0" aria-label="Ver perfil de ${p.name}" onclick="openProDetail('${p.id}')" onkeydown="if(event.key==='Enter'){openProDetail('${p.id}')}">
      <div class="pro-card-header">
        ${renderProAvatar(p)}
        <div class="pro-card-header-info">
          <div class="pro-card-name-row">
            <span class="pro-card-name">${p.name}</span>
            ${p.verified ? '<i class="fa-solid fa-circle-check verified-badge" title="Profissional verificado" aria-label="Verificado"></i>' : ''}
          </div>
          ${p.specialty ? `<div class="pro-card-specialty">${p.specialty}</div>` : ''}
          <div class="pro-card-bairro" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            ${p.neighborhood ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${p.neighborhood}</span>` : ''}
            ${distBadge}
          </div>
        </div>
      </div>

      <div class="pro-card-rating-block">
        ${hasReviews ? `
          <div class="rating-score-group">
            <span class="rating-big-num">${Number(p.rating).toFixed(1)}</span>
            <div class="rating-stars-gold" aria-label="Nota ${Number(p.rating).toFixed(1)} de 5">${renderStarIcons(p.rating)}</div>
          </div>
          <span class="rating-count-pill">${p.reviewsCount} ${p.reviewsCount === 1 ? 'avaliação' : 'avaliações'}</span>
        ` : `<span class="rating-new-chip">Novo no Trampou · sem avaliações</span>`}
      </div>

      ${review ? `
      <div class="pro-card-review-snippet">
        <p class="review-quote-text">“${review.text}”</p>
        ${reviewMeta ? `<span class="review-author-date">${reviewMeta}</span>` : ''}
      </div>` : ''}

      <div class="pro-card-footer">
        ${done ? `<span class="pro-services-done"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${done} serviços concluídos</span>` : ''}
        <span class="btn-open-profile-link">Ver perfil <i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
      </div>
    </article>
  `;
  }).join('');

  setupProsScrollIndicator();
}

// Indicador visual de que há mais profissionais (fade lateral + barra de progresso)
function setupProsScrollIndicator() {
  const scroller = document.getElementById('featured-professionals-container');
  const wrap = document.getElementById('pros-scroll-wrap');
  const progress = document.getElementById('pros-scroll-progress');
  if (!scroller || !wrap) return;

  const cards = scroller.querySelectorAll('.pro-review-card');
  if (progress) {
    progress.innerHTML = cards.length > 1 ? Array.from(cards).map((_, i) => `<span class="${i === 0 ? 'active' : ''}"></span>`).join('') : '';
  }

  const update = () => {
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    wrap.classList.toggle('at-end', maxScroll <= 4 || scroller.scrollLeft >= maxScroll - 4);
    if (progress && cards.length > 1) {
      const step = cards[0].offsetWidth + 12;
      const idx = Math.min(cards.length - 1, Math.round(scroller.scrollLeft / step));
      progress.querySelectorAll('span').forEach((s, i) => s.classList.toggle('active', i === idx));
    }
  };

  if (!scroller.dataset.indicatorBound) {
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    scroller.dataset.indicatorBound = '1';
  }
  requestAnimationFrame(update);
}

// 5. Renderiza Feed Compacto de Dicas e Novidades
function renderNewsFeed() {
  const container = document.getElementById('news-feed-container');
  const items = [
    {
      icon: 'fa-shield-halved',
      tone: 'tone-green',
      title: 'Dica de Segurança: negocie tudo pelo chat',
      desc: 'Orçamentos e prazos combinados no chat garantem histórico protegido.'
    },
    {
      icon: 'fa-bolt',
      tone: 'tone-amber',
      title: 'Serviços elétricos em Parauapebas',
      desc: 'Saiba o que checar no quadro de distribuição antes de chamar um técnico.'
    }
  ];

  container.innerHTML = items.map(item => `
    <div class="news-card-compact">
      <div class="news-icon-pill ${item.tone || ''}">
        <i class="fa-solid ${item.icon}" aria-hidden="true"></i>
      </div>
      <div class="news-compact-info">
        <h6>${item.title}</h6>
        <p>${item.desc}</p>
      </div>
    </div>
  `).join('');
}

// ==========================================
// EXPLORAR SOLUÇÕES (NÃO-GENÉRICA)
// ==========================================

// 1. DADOS DE CASOS REAIS (ANTES & DEPOIS)
const SHOWCASE_CASES = [];

function getShowcaseItems() {
  let custom = [];
  try {
    const raw = localStorage.getItem('trampou_custom_showcases');
    if (raw) custom = JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao ler trampou_custom_showcases', e);
  }
  return [...custom, ...SHOWCASE_CASES];
}

function renderShowcase() {
  const container = document.getElementById('showcase-container');
  if (!container) return;

  const items = getShowcaseItems();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="showcase-empty-state" style="padding: 24px 18px; text-align: center; background: #FFFFFF; border-radius: 16px; border: 1.5px dashed #E2E8F0; width: 100%; min-width: 260px; box-sizing: border-box;">
        <i class="fa-solid fa-camera-retro" style="font-size: 28px; color: #94A3B8; margin-bottom: 8px; display: block;"></i>
        <h5 style="font-size: 13.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px;">Galeria Antes & Depois</h5>
        <p style="font-size: 11px; color: #64748B; margin-bottom: 12px; line-height: 1.4;">Profissionais cadastrados podem publicar fotos de suas transformações para destacar seus serviços na Home.</p>
        <button type="button" class="btn-auth-primary" onclick="openPublishShowcaseModal()" style="width: auto; padding: 7px 16px; margin: 0 auto; font-size: 11.5px; display: inline-flex; align-items: center; gap: 6px;">
          <i class="fa-solid fa-plus"></i> Publicar Transformação
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const beforeBg = item.beforeImage ? `url(${item.beforeImage}) center/cover no-repeat` : (item.beforeGradient || 'linear-gradient(135deg, #475569, #1e293b)');
    const afterBg = item.afterImage ? `url(${item.afterImage}) center/cover no-repeat` : (item.afterGradient || 'linear-gradient(135deg, #0f766e, #134e4a)');
    const isProBadge = (item.isBoosted || item.isPro)
      ? `<span class="badge-pro-tag" style="position: absolute; top: 8px; right: 8px; z-index: 5; background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);"><i class="fa-solid fa-crown"></i> PRO</span>`
      : '';

    const safeTitle = (item.title || '').replace(/'/g, "\\'");
    const safePro = (item.proName || '').replace(/'/g, "\\'");
    const safeProId = item.proId || '';

    return `
      <div class="showcase-card" onclick="openShowcaseViewer('${item.id}')">
        <div class="showcase-visual">
          <span class="showcase-tag-neighborhood"><i class="fa-solid fa-location-dot"></i> ${item.neighborhood}</span>
          ${isProBadge}
          <div class="before-after-view">
            <div class="before-after-side before" style="background: ${beforeBg};">
              <span class="side-badge before">Antes</span>
              <span class="side-text-desc">${item.beforeDesc}</span>
            </div>
            <div class="before-after-side after" style="background: ${afterBg};">
              <span class="side-badge after">Depois</span>
              <span class="side-text-desc">${item.afterDesc}</span>
            </div>
          </div>
        </div>
        <div class="showcase-content">
          <div>
            <h5 class="showcase-title">${item.title}</h5>
            <div class="showcase-pro-row">
              <span>Executado por <strong>${item.proName}</strong></span>
            </div>
          </div>
          <button class="showcase-action-btn" onclick="event.stopPropagation(); requestQuoteForShowcase('${item.id}', '${safeTitle}', '${safePro}', '${safeProId}')">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Quero um resultado assim
          </button>
        </div>
      </div>
    `;
  }).join('');
}


// 2. DIAGNÓSTICO DO PERRENGUE (SINTOMAS COMUNS)
const TROUBLES = {
  'ar_pingando': {
    title: 'Ar-condicionado pingando água no quarto',
    pill: '❄️ Ar pingando água',
    urgent: 'Muito comum em Parauapebas',
    cause: 'Provável acúmulo de limo no dreno plástico ou desnivelamento da calha evaporadora.',
    priceRange: 'R$ 80 a R$ 130',
    proType: 'Técnico de Refrigeração',
    proName: 'Técnico de Refrigeração',
    proId: null
  },
  'disjuntor_caindo': {
    title: 'Disjuntor desarmando com chuveiro ou ar',
    pill: '⚡ Chuveiro caindo o disjuntor',
    urgent: 'Risco de curto elétrico',
    cause: 'Fiação superaquecendo por bitola insuficiente ou disjuntor frouxo com desgaste mecânico.',
    priceRange: 'R$ 70 a R$ 140',
    proType: 'Eletricista Residencial',
    proName: 'Eletricista Residencial',
    proId: null
  },
  'pia_entupida': {
    title: 'Pia da cozinha ou ralo voltando água e mau cheiro',
    pill: '🚰 Pia voltando água',
    urgent: 'Urgente / Higiene',
    cause: 'Caixa de gordura saturada ou obstrução no sifão por resíduos orgânicos.',
    priceRange: 'R$ 90 a R$ 150',
    proType: 'Encanador & Desentupidor',
    proName: 'Profissional de Hidráulica',
    proId: null
  },
  'porta_raspando': {
    title: 'Porta de madeira raspando ou não travando',
    pill: '🚪 Porta emperrando no chão',
    urgent: 'Desconforto diário',
    cause: 'Empenamento da folha por umidade e calor ou dobradiças frouxas no batente.',
    priceRange: 'R$ 60 a R$ 110',
    proType: 'Montador / Marceneiro',
    proName: 'Montador de Móveis',
    proId: null
  },
  'carro_nao_liga': {
    title: 'Carro não dá partida e painel pisca',
    pill: '🚗 Carro não liga na garagem',
    urgent: 'Socorro Imediato',
    cause: 'Bateria descarregada, terminais oxidados ou alternador não segurando carga.',
    priceRange: 'R$ 60 a R$ 120 (socorro)',
    proType: 'Auto Socorro / Mecânico',
    proName: 'Auto Socorro Mecânico',
    proId: null
  },
  'tomada_estalos': {
    title: 'Tomada com estalos ou cheiro de queimado',
    pill: '🔥 Tomada cheirando queimado',
    urgent: 'Risco iminente de fogo',
    cause: 'Mau contato nos parafusos da tomada ou plugue derretendo devido a aparelho potente.',
    priceRange: 'R$ 50 a R$ 90',
    proType: 'Eletricista Residencial',
    proName: 'Eletricista Residencial',
    proId: null
  }
};

let activeTroubleKey = 'ar_pingando';

function renderTroublePills() {
  const container = document.getElementById('trouble-pills-container');
  if (!container) return;

  container.innerHTML = Object.keys(TROUBLES).map(key => {
    const t = TROUBLES[key];
    const isActive = key === activeTroubleKey;
    return `
      <div class="trouble-pill ${isActive ? 'active' : ''}" onclick="selectTrouble('${key}')">
        ${t.pill}
      </div>
    `;
  }).join('');

  showTroubleDiagnosis(activeTroubleKey);
}

function selectTrouble(key) {
  activeTroubleKey = key;
  document.querySelectorAll('.trouble-pill').forEach((pill, idx) => {
    pill.classList.toggle('active', Object.keys(TROUBLES)[idx] === key);
  });
  showTroubleDiagnosis(key);
}

function showTroubleDiagnosis(key) {
  const box = document.getElementById('trouble-diagnosis-box');
  if (!box) return;

  const t = TROUBLES[key];
  if (!t) return;

  box.style.display = 'block';
  box.innerHTML = `
    <div class="diag-header">
      <h5>${t.title}</h5>
      <span class="diag-tag-urgent">${t.urgent}</span>
    </div>
    <p class="diag-cause"><strong>Diagnóstico rápido:</strong> ${t.cause}</p>
    <div class="diag-price-pro-row">
      <div>
        <span class="diag-price-sub">Preço médio em Parauapebas</span>
        <div class="diag-price">${t.priceRange}</div>
      </div>
      <div>
        <span class="diag-price-sub">Quem resolve</span>
        <div style="font-size: 11.5px; font-weight: 700; color: var(--text-primary);">${t.proType}</div>
      </div>
    </div>
    <button class="diag-cta" onclick="openRequestModal('${t.title}', '${t.proName}')">
      <i class="fa-solid fa-paper-plane"></i> Chamar quem resolve agora
    </button>
  `;
}

// 3. TERMÔMETRO DE PREÇOS DE PARAUAPEBAS
const PRICE_GUIDE = {
  'split_instalacao': {
    title: 'Instalação de Split 12.000 BTUs',
    min: 'R$ 220',
    avg: 'R$ 250',
    max: 'R$ 320',
    percent: 45,
    note: 'Inclui furação, até 2m a 3m de tubulação de cobre e teste de estanqueidade.'
  },
  'split_limpeza': {
    title: 'Higienização Química de Split',
    min: 'R$ 130',
    avg: 'R$ 160',
    max: 'R$ 200',
    percent: 40,
    note: 'Desmonte da turbina, lavagem de bandeja e aplicação de produto antibacteriano.'
  },
  'diaria_diarista': {
    title: 'Diária de Faxina Residencial',
    min: 'R$ 140',
    avg: 'R$ 160',
    max: 'R$ 190',
    percent: 50,
    note: 'Jornada de até 8h em casas ou aptos. Muito requisitada em Cidade Nova e Rio Verde.'
  },
  'ponto_tomada': {
    title: 'Ponto de Tomada Adicional / Fiação',
    min: 'R$ 50',
    avg: 'R$ 75',
    max: 'R$ 110',
    percent: 50,
    note: 'Puxada do quadro ou derivação em eletroduto com acabamento na caixinha 4x2.'
  },
  'porcelanato_m2': {
    title: 'Assentamento de Porcelanato (m²)',
    min: 'R$ 40/m²',
    avg: 'R$ 48/m²',
    max: 'R$ 65/m²',
    percent: 55,
    note: 'Mão de obra especializada com cunhas de nivelamento para peças retificadas.'
  },
  'montar_guarda_roupa': {
    title: 'Montagem de Guarda-Roupa Grande (6 portas)',
    min: 'R$ 130',
    avg: 'R$ 160',
    max: 'R$ 220',
    percent: 50,
    note: 'Montagem estrutural, ajuste de corrediças telescópicas e fixação de portas.'
  }
};

function updatePriceThermometer() {
  const select = document.getElementById('price-service-select');
  const resultBox = document.getElementById('price-gauge-result');
  if (!select || !resultBox) return;

  const key = select.value;
  const data = PRICE_GUIDE[key] || PRICE_GUIDE['split_instalacao'];

  resultBox.innerHTML = `
    <div class="gauge-values-row">
      <div>
        <span class="gauge-range-label">Preço Médio Praticado</span>
        <div class="gauge-main-val">${data.avg}</div>
      </div>
      <div style="text-align: right;">
        <span class="gauge-range-label">Faixa de Mercado</span>
        <div style="font-size: 13px; font-weight: 700; color: var(--text-primary);">${data.min} — ${data.max}</div>
      </div>
    </div>

    <div class="price-scale-bar">
      <div class="price-indicator-pin" style="left: ${data.percent}%;">
        Média ${data.avg}
      </div>
    </div>

    <div class="price-scale-labels">
      <span>Econômico (${data.min})</span>
      <span>Padrão</span>
      <span>Premium (${data.max})</span>
    </div>

    <div class="price-details-tip">
      <i class="fa-solid fa-circle-info"></i>
      <span>${data.note}</span>
    </div>
  `;
}

// =========================================================
// 4. PLANTÃO SOS EMERGÊNCIA & RADAR ESTILO APP 99
// =========================================================

let selectedSOSProType = 'Eletricista';
let sosRadarTimerId = null;
let sosCountdownInterval = null;
let currentAcceptedSOSPro = null;
let currentSOSRequestData = null;
let selectedSpecificSOSPro = null;

// Mapa de ícones e categorias para emergência
const SOS_CATEGORY_MAP = {
  'Eletricista': { icon: 'fa-bolt', color: '#D97706', bg: '#FEF3C7', defaultDesc: 'Curto-circuito, disjuntor desarmando ou sem luz', fee: 'R$ 80 a R$ 130' },
  'Encanador': { icon: 'fa-faucet-drip', color: '#2563EB', bg: '#DBEAFE', defaultDesc: 'Vazamento, cano furado ou esgoto entupido', fee: 'R$ 90 a R$ 150' },
  'Reboque': { icon: 'fa-truck-pickup', color: '#DC2626', bg: '#FEE2E2', defaultDesc: 'Socorro de reboque, guincho ou pane mecânica na cidade/rodovia', fee: 'R$ 120 a R$ 250' },
  'Guincho': { icon: 'fa-truck-pickup', color: '#DC2626', bg: '#FEE2E2', defaultDesc: 'Socorro de guincho, reboque ou pane mecânica na cidade/rodovia', fee: 'R$ 120 a R$ 250' },
  'Pedreiro': { icon: 'fa-trowel-bricks', color: '#EA580C', bg: '#FFEDD5', defaultDesc: 'Infiltração grave, reparo urgente em alvenaria ou piso', fee: 'R$ 80 a R$ 140' },
  'Carpinteiro': { icon: 'fa-hammer', color: '#CA8A04', bg: '#FEF9C3', defaultDesc: 'Porta emperrada, telhado danificado ou estrutura de madeira', fee: 'R$ 70 a R$ 120' },
  'Marceneiro': { icon: 'fa-hammer', color: '#CA8A04', bg: '#FEF9C3', defaultDesc: 'Porta emperrada, fechadura travada ou conserto emergencial', fee: 'R$ 70 a R$ 120' },
  'Refrigeração': { icon: 'fa-snowflake', color: '#9333EA', bg: '#F3E8FF', defaultDesc: 'Ar-condicionado parou no calor, fumaça ou vazando água', fee: 'R$ 90 a R$ 160' },
  'Ar-Condicionado': { icon: 'fa-snowflake', color: '#9333EA', bg: '#F3E8FF', defaultDesc: 'Ar Split parou no calor, fumaça ou vazamento intenso de água', fee: 'R$ 90 a R$ 160' },
  'Chaveiro': { icon: 'fa-key', color: '#475569', bg: '#F1F5F9', defaultDesc: 'Trancado do lado de fora, chave quebrada ou troca urgente', fee: 'R$ 60 a R$ 100' },
  'Mecânico': { icon: 'fa-wrench', color: '#DC2626', bg: '#FEE2E2', defaultDesc: 'Pane mecânica, bateria arriada ou socorro móvel', fee: 'R$ 80 a R$ 150' },
  'Diarista': { icon: 'fa-broom', color: '#059669', bg: '#D1FAE5', defaultDesc: 'Limpeza e desinfecção pós-alagamento ou urgente', fee: 'R$ 100 a R$ 180' },
  'Pintor': { icon: 'fa-paint-roller', color: '#0284C7', bg: '#E0F2FE', defaultDesc: 'Pintura emergencial e reparo de infiltrações/manchas', fee: 'R$ 80 a R$ 140' },
  'Informática': { icon: 'fa-laptop-code', color: '#4F46E5', bg: '#EEF2FF', defaultDesc: 'Pane em servidor, internet/rede fora do ar ou computador urgente', fee: 'R$ 80 a R$ 150' },
  'Frete': { icon: 'fa-truck-fast', color: '#15803D', bg: '#DCFCE7', defaultDesc: 'Transporte urgente e retirada emergencial de móveis ou cargas', fee: 'R$ 100 a R$ 200' }
};

// Abre o modal de solicitação de emergência
function openSOSRequestModal(initialProType, specificProId) {
  if (typeof requireUserAuth === 'function' && !requireUserAuth('sos')) return;
  clearSelectedSpecificPro();

  if (specificProId) {
    selectSpecificSOSPro(specificProId);
  } else if (initialProType) {
    selectSOSProType(initialProType);
  }
  
  // Pré-preenche o telefone se houver usuário autenticado
  const user = getCurrentUser ? getCurrentUser() : null;
  const phoneInput = document.getElementById('sos-phone-input');
  if (phoneInput && user && user.phone) {
    phoneInput.value = user.phone;
  }

  const modal = document.getElementById('sos-request-modal');
  if (modal) modal.classList.add('active');
}

// Fecha o modal de solicitação
function closeSOSRequestModal() {
  const modal = document.getElementById('sos-request-modal');
  if (modal) modal.classList.remove('active');
}

// Seleciona a categoria de profissional no formulário
function selectSOSProType(type) {
  selectedSOSProType = type;
  const chips = document.querySelectorAll('#sos-pro-chips-grid .sos-choice-chip');
  chips.forEach(chip => {
    if (chip.getAttribute('data-pro') === type) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  // Atualiza placeholder sugestivo se a descrição estiver vazia
  const descInput = document.getElementById('sos-desc-input');
  if (descInput && !descInput.value.trim() && SOS_CATEGORY_MAP[type]) {
    descInput.placeholder = `Ex: ${SOS_CATEGORY_MAP[type].defaultDesc}`;
  }
}

// ==============================================================================
// BUSCA E SELEÇÃO DE PROFISSIONAL ESPECÍFICO NO MODAL SOS
// ==============================================================================

function handleSOSSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const clearBtn = document.getElementById('sos-search-clear-btn');
  const resultsContainer = document.getElementById('sos-search-results-list');
  const quickCategories = document.getElementById('sos-quick-categories-section');

  if (clearBtn) clearBtn.style.display = q.length > 0 ? 'flex' : 'none';

  if (q.length === 0) {
    if (resultsContainer) {
      resultsContainer.style.display = 'none';
      resultsContainer.innerHTML = '';
    }
    if (quickCategories && !selectedSpecificSOSPro) {
      quickCategories.style.display = 'block';
    }
    return;
  }

  if (quickCategories) quickCategories.style.display = 'none';
  if (!resultsContainer) return;
  resultsContainer.style.display = 'block';

  // 1. Busca por profissionais específicos em PROFESSIONALS
  const matchingPros = PROFESSIONALS.filter(p => {
    const nameMatch = (p.name || '').toLowerCase().includes(q);
    const specMatch = (p.specialty || '').toLowerCase().includes(q);
    const catMatch = (p.category || '').toLowerCase().includes(q);
    const bairroMatch = (p.neighborhood || '').toLowerCase().includes(q);
    const bioMatch = (p.bio || '').toLowerCase().includes(q);
    return nameMatch || specMatch || catMatch || bairroMatch || bioMatch;
  });

  // 2. Busca por categorias em SOS_CATEGORY_MAP
  const matchingCats = Object.keys(SOS_CATEGORY_MAP).filter(catKey => {
    const meta = SOS_CATEGORY_MAP[catKey];
    return catKey.toLowerCase().includes(q) || (meta.defaultDesc && meta.defaultDesc.toLowerCase().includes(q));
  });

  if (matchingPros.length === 0 && matchingCats.length === 0) {
    const safeQ = (query || '').replace(/[&<>"']/g, '');
    resultsContainer.innerHTML = `
      <div class="sos-search-empty-state">
        <i class="fa-solid fa-magnifying-glass"></i>
        <p>Nenhum profissional ou categoria encontrada para "<strong>${safeQ}</strong>".</p>
        <button type="button" class="btn-link-subtle" onclick="clearSOSSearch()" style="margin-top: 6px; font-weight: 700; color: #DC2626; cursor: pointer;">Ver categorias recomendadas</button>
      </div>
    `;
    return;
  }

  let html = '';

  // Renderiza Profissionais Encontrados
  if (matchingPros.length > 0) {
    html += `
      <div class="sos-results-group-title">
        <i class="fa-solid fa-user-shield"></i> Profissionais de Plantão / Cadastrados (${matchingPros.length})
      </div>
    `;

    html += matchingPros.map(p => {
      const avatarHtml = p.avatar 
        ? `<img src="${p.avatar}" alt="${p.name}" class="sos-search-pro-avatar">`
        : `<div class="sos-search-pro-avatar-fallback">${(p.name || 'P')[0].toUpperCase()}</div>`;
      const is24h = p.is24h !== false && p.emergencyAvailable !== false;

      return `
        <div class="sos-search-pro-card" onclick="selectSpecificSOSPro('${p.id}')">
          <div class="sos-search-pro-left">
            ${avatarHtml}
            <div class="sos-search-pro-info">
              <span class="sos-search-pro-name">
                ${p.name} <i class="fa-solid fa-circle-check" style="color: #38BDF8; font-size: 11px;"></i>
              </span>
              <span class="sos-search-pro-spec">${p.specialty}</span>
              <span class="sos-search-pro-meta">
                <i class="fa-solid fa-star" style="color: #F59E0B;"></i> <strong>${p.rating || 5.0}</strong>
                <span>•</span>
                <i class="fa-solid fa-location-dot"></i> ${p.neighborhood || 'Parauapebas'}
                ${is24h ? '<span class="digital-chip-24h" style="font-size: 9px; padding: 1px 5px;"><i class="fa-solid fa-bolt"></i> 24h</span>' : ''}
              </span>
            </div>
          </div>
          <button type="button" class="sos-search-pro-action-btn" onclick="selectSpecificSOSPro('${p.id}'); event.stopPropagation();">
            <i class="fa-solid fa-crosshairs"></i> Chamar
          </button>
        </div>
      `;
    }).join('');
  }

  // Renderiza Categorias Encontradas
  if (matchingCats.length > 0) {
    html += `
      <div class="sos-results-group-title" style="margin-top: 8px;">
        <i class="fa-solid fa-layer-group"></i> Categorias de Emergência (${matchingCats.length})
      </div>
    `;

    html += matchingCats.map(catKey => {
      const meta = SOS_CATEGORY_MAP[catKey] || { icon: 'fa-bolt', defaultDesc: 'Atendimento emergencial' };
      return `
        <div class="sos-search-cat-item" onclick="selectSOSCategoryFromSearch('${catKey}')">
          <div class="sos-search-cat-left">
            <div class="sos-search-cat-icon">
              <i class="fa-solid ${meta.icon}"></i>
            </div>
            <div>
              <span class="sos-search-cat-title">${catKey}</span>
              <span class="sos-search-cat-desc">${meta.defaultDesc}</span>
            </div>
          </div>
          <span class="sos-search-cat-btn">Selecionar</span>
        </div>
      `;
    }).join('');
  }

  resultsContainer.innerHTML = html;
}

function selectSpecificSOSPro(proId) {
  const pro = PROFESSIONALS.find(p => p.id === proId);
  if (!pro) return;

  selectedSpecificSOSPro = pro;
  selectedSOSProType = pro.specialty;

  // Atualiza card de profissional selecionado
  const banner = document.getElementById('sos-selected-pro-banner');
  const proNameElem = document.getElementById('sos-sel-pro-name');
  const proSpecElem = document.getElementById('sos-sel-pro-specialty');
  const proLocElem = document.getElementById('sos-sel-pro-loc');
  const avatarImg = document.getElementById('sos-sel-avatar-img');
  const avatarFallback = document.getElementById('sos-sel-avatar-fallback');

  if (proNameElem) proNameElem.innerText = pro.name;
  if (proSpecElem) proSpecElem.innerText = pro.specialty;
  if (proLocElem) proLocElem.innerText = `${pro.neighborhood || 'Parauapebas, PA'} • Alerta Direto`;

  if (pro.avatar && avatarImg) {
    avatarImg.src = pro.avatar;
    avatarImg.style.display = 'block';
    if (avatarFallback) avatarFallback.style.display = 'none';
  } else if (avatarFallback) {
    avatarFallback.innerText = (pro.name || 'P')[0].toUpperCase();
    avatarFallback.style.display = 'flex';
    if (avatarImg) avatarImg.style.display = 'none';
  }

  if (banner) banner.style.display = 'flex';

  // Esconde resultados da busca e esconde categorias rápidas
  const resultsContainer = document.getElementById('sos-search-results-list');
  if (resultsContainer) resultsContainer.style.display = 'none';

  const quickCategories = document.getElementById('sos-quick-categories-section');
  if (quickCategories) quickCategories.style.display = 'none';

  // Atualiza input da busca com o nome do pro
  const searchInput = document.getElementById('sos-search-input');
  if (searchInput) searchInput.value = pro.name;

  const clearBtn = document.getElementById('sos-search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'flex';

  // Atualiza label do botão de disparar
  const btnLabel = document.getElementById('btn-sos-disparar-label');
  if (btnLabel) {
    btnLabel.innerText = `Disparar Chamado SOS para ${pro.name.split(' ')[0]}`;
  }

  // Atualiza placeholder do problema
  const descInput = document.getElementById('sos-desc-input');
  if (descInput && !descInput.value.trim()) {
    descInput.placeholder = `Ex: Emergência para ${pro.name}: descreva o que aconteceu no local...`;
  }

  showToast(`🎯 Profissional ${pro.name} selecionado para o alerta direto!`);
}

function clearSelectedSpecificPro() {
  selectedSpecificSOSPro = null;

  const banner = document.getElementById('sos-selected-pro-banner');
  if (banner) banner.style.display = 'none';

  const quickCategories = document.getElementById('sos-quick-categories-section');
  if (quickCategories) quickCategories.style.display = 'block';

  const searchInput = document.getElementById('sos-search-input');
  if (searchInput) searchInput.value = '';

  const clearBtn = document.getElementById('sos-search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';

  const resultsContainer = document.getElementById('sos-search-results-list');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }

  const btnLabel = document.getElementById('btn-sos-disparar-label');
  if (btnLabel) {
    btnLabel.innerText = 'Disparar Chamado SOS aos Profissionais';
  }

  selectSOSProType(selectedSOSProType || 'Eletricista');
}

function selectSOSCategoryFromSearch(catKey) {
  clearSelectedSpecificPro();
  selectSOSProType(catKey);

  const searchInput = document.getElementById('sos-search-input');
  if (searchInput) searchInput.value = '';

  const clearBtn = document.getElementById('sos-search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';

  const resultsContainer = document.getElementById('sos-search-results-list');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }

  const quickCategories = document.getElementById('sos-quick-categories-section');
  if (quickCategories) quickCategories.style.display = 'block';

  showToast(`Categoria ${catKey} selecionada.`);
}

function clearSOSSearch() {
  const searchInput = document.getElementById('sos-search-input');
  if (searchInput) searchInput.value = '';

  const clearBtn = document.getElementById('sos-search-clear-btn');
  if (clearBtn) clearBtn.style.display = 'none';

  const resultsContainer = document.getElementById('sos-search-results-list');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
  }

  if (!selectedSpecificSOSPro) {
    const quickCategories = document.getElementById('sos-quick-categories-section');
    if (quickCategories) quickCategories.style.display = 'block';
  }
}

// Dispara o chamado e abre o Radar estilo 99 com Mapa
function launchSOSRadar() {
  const isDirectTarget = !!selectedSpecificSOSPro;
  const proType = isDirectTarget 
    ? (selectedSpecificSOSPro.specialty || selectedSpecificSOSPro.category || 'Serviço') 
    : (selectedSOSProType || 'Eletricista');
  const bairro = document.getElementById('sos-bairro-select') ? document.getElementById('sos-bairro-select').value : 'Cidade Nova';
  const desc = document.getElementById('sos-desc-input') ? document.getElementById('sos-desc-input').value.trim() : '';
  const phone = document.getElementById('sos-phone-input') ? document.getElementById('sos-phone-input').value.trim() : '(94) 99123-4567';

  currentSOSRequestData = {
    type: proType,
    targetPro: selectedSpecificSOSPro,
    bairro: bairro,
    desc: desc || (isDirectTarget ? `Chamado urgente direto para ${selectedSpecificSOSPro.name}` : (SOS_CATEGORY_MAP[proType] ? SOS_CATEGORY_MAP[proType].defaultDesc : 'Atendimento imediato')),
    phone: phone,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  closeSOSRequestModal();

  const radarModal = document.getElementById('sos-radar-modal');
  if (radarModal) radarModal.classList.add('active');

  // Inicializa o Estado 1 do Radar (Buscando)
  const searchingBox = document.getElementById('radar-searching-box');
  const acceptedBox = document.getElementById('radar-accepted-box');
  if (searchingBox) searchingBox.style.display = 'flex';
  if (acceptedBox) acceptedBox.style.display = 'none';

  // Atualiza textos
  const catLabel = document.getElementById('radar-cat-label');
  if (catLabel) {
    catLabel.innerText = isDirectTarget ? selectedSpecificSOSPro.name : proType;
  }

  const catIconBox = document.getElementById('radar-selected-category-pill');
  if (catIconBox) {
    if (isDirectTarget) {
      catIconBox.innerHTML = `<i class="fa-solid fa-crosshairs"></i> <span>Alvo: ${selectedSpecificSOSPro.name}</span>`;
    } else if (SOS_CATEGORY_MAP[proType]) {
      catIconBox.innerHTML = `<i class="fa-solid ${SOS_CATEGORY_MAP[proType].icon}"></i> <span>${proType}</span>`;
    }
  }

  const bairroName = document.getElementById('radar-bairro-name');
  if (bairroName) bairroName.innerText = bairro;

  const captionText = document.getElementById('radar-status-caption');
  if (captionText) {
    captionText.innerText = isDirectTarget 
      ? `Transmitindo chamado diretamente para ${selectedSpecificSOSPro.name}...` 
      : `Buscando ${proType} em ${bairro}...`;
  }

  // Renderiza pins de profissionais no mapa
  renderRadarMapPins(proType, bairro);

  // Inicia contagem regressiva e simulação de busca estilo 99
  startSOSRadarSimulation(proType, bairro);
}

// Renderiza marcadores no mapa estilo 99
function renderRadarMapPins(proType, clientBairro) {
  const container = document.getElementById('radar-pro-pins-container');
  if (!container) return;

  const isDirectTarget = currentSOSRequestData && currentSOSRequestData.targetPro;
  let proList = [];

  if (isDirectTarget) {
    const target = currentSOSRequestData.targetPro;
    proList = [target, ...PROFESSIONALS.filter(p => p.id !== target.id).slice(0, 2)];
  } else {
    // Encontra profissionais compatíveis
    const matchingPros = PROFESSIONALS.filter(p => {
      const spec = (p.specialty || '').toLowerCase();
      const typeLower = proType.toLowerCase();
      return p.emergencyAvailable !== false && (spec.includes(typeLower) || typeLower.includes(spec) || spec.includes('manutenção') || spec.includes('reparos'));
    });
    proList = matchingPros.length > 0 ? matchingPros : PROFESSIONALS.slice(0, 3);
  }

  // Coordenadas simuladas dos bairros no mapa SVG (percentuais dentro de 0-100%)
  const pinPositions = [
    { top: '34%', left: '32%', dist: '1.2 km', eta: '~12 min' },
    { top: '26%', left: '68%', dist: '2.1 km', eta: '~18 min' },
    { top: '62%', left: '28%', dist: '1.7 km', eta: '~15 min' },
    { top: '68%', left: '72%', dist: '3.4 km', eta: '~25 min' },
    { top: '42%', left: '75%', dist: '2.8 km', eta: '~20 min' }
  ];

  container.innerHTML = proList.map((p, idx) => {
    const pos = pinPositions[idx % pinPositions.length];
    const catMeta = SOS_CATEGORY_MAP[proType] || { icon: 'fa-bolt' };
    const firstName = p.name.split(' ')[0];
    const isTargetPro = isDirectTarget && (p.id === currentSOSRequestData.targetPro.id);

    return `
      <div class="radar-pro-marker ${isTargetPro ? 'target-pin-highlight' : ''}" style="top: ${pos.top}; left: ${pos.left}; animation-delay: ${idx * 0.4}s;" onclick="showToast('${p.name} • ${p.specialty} • ${pos.dist}')">
        <div class="pro-marker-bubble" style="${isTargetPro ? 'background: #DC2626; color: #FFF;' : ''}">
          <span class="pro-marker-icon"><i class="fa-solid ${isTargetPro ? 'fa-crosshairs' : catMeta.icon}"></i></span>
          <span class="pro-marker-name">${isTargetPro ? `🎯 ${firstName} (Alvo Direto)` : `${firstName} (${pos.dist})`}</span>
        </div>
        <div class="pro-marker-arrow" style="${isTargetPro ? 'border-top-color: #DC2626;' : ''}"></div>
      </div>
    `;
  }).join('');

  const countBadge = document.getElementById('radar-notified-count');
  if (countBadge) {
    countBadge.innerText = isDirectTarget 
      ? `Transmitindo chamado diretamente para ${currentSOSRequestData.targetPro.name}` 
      : `Notificando ${proList.length} profissionais no seu raio`;
  }
}

// Simulação de busca e aceite estilo app 99/Uber
function startSOSRadarSimulation(proType, bairro) {
  // Limpa timers anteriores
  if (sosRadarTimerId) clearTimeout(sosRadarTimerId);
  if (sosCountdownInterval) clearInterval(sosCountdownInterval);

  let secondsLeft = 10;
  const timerElem = document.getElementById('radar-countdown-timer');
  if (timerElem) timerElem.innerText = `00:10`;

  sosCountdownInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft >= 0 && timerElem) {
      timerElem.innerText = secondsLeft < 10 ? `00:0${secondsLeft}` : `00:${secondsLeft}`;
    }
  }, 1000);

  // Se houver profissional alvo específico selecionado pelo usuário, ele é o candidato direto!
  const isDirectTarget = currentSOSRequestData && currentSOSRequestData.targetPro;
  const candidate = isDirectTarget 
    ? currentSOSRequestData.targetPro 
    : (PROFESSIONALS.find(p => {
        const spec = (p.specialty || '').toLowerCase();
        const typeLower = proType.toLowerCase();
        return p.emergencyAvailable !== false && (spec.includes(typeLower) || typeLower.includes(spec));
      }) || (PROFESSIONALS.length > 0 ? PROFESSIONALS[0] : null));

  currentAcceptedSOSPro = candidate || {
    id: 'sos_oncall',
    name: `Plantão SOS (${proType})`,
    specialty: `${proType} Emergencial`,
    phone: '',
    neighborhood: bairro || 'Parauapebas',
    rating: 5.0,
    avatar: 'trampou_app_icon.png'
  };

  // Após 1.4s, dispara o alerta interativo para o profissional aceitar na tela
  setTimeout(() => {
    const radarModal = document.getElementById('sos-radar-modal');
    if (radarModal && radarModal.classList.contains('active')) {
      openIncomingSOSModal({
        ...currentSOSRequestData,
        candidatePro: candidate
      });
    }
  }, 1400);

  // Fallback automático após 10 segundos caso ninguém clique
  sosRadarTimerId = setTimeout(() => {
    clearInterval(sosCountdownInterval);
    closeIncomingSOSModal();

    // Transiciona para o Estado 2: Aceito!
    triggerSOSAcceptedState(candidate);
  }, 10000);
}

// ==============================================================================
// FLUXO DO PROFISSIONAL: RECEBIMENTO E ACEITE DE CHAMADOS DE EMERGÊNCIA 24h
// ==============================================================================

let incomingSOSTimerId = null;
let incomingSOSIntervalId = null;
let currentIncomingSOSData = null;

// Abre o modal de alerta de emergência na tela do profissional
function openIncomingSOSModal(sosData) {
  currentIncomingSOSData = sosData || {
    type: 'Atendimento Emergencial',
    bairro: 'Centro',
    desc: 'Chamado urgente enviado pelo cliente.',
    phone: '',
    clientName: 'Cliente Trampou',
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };

  const overlay = document.getElementById('pro-sos-incoming-modal');
  if (!overlay) return;

  const req = currentIncomingSOSData;
  const meta = SOS_CATEGORY_MAP[req.type] || { icon: 'fa-bolt', fee: 'R$ 80 a R$ 130' };

  // Preenche dados visuais
  const catVal = document.getElementById('pro-sos-category-val');
  if (catVal) {
    catVal.innerHTML = `<i class="fa-solid ${meta.icon}"></i> <span>${req.type}</span>`;
  }

  const bairroVal = document.getElementById('pro-sos-bairro-val');
  if (bairroVal) {
    bairroVal.innerHTML = `<i class="fa-solid fa-location-dot"></i> <span>${req.bairro} (~1,5 km)</span>`;
  }

  const descVal = document.getElementById('pro-sos-desc-val');
  if (descVal) {
    descVal.textContent = `"${req.desc}"`;
  }

  const clientName = document.getElementById('pro-sos-client-name');
  if (clientName) {
    clientName.textContent = req.clientName || 'Mariana Silva';
  }

  const clientPhone = document.getElementById('pro-sos-client-phone');
  if (clientPhone) {
    clientPhone.textContent = req.phone || '(94) 99123-4567';
  }

  const feeVal = document.getElementById('pro-sos-fee-val');
  if (feeVal) {
    feeVal.textContent = meta.fee || 'R$ 80 a R$ 140';
  }

  // Inicia contagem regressiva de 30 segundos
  startIncomingSOSTimer(30);

  overlay.classList.add('show');
  overlay.style.display = 'flex';

  // Vibração de alerta se suportado pelo navegador
  if (navigator && navigator.vibrate) {
    try { navigator.vibrate([250, 100, 250, 100, 250]); } catch(e) {}
  }
}
window.openIncomingSOSModal = openIncomingSOSModal;

// Fecha o modal de alerta do profissional
function closeIncomingSOSModal() {
  if (incomingSOSTimerId) clearTimeout(incomingSOSTimerId);
  if (incomingSOSIntervalId) clearInterval(incomingSOSIntervalId);

  const overlay = document.getElementById('pro-sos-incoming-modal');
  if (!overlay) return;
  overlay.classList.remove('show');
  overlay.style.display = 'none';
}
window.closeIncomingSOSModal = closeIncomingSOSModal;

// Contagem regressiva com barra de progresso visual
function startIncomingSOSTimer(totalSeconds = 30) {
  if (incomingSOSTimerId) clearTimeout(incomingSOSTimerId);
  if (incomingSOSIntervalId) clearInterval(incomingSOSIntervalId);

  let seconds = totalSeconds;
  const timerText = document.getElementById('pro-sos-timer-text');
  const progressFill = document.getElementById('pro-sos-progress-fill');

  if (timerText) timerText.textContent = `${seconds}s`;
  if (progressFill) progressFill.style.width = '100%';

  incomingSOSIntervalId = setInterval(() => {
    seconds--;
    if (timerText) timerText.textContent = `${seconds}s`;
    if (progressFill) {
      const pct = Math.max(0, (seconds / totalSeconds) * 100);
      progressFill.style.width = `${pct}%`;
    }

    if (seconds <= 0) {
      clearInterval(incomingSOSIntervalId);
      closeIncomingSOSModal();
      showToast('Tempo limite para resposta expirado. Chamado repassado.');
    }
  }, 1000);
}

// Profissional clica em ACEITAR CHAMADO
function acceptIncomingSOS() {
  const req = currentIncomingSOSData || {
    type: 'Eletricista',
    bairro: 'Cidade Nova',
    desc: 'Atendimento emergencial imediato',
    phone: '(94) 99123-4567',
    clientName: 'Mariana Silva'
  };

  closeIncomingSOSModal();

  // Cancela o timer do radar no lado cliente se estiver rodando
  if (sosRadarTimerId) clearTimeout(sosRadarTimerId);
  if (sosCountdownInterval) clearInterval(sosCountdownInterval);

  // Identifica o profissional aceitante
  const user = getCurrentUser();
  let candidate = null;
  if (user && user.role === 'professional') {
    candidate = PROFESSIONALS.find(p => p.id === user.proId || p.name === user.name);
  }
  if (!candidate && req.candidatePro) {
    candidate = req.candidatePro;
  }
  if (!candidate) {
    candidate = PROFESSIONALS.find(p => (p.specialty || '').toLowerCase().includes(req.type.toLowerCase())) || PROFESSIONALS[0];
  }

  currentAcceptedSOSPro = candidate;

  // Atualiza radar do cliente se estiver ativo
  const radarModal = document.getElementById('sos-radar-modal');
  if (radarModal && radarModal.classList.contains('active')) {
    triggerSOSAcceptedState(candidate);
  }

  // Cria / atualiza conversa prioritária com etiqueta de emergência
  const convId = 'sos_conv_' + Date.now();
  const emergencyConv = {
    id: convId,
    proName: candidate.name,
    clientName: req.clientName || 'Mariana Silva (Cliente SOS)',
    service: `🚨 [SOS 24h] ${req.type}`,
    time: 'Agora',
    unread: 1,
    isSOS: true,
    sosData: req,
    messages: [
      {
        sender: 'system',
        text: `🚨 CHAMADO DE EMERGÊNCIA ACEITO\nLocal: ${req.bairro}, Parauapebas\nProblema: "${req.desc}"\nWhatsApp do Cliente: ${req.phone}`,
        time: 'Agora'
      },
      {
        sender: 'client',
        text: `Olá! Estou precisando de socorro urgente aqui no ${req.bairro}. ${req.desc}`,
        time: 'Agora'
      },
      {
        sender: 'pro',
        text: `Olá, acabei de aceitar seu chamado de emergência pelo Trampou! Estou com meu kit de ferramentas e a caminho do ${req.bairro}. Pode confirmar o número da residência e ponto de referência?`,
        time: 'Agora'
      }
    ]
  };

  // Insere no topo das conversas
  conversations.unshift(emergencyConv);
  renderConversations();
  updateNotificationBadges();

  // Feedback sonoro/vibração
  if (navigator && navigator.vibrate) {
    try { navigator.vibrate([150, 80, 200]); } catch(e) {}
  }

  showToast(`✅ Chamado Aceito! Você está conectado com ${req.clientName || 'o cliente'}.`);

  // Abre a conversa imediatamente
  setTimeout(() => {
    switchTab('chat');
    openChatWith(candidate.name, `🚨 [SOS 24h] ${req.type}`);
  }, 400);
}
window.acceptIncomingSOS = acceptIncomingSOS;

// Profissional clica em RECUSAR CHAMADO
function rejectIncomingSOS() {
  closeIncomingSOSModal();
  showToast('Chamado de emergência recusado. Encaminhando para outro prestador...');
}
window.rejectIncomingSOS = rejectIncomingSOS;




// Dispara o estado de Chamado Aceito na interface
function triggerSOSAcceptedState(pro) {
  const searchingBox = document.getElementById('radar-searching-box');
  const acceptedBox = document.getElementById('radar-accepted-box');
  if (searchingBox) searchingBox.style.display = 'none';
  if (acceptedBox) acceptedBox.style.display = 'flex';

  // Atualiza a barra superior do radar
  const captionText = document.getElementById('radar-status-caption');
  if (captionText) captionText.innerText = `Chamado Aceito por ${pro.name}!`;

  // Preenche dados do card do profissional aceito
  const photoElem = document.getElementById('accepted-pro-photo');
  if (photoElem) {
    photoElem.src = pro.avatar || (pro.id === 'p1' ? 'carlos_avatar.png' : 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150&auto=format&fit=crop&q=80');
    photoElem.onerror = function() { this.src = 'carlos_avatar.png'; };
  }

  const nameElem = document.getElementById('accepted-pro-name-text');
  if (nameElem) nameElem.innerText = pro.name;

  const specElem = document.getElementById('accepted-pro-spec-text');
  if (specElem) specElem.innerText = pro.specialty;

  const starElem = document.getElementById('accepted-pro-star-text');
  if (starElem) starElem.innerText = pro.rating ? pro.rating.toFixed(1).replace('.', ',') : '4,8';

  const etaElem = document.getElementById('accepted-pro-eta-text');
  if (etaElem) etaElem.innerText = '~12-18 min';

  // Feedback ao usuário
  if (navigator && navigator.vibrate) {
    try { navigator.vibrate([150, 80, 150]); } catch(e) {}
  }
  showToast(`🚨 ${pro.name} aceitou sua emergência!`);
}

// Cancela o radar SOS
function cancelSOSRadar() {
  if (sosRadarTimerId) clearTimeout(sosRadarTimerId);
  if (sosCountdownInterval) clearInterval(sosCountdownInterval);

  const radarModal = document.getElementById('sos-radar-modal');
  if (radarModal) radarModal.classList.remove('active');

  showToast('Chamado de emergência cancelado.');
}

// Usuário clica para ir ao chat negociar com o profissional que aceitou
function goToChatWithAcceptedPro() {
  if (!currentAcceptedSOSPro) {
    currentAcceptedSOSPro = PROFESSIONALS[0];
  }

  const pro = currentAcceptedSOSPro;
  const req = currentSOSRequestData || {
    type: 'Eletricista',
    bairro: 'Cidade Nova',
    desc: 'Atendimento emergencial imediato',
    phone: '(94) 99123-4567'
  };

  // Fecha o radar
  const radarModal = document.getElementById('sos-radar-modal');
  if (radarModal) radarModal.classList.remove('active');

  // Mensagem automática oficial do Chamado de Emergência
  const emergencyMessage = `🚨 *SOLICITAÇÃO DE EMERGÊNCIA SOS*\n` +
    `• Profissional: ${req.type}\n` +
    `• Local: ${req.bairro}, Parauapebas\n` +
    `• Problema: "${req.desc}"\n` +
    `• WhatsApp do Cliente: ${req.phone}\n` +
    `• Status: Aceito pelo prestador de plantão`;

  // Resposta imediata do profissional
  const proResponse = `Olá! Acabei de aceitar seu chamado de emergência SOS pelo Trampou. Já estou com meu kit de ferramentas pronto para ir ao ${req.bairro}. Pode me passar o endereço completo e número da casa?`;

  // Registra ou atualiza na lista de conversas
  let conv = conversations.find(c => c.proName === pro.name);
  if (!conv) {
    conv = {
      proName: pro.name,
      service: `[SOS] ${req.type}`,
      time: 'Agora',
      lastMsg: 'Chamado de Emergência Aceito',
      unread: 1,
      messages: []
    };
    conversations.unshift(conv);
  } else {
    conv.service = `[SOS] ${req.type}`;
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  conv.messages.push({
    isMe: true,
    text: emergencyMessage,
    time: timeStr
  });

  conv.messages.push({
    isMe: false,
    text: proResponse,
    time: timeStr
  });

  // Atualiza visualização de conversas e abre o chat
  renderConversations();
  openChatWith(pro.name, `[SOS] ${req.type}`);
  showToast(`Conectado com ${pro.name}! Negocie detalhes pelo chat.`);
}

// Abre WhatsApp com o profissional aceito
function openAcceptedProWhatsApp() {
  if (!currentAcceptedSOSPro) return;
  const pro = currentAcceptedSOSPro;
  const req = currentSOSRequestData || { type: 'Emergência', bairro: 'Parauapebas', desc: 'Socorro imediato' };
  const text = encodeURIComponent(`Olá ${pro.name}, acabei de disparar o chamado SOS de ${req.type} para o bairro ${req.bairro} pelo Trampou. Meu problema: ${req.desc}`);
  window.open(`https://wa.me/5594991234567?text=${text}`, '_blank');
}

// Alias legado para manter compatibilidade
function openEmergencyModal(specialty, symptom) {
  openSOSRequestModal(specialty);
}



// ==============================================================================
// GESTÃO DE NOTIFICAÇÕES E MENSAGENS EM TEMPO REAL
// ==============================================================================
function getUnreadNotificationCount() {
  return conversations.reduce((acc, c) => acc + (c.unread || 0), 0);
}

function updateNotificationBadges() {
  const count = getUnreadNotificationCount();
  const notifBtn = document.getElementById('notif-btn');
  const badgeDot = document.getElementById('home-notif-badge');
  const badgeCounter = document.getElementById('home-notif-counter');
  const bellIcon = document.getElementById('home-bell-icon');
  const navDot = document.querySelector('.nav-btn[data-tab="chat"] .nav-dot');
  const chatTabBadge = document.getElementById('chat-tab-badge');

  if (count > 0) {
    if (notifBtn) notifBtn.classList.add('has-unread');
    if (badgeDot) badgeDot.style.display = 'block';
    if (badgeCounter) {
      badgeCounter.style.display = 'flex';
      badgeCounter.textContent = count > 9 ? '9+' : count;
    }
    if (bellIcon) {
      bellIcon.className = 'fa-solid fa-bell';
    }
    if (navDot) navDot.classList.add('active');
    if (chatTabBadge) {
      chatTabBadge.style.display = 'inline-block';
      chatTabBadge.textContent = `${count} ${count === 1 ? 'nova' : 'novas'}`;
    }
  } else {
    if (notifBtn) notifBtn.classList.remove('has-unread');
    if (badgeDot) badgeDot.style.display = 'none';
    if (badgeCounter) badgeCounter.style.display = 'none';
    if (bellIcon) {
      bellIcon.className = 'fa-regular fa-bell';
    }
    if (navDot) navDot.classList.remove('active');
    if (chatTabBadge) chatTabBadge.style.display = 'none';
  }
}

function openNotificationsFromHome() {
  // Leva o usuário diretamente para a aba de mensagens onde ficam todas as notificações
  switchTab('chat');
  const count = getUnreadNotificationCount();
  if (count > 0) {
    showToast(`📬 Você tem ${count} ${count === 1 ? 'mensagem/notificação pendente' : 'mensagens/notificações pendentes'}.`);
  } else {
    showToast('Todas as suas mensagens e notificações estão em dia.');
  }
}

function markAllNotificationsAsRead() {
  conversations.forEach(c => { c.unread = 0; });
  updateNotificationBadges();
  renderConversations();
  showToast('Todas as notificações foram marcadas como lidas.');
}

// Renderiza Conversas e Notificações
function renderConversations() {
  const container = document.getElementById('conversations-container');
  if (!container) return;

  if (conversations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; color: var(--text-secondary);">
        <i class="fa-regular fa-comments" style="font-size: 40px; color: #CBD5E1; margin-bottom: 12px; display: block;"></i>
        <h5 style="font-size: 15px; font-weight: 700; color: #334155; margin-bottom: 4px;">Nenhuma conversa ou notificação ainda</h5>
        <p style="font-size: 12px; line-height: 1.4; max-width: 260px; margin: 0 auto 16px;">Quando você conversar com profissionais ou receber orçamentos, tudo ficará registrado aqui.</p>
        <button type="button" class="btn-auth-primary" onclick="switchTab('search')" style="width: auto; padding: 8px 18px; margin: 0 auto; font-size: 12.5px;">
          <i class="fa-solid fa-compass"></i> Explorar Profissionais
        </button>
      </div>
    `;
    updateNotificationBadges();
    return;
  }

  container.innerHTML = conversations.map(c => `
    <div class="conversation-item ${c.unread > 0 ? 'has-unread' : ''}" onclick="openChatWith('${c.proName}', '${c.service}', '${c.proId || ''}')">
      <div class="chat-avatar" style="${c.unread > 0 ? 'box-shadow: 0 0 0 2px #7C3AED;' : ''}">${c.proName[0]}</div>
      <div class="chat-item-info">
        <div class="chat-item-top">
          <h5 style="${c.unread > 0 ? 'font-weight: 800; color: #0F172A;' : ''}">${c.proName}</h5>
          <span class="chat-time" style="${c.unread > 0 ? 'color: #7C3AED; font-weight: 700;' : ''}">${c.time}</span>
        </div>
        <span class="chat-tag-service">${c.service}</span>
        <div class="chat-last-msg" style="${c.unread > 0 ? 'font-weight: 600; color: #1E293B;' : ''}">${c.lastMsg}</div>
      </div>
      ${c.unread > 0 ? `<div class="unread-badge">${c.unread}</div>` : ''}
    </div>
  `).join('');

  updateNotificationBadges();
}

// =========================================================
// VITRINE SOCIAL DO PROFISSIONAL (ESTILO INSTAGRAM)
// =========================================================

let currentVitrinePro = null;
let isVitrineOwner = false;
let currentVitrineTab = 'posts';
let selectedPresetGradient = 'linear-gradient(135deg, #1e3a8a, #0284c7)';
let selectedPresetIcon = 'fa-camera';

// =========================================================
// UTILITÁRIO DE COMPRESSÃO INTELIGENTE DE FOTOS (CANVAS)
// Reduz fotos de 4MB-10MB da câmera para ~90KB-180KB sem perder nitidez
// =========================================================
function compressImageFile(file, maxWidth = 1080, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Nenhum arquivo selecionado'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo de imagem'));
    reader.onload = function(evt) {
      const rawDataUrl = evt.target.result;
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl); // Fallback seguro caso formato não suporte canvas
      img.onload = function() {
        try {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxWidth) {
            if (width >= height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}
window.compressImageFile = compressImageFile;

// Abre a Vitrine Social do Profissional
function openProVitrine(id, asOwner = false) {
  currentVitrinePro = PROFESSIONALS.find(p => p.id === id || p.dbId === id) || (PROFESSIONALS.length > 0 ? PROFESSIONALS[0] : null);
  if (!currentVitrinePro) {
    showToast('Perfil profissional ainda não cadastrado.');
    return;
  }

  // Detecta automaticamente se o usuário logado é o dono deste perfil profissional
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const isLoggedProOwner = Boolean(
    user && (
      (user.id && currentVitrinePro.dbId && user.id === currentVitrinePro.dbId) ||
      (user.proId && user.proId === currentVitrinePro.id) ||
      (user.email && currentVitrinePro.email && user.email.toLowerCase() === currentVitrinePro.email.toLowerCase())
    )
  );

  isVitrineOwner = Boolean(asOwner || isLoggedProOwner);
  currentVitrineTab = 'posts';

  renderVitrineView();
  document.getElementById('pro-vitrine-overlay').classList.add('active');
}

// Compatibilidade com chamadas antigas
function openProDetail(id) {
  openProVitrine(id, false); // Visitante
}

function openProDashboard() {
  const user = getCurrentUser();
  if (user && user.role === 'professional') {
    const myPro = PROFESSIONALS.find(p => p.dbId === user.id || p.id === user.proId || p.id === user.id);
    if (myPro) {
      openProVitrine(myPro.id, true);
    } else {
      openProVitrine(user.id, true);
    }
  } else {
    openProSignup();
  }
}

function closeProVitrine() {
  document.getElementById('pro-vitrine-overlay').classList.remove('active');
}

window.openProVitrine = openProVitrine;
window.openProDetail = openProDetail;
window.openProDashboard = openProDashboard;
window.closeProVitrine = closeProVitrine;

// Alternar entre visão de Visitante e Proprietário
function toggleVitrineMode() {
  isVitrineOwner = !isVitrineOwner;
  renderVitrineView();
  showToast(isVitrineOwner ? '💼 Modo Proprietário ativado (Visualização do Dono)' : '👁️ Modo Visitante ativado (Visualização do Cliente)');
}

// Renderiza todos os blocos da Vitrine Social (Modelo exato ao design de referência)
function renderVitrineView() {
  if (!currentVitrinePro) return;
  const p = currentVitrinePro;

  // 1. Barra Superior
  const handleElem = document.getElementById('vitrine-handle');
  if (handleElem) handleElem.innerText = p.handle || `${p.name.toLowerCase().replace(/\s+/g, '.')}`;

  const menuModeLabel = document.getElementById('menu-mode-label');
  if (menuModeLabel) {
    menuModeLabel.innerText = isVitrineOwner ? 'Alternar para Modo Visitante' : 'Alternar para Modo Proprietário';
  }

  // 2. Avatar e Header Info
  const avatarImg = document.getElementById('vitrine-avatar-img');
  const avatarFallback = document.getElementById('vitrine-avatar-fallback');
  if (avatarImg && avatarFallback) {
    if (p.avatar) {
      avatarImg.src = p.avatar;
      avatarImg.style.display = 'block';
      avatarFallback.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarFallback.style.display = 'flex';
      avatarFallback.innerHTML = '<i class="fa-solid fa-bolt"></i>';
    }
  }

  const nameElem = document.getElementById('vitrine-name');
  if (nameElem) nameElem.innerText = p.name;

  const specialtyElem = document.getElementById('vitrine-specialty');
  if (specialtyElem) specialtyElem.innerText = p.specialty;

  // Métricas: Trabalhos, Avaliações, Nota (4,9 com ⭐)
  const worksElem = document.getElementById('stat-works-count');
  if (worksElem) worksElem.innerText = p.posts ? p.posts.length : (p.worksCount || 0);

  const evalsElem = document.getElementById('stat-reviews-count');
  if (evalsElem) evalsElem.innerText = p.reviewsCount ?? 0;

  const ratingElem = document.getElementById('stat-rating-val');
  if (ratingElem) ratingElem.innerText = p.rating ? p.rating.toFixed(1).replace('.', ',') : '5,0';

  // 3. Bio & Descrição
  const headlineElem = document.getElementById('vitrine-headline-text');
  if (headlineElem) headlineElem.innerText = p.headline || p.specialty || 'Serviços Profissionais';

  const bioElem = document.getElementById('vitrine-bio');
  if (bioElem) bioElem.innerText = p.bio || `Atendimento profissional em toda a cidade de ${p.city || 'Parauapebas'}, ${p.state || 'PA'}.`;

  const locationElem = document.getElementById('vitrine-location-text');
  if (locationElem) locationElem.innerText = p.neighborhood || `${p.city || 'Parauapebas'}, ${p.state || 'PA'}`;

  const expandedBioElem = document.getElementById('vitrine-expanded-bio');
  if (expandedBioElem) {
    expandedBioElem.innerHTML = `<p>${p.bio || ''} Especialista em ${p.headline || p.specialty || 'serviços gerais'} com atendimento em toda a cidade de ${p.city || 'Parauapebas'}, ${p.state || 'PA'}. Solicite orçamento e confira abaixo o portfólio de serviços realizados.</p>`;
  }

  // 4. Botões de Ação (Owner vs Visitor)
  const buttonsContainer = document.getElementById('vitrine-action-buttons');
  if (buttonsContainer) {
    if (isVitrineOwner) {
      buttonsContainer.innerHTML = `
        <button class="v-btn-solid" onclick="openEditProModal()">
          Editar perfil
        </button>
        <button class="v-btn-outline" onclick="shareProProfile()">
          Compartilhar perfil
        </button>
        <button class="v-btn-share-square" onclick="shareProProfile()" title="Compartilhar">
          <i class="fa-solid fa-share-nodes"></i>
        </button>
      `;
    } else {
      const isFav = typeof isProFavorited === 'function' ? isProFavorited(p.id) : false;
      buttonsContainer.innerHTML = `
        <button class="v-btn-solid" onclick="startChatWithPro()">
          Conversar
        </button>
        <button class="v-btn-outline ${isFav ? 'favorited' : ''}" id="btn-vitrine-toggle-fav" onclick="toggleProFavorite('${p.id}')">
          <i class="${isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
          <span>${isFav ? 'Favoritado' : 'Favoritar'}</span>
        </button>
        <button class="v-btn-share-square" onclick="shareProProfile()" title="Compartilhar">
          <i class="fa-solid fa-share-nodes"></i>
        </button>
      `;
    }
  }

  // 4.1 Card dedicado do Proprietário: Publicar Antes & Depois (Showcase Trampou PRO)
  const showcaseBox = document.getElementById('vitrine-owner-showcase-box');
  if (showcaseBox) {
    if (isVitrineOwner) {
      showcaseBox.style.display = 'block';
      showcaseBox.innerHTML = `
        <div class="pro-showcase-action-card" onclick="openPublishShowcaseModal()">
          <div class="pro-showcase-card-left">
            <div class="pro-showcase-card-icon">
              <i class="fa-solid fa-camera-retro"></i>
            </div>
            <div class="pro-showcase-card-texts">
              <div class="pro-showcase-title-row">
                <span class="pro-showcase-card-title">Antes & Depois</span>
                <span class="badge-trampou-pro"><i class="fa-solid fa-crown"></i> PRO</span>
              </div>
              <span class="pro-showcase-card-sub">Destaque na Home • <strong class="text-free-pill">Grátis no lançamento</strong></span>
            </div>
          </div>
          <div class="pro-showcase-card-right">
            <i class="fa-solid fa-chevron-right"></i>
          </div>
        </div>
      `;
    } else {
      showcaseBox.style.display = 'none';
      showcaseBox.innerHTML = '';
    }
  }

  // 5. Card e Badge de Plantão 24h & Emergência
  renderVitrineEmergencyCard();
  updateVitrine24hBadge();

  // 6. Botão Flutuante (FAB) e Botão de Cabeçalho para adicionar trabalhos
  const fabUploadBtn = document.getElementById('vitrine-fab-upload');
  if (fabUploadBtn) {
    fabUploadBtn.style.display = isVitrineOwner ? 'inline-flex' : 'none';
  }
  const headerAddWorkBtn = document.getElementById('btn-header-add-work');
  if (headerAddWorkBtn) {
    headerAddWorkBtn.style.display = isVitrineOwner ? 'inline-flex' : 'none';
  }

  // 7. Grade 3 Colunas de Trabalhos
  renderVitrineWorks();
}

function renderVitrineEmergencyCard() {
  const container = document.getElementById('vitrine-emergency-card');
  if (!container || !currentVitrinePro) return;

  const isAvailable = currentVitrinePro.emergencyAvailable !== false;

  if (isVitrineOwner) {
    container.innerHTML = `
      <div class="emergency-card-discreet">
        <div class="emergency-card-left">
          <div class="emergency-icon-box ${isAvailable ? 'on' : 'off'}">
            <i class="fa-solid fa-clock"></i>
          </div>
          <div class="emergency-card-texts">
            <span class="emergency-card-title">Plantão 24h & Emergência</span>
            <span class="emergency-card-sub ${isAvailable ? 'on' : 'off'}">
              <span class="status-indicator-dot ${isAvailable ? 'dot-active' : 'dot-inactive'}"></span>
              ${isAvailable ? 'Disponível para chamados urgentes' : 'Atendimento em horário comercial'}
            </span>
          </div>
        </div>
        <div class="emergency-card-right">
          <label class="discreet-switch" title="${isAvailable ? 'Desativar plantão 24h' : 'Ativar plantão 24h'}">
            <input type="checkbox" id="vitrine-24h-switch" ${isAvailable ? 'checked' : ''} onchange="toggleVitrine24hAvailability(this.checked)">
            <span class="discreet-slider"></span>
          </label>
        </div>
      </div>
    `;
  } else {
    // Modo Visitante (Cliente vendo o perfil)
    if (isAvailable) {
      container.innerHTML = `
        <div class="emergency-card-discreet visitor">
          <div class="emergency-card-left">
            <div class="emergency-icon-box on">
              <i class="fa-solid fa-bolt"></i>
            </div>
            <div class="emergency-card-texts">
              <span class="emergency-card-title">Atende Emergências 24h</span>
              <span class="emergency-card-sub on">
                <span class="status-indicator-dot dot-active"></span> Disponível agora para socorro rápido
              </span>
            </div>
          </div>
          <div class="emergency-card-right">
            <button type="button" class="btn-emergency-subtle" onclick="startEmergencyCallWithPro()">
              <i class="fa-solid fa-phone"></i> Chamar
            </button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  }
}

function updateVitrine24hBadge() {
  const badge = document.getElementById('vitrine-badge-24h');
  if (!badge || !currentVitrinePro) return;

  const isAvailable = currentVitrinePro.emergencyAvailable !== false;
  if (isAvailable) {
    badge.innerHTML = `<span class="dot-active-tiny"></span> Plantão 24h`;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function toggleVitrine24hAvailability(checked) {
  if (!currentVitrinePro) return;

  currentVitrinePro.emergencyAvailable = checked;
  currentVitrinePro.is24h = checked;

  // Sincroniza checkbox no modal Editar Perfil se ele existir
  const editModalChk = document.getElementById('edit-pro-emergency-available');
  if (editModalChk) {
    editModalChk.checked = checked;
  }

  saveProfessionalsToStorage();
  renderVitrineEmergencyCard();
  updateVitrine24hBadge();

  if (checked) {
    showToast('Plantão 24h ativado.');
  } else {
    showToast('Plantão 24h desativado.');
  }
}

function startEmergencyCallWithPro() {
  if (!currentVitrinePro) return;
  if (typeof openChatWith === 'function') {
    openChatWith(currentVitrinePro.name, `🚨 CHAMADO DE EMERGÊNCIA 24H: ${currentVitrinePro.specialty}`);
  } else if (typeof openRequestModal === 'function') {
    openRequestModal(`🚨 Emergência 24h: ${currentVitrinePro.specialty}`, currentVitrinePro.name);
  }
}

function saveProfessionalsToStorage() {
  try {
    localStorage.setItem('go_all_professionals', JSON.stringify(PROFESSIONALS));
  } catch (e) {
    console.error('Erro ao salvar profissionais no storage:', e);
  }
}

function loadProfessionalsFromStorage() {
  try {
    const saved = localStorage.getItem('go_all_professionals');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Desconsidera e limpa qualquer perfil com ID mockado ('p1' a 'p13')
        const realPros = parsed.filter(p => p && p.dbId && !p.id.startsWith('p'));
        PROFESSIONALS = realPros;
        localStorage.setItem('go_all_professionals', JSON.stringify(realPros));
      }
    }
  } catch (e) {
    console.error('Erro ao carregar profissionais do storage:', e);
  }
}

// Migra automaticamente para o Supabase qualquer foto antiga que estava salva apenas no localStorage do aparelho
let isSyncingLocalPortfolio = false;
async function syncPendingLocalPortfolioToSupabase() {
  if (isSyncingLocalPortfolio || !Array.isArray(PROFESSIONALS)) return;
  isSyncingLocalPortfolio = true;
  try {
    let anySynced = false;
    for (const pro of PROFESSIONALS) {
      if (!pro || !pro.dbId || String(pro.dbId).startsWith('u_')) continue;
      const posts = Array.isArray(pro.posts) ? pro.posts : [];
      for (const post of posts) {
        if (!post || !post.image) continue;
        const isAlreadyInDb = Boolean(post.dbItemId || /^[0-9a-f-]{36}$/i.test(String(post.id)));
        if (isAlreadyInDb) continue;

        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_portfolio_item`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              p_professional_id: pro.dbId,
              p_title: post.title || `Serviço de ${pro.specialty || 'Profissional'}`,
              p_description: post.description || `Serviço executado com qualidade em ${pro.city || 'Parauapebas'}, ${pro.state || 'PA'}.`,
              p_image_url: post.image,
              p_service_category: post.serviceCategory || pro.specialty || 'Serviço Profissional',
              p_city_label: post.neighborhood || `${pro.city || 'Parauapebas'}, ${pro.state || 'PA'}`
            })
          });
          if (res.ok) {
            const newUuid = await res.json();
            if (newUuid && typeof newUuid === 'string') {
              post.id = newUuid;
              post.dbItemId = newUuid;
              anySynced = true;
            }
          }
        } catch (_) {}
      }
    }
    if (anySynced) {
      saveProfessionalsToStorage();
    }
  } finally {
    isSyncingLocalPortfolio = false;
  }
}

async function loadProfessionalsFromSupabase() {
  const statusPills = document.querySelectorAll('.db-status-pill');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?role=eq.professional&select=*,professional_profiles(*),portfolio_items(*)&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (res.ok) {
      const livePros = await res.json();
      const prevLocalPros = (PROFESSIONALS || []).filter(p => p && !String(p.id).startsWith('p'));
      const loadedFromDb = [];
      if (Array.isArray(livePros)) {
        livePros.forEach(lp => {
          // PostgREST 1-to-1 retorna objeto único em vez de array
          const proDetails = Array.isArray(lp.professional_profiles)
            ? (lp.professional_profiles[0] || {})
            : (lp.professional_profiles || {});
          const handle = lp.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.');
          const city = lp.city || 'Parauapebas';
          const state = lp.state || 'PA';
          const lat = (lp.latitude !== null && lp.latitude !== undefined) ? Number(lp.latitude) : null;
          const lng = (lp.longitude !== null && lp.longitude !== undefined) ? Number(lp.longitude) : null;
          const skillsList = Array.isArray(proDetails.skills) ? proDetails.skills.filter(Boolean) : [];
          const serviceCities = Array.isArray(proDetails.service_cities) && proDetails.service_cities.length > 0
            ? proDetails.service_cities
            : [city];

          // Reaproveita fotos/posts locais se o profissional adicionou na vitrine neste aparelho
          const existingLocal = prevLocalPros.find(p => p.dbId === lp.id || (p.email && lp.email && p.email.toLowerCase() === lp.email.toLowerCase()));

          // Carrega as fotos de serviços reais do banco (public.portfolio_items)
          const dbPortfolio = Array.isArray(lp.portfolio_items) ? [...lp.portfolio_items] : [];
          dbPortfolio.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          const mappedDbPosts = dbPortfolio.map(item => ({
            id: item.id,
            dbItemId: item.id,
            title: item.title || 'Serviço Realizado',
            serviceCategory: item.service_category || skillsList[0] || 'Serviço Profissional',
            neighborhood: item.city_label || `${city}, ${state}`,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'Recente',
            image: item.image_url,
            description: item.description || `Serviço executado com qualidade e garantia em ${city}, ${state}.`,
            likes: Number(item.likes_count) || 0
          }));

          // Mescla posts locais ainda não sincronizados sem duplicar os que já vieram do banco
          const localOnlyPosts = (existingLocal && Array.isArray(existingLocal.posts))
            ? existingLocal.posts.filter(pItem =>
                pItem &&
                !mappedDbPosts.some(dbP => dbP.id === pItem.id || dbP.id === pItem.dbItemId || (dbP.title === pItem.title && dbP.image === pItem.image))
              )
            : [];
          const combinedPosts = [...mappedDbPosts, ...localOnlyPosts];

          loadedFromDb.push({
            id: 'db_' + lp.id.slice(0, 8),
            dbId: lp.id,
            handle: handle,
            name: lp.full_name,
            email: lp.email || '',
            phone: lp.phone_whatsapp || '',
            cep: lp.cep || '',
            created_at: lp.created_at || null,
            specialty: skillsList[0] || (existingLocal && existingLocal.specialty) || 'Profissional Autônomo',
            category: skillsList[0] || (existingLocal && existingLocal.category) || 'Profissional Autônomo',
            headline: skillsList.length > 0 ? skillsList.join(' • ') : `Serviços em ${city}, ${state}`,
            neighborhood: `${city}, ${state}`,
            city: city,
            state: state,
            latitude: lat,
            longitude: lng,
            serviceCities: serviceCities,
            rating: Number(lp.rating_average) || 5.0,
            reviewsCount: Number(lp.rating_count) || 0,
            worksCount: combinedPosts.length,
            completedServices: existingLocal ? (existingLocal.completedServices || 0) : 0,
            verified: lp.is_verified ?? true,
            experience: proDetails.years_experience ? `${proDetails.years_experience} anos` : 'Profissional Verificado',
            avatar: lp.avatar_url || (existingLocal && existingLocal.avatar) || 'trampou_app_icon.png',
            bio: lp.bio || (existingLocal && existingLocal.bio) || `Atendimento profissional em toda a cidade de ${city}, ${state}.`,
            servedNeighborhoods: [`Toda a cidade (${city}, ${state})`],
            posts: combinedPosts,
            services: existingLocal && existingLocal.services ? existingLocal.services : []
          });
        });

        // Mantém também qualquer profissional recém-criado localmente que ainda não esteja na lista do banco
        prevLocalPros.forEach(localPro => {
          const alreadyInDb = loadedFromDb.some(d =>
            (localPro.dbId && d.dbId === localPro.dbId) ||
            (localPro.name && d.name.toLowerCase() === localPro.name.toLowerCase())
          );
          if (!alreadyInDb) {
            loadedFromDb.push(localPro);
          }
        });

        PROFESSIONALS = loadedFromDb;
        saveProfessionalsToStorage();

        // Sobe automaticamente para o banco qualquer foto que estava salva apenas no localStorage deste aparelho
        syncPendingLocalPortfolioToSupabase();

        // Se a vitrine de um profissional estiver aberta, atualiza os trabalhos em tempo real
        if (currentVitrinePro) {
          const updatedPro = PROFESSIONALS.find(p => p.id === currentVitrinePro.id || (p.dbId && p.dbId === currentVitrinePro.dbId));
          if (updatedPro) {
            currentVitrinePro = updatedPro;
            const vitrineOverlay = document.getElementById('pro-vitrine-overlay');
            if (vitrineOverlay && vitrineOverlay.classList.contains('active')) {
              renderVitrineView();
            }
          }
        }

        // Atualiza status pill
        statusPills.forEach(pill => {
          pill.classList.remove('offline');
          pill.classList.add('online');
          pill.innerHTML = `<span class="status-dot"></span> Supabase Conectado • ${PROFESSIONALS.length} Pros`;
        });

        // Re-renderiza componentes dependentes
        updatePopularCitiesChips(currentActiveLocation.state);
        if (typeof renderRecommendedProfessionals === 'function') renderRecommendedProfessionals();
        if (typeof renderSearchResults === 'function') renderSearchResults();
        return;
      }
    }
    throw new Error('Falha na resposta do Supabase');
  } catch (err) {
    console.warn('Supabase offline ou modo local:', err.message);
    statusPills.forEach(pill => {
      pill.classList.remove('online');
      pill.innerHTML = `<span class="status-dot"></span> Modo Local • 0 Pros`;
    });
  }
}

// =========================================================
// SINCRONIZAÇÃO EM TEMPO REAL (FULLTIME) COM O SUPABASE DB
// =========================================================
let realtimeSocket = null;
let realtimeHeartbeatTimer = null;
let lastSupabaseSyncAt = 0;

async function triggerRealtimeDbRefresh(force = false) {
  const now = Date.now();
  if (!force && now - lastSupabaseSyncAt < 3000) return;
  lastSupabaseSyncAt = now;
  await loadProfessionalsFromSupabase();
  if (typeof syncCurrentUserProfileFromSupabase === 'function') {
    await syncCurrentUserProfileFromSupabase();
  }
}

function initRealtimeDatabaseSync() {
  // 1. WebSocket Realtime nativo do Supabase para escutar INSERT / UPDATE / DELETE em profiles e professional_profiles
  try {
    const wsUrl = SUPABASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:') +
      `/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;
    realtimeSocket = new WebSocket(wsUrl);

    realtimeSocket.addEventListener('open', () => {
      const joinMsg = {
        topic: 'realtime:public',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: [
              { event: '*', schema: 'public', table: 'profiles' },
              { event: '*', schema: 'public', table: 'professional_profiles' },
              { event: '*', schema: 'public', table: 'portfolio_items' }
            ]
          }
        },
        ref: '1'
      };
      realtimeSocket.send(JSON.stringify(joinMsg));

      if (realtimeHeartbeatTimer) clearInterval(realtimeHeartbeatTimer);
      realtimeHeartbeatTimer = setInterval(() => {
        if (realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) {
          realtimeSocket.send(JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: String(Date.now())
          }));
        }
      }, 25000);
    });

    realtimeSocket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg && (msg.event === 'postgres_changes' || msg.event === 'INSERT' || msg.event === 'UPDATE' || msg.event === 'DELETE')) {
          triggerRealtimeDbRefresh(true);
        }
      } catch (_) {}
    });

    realtimeSocket.addEventListener('close', () => {
      if (realtimeHeartbeatTimer) clearInterval(realtimeHeartbeatTimer);
      setTimeout(initRealtimeDatabaseSync, 8000);
    });
  } catch (err) {
    console.warn('WebSocket Realtime fallback para polling:', err);
  }

  // 2. Sincroniza imediatamente sempre que o usuário volta para o app ou restaura conexão
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      triggerRealtimeDbRefresh(false);
    }
  });
  window.addEventListener('focus', () => triggerRealtimeDbRefresh(false));
  window.addEventListener('online', () => triggerRealtimeDbRefresh(true));

  // 3. Atualização contínua automática em background a cada 25 segundos
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      triggerRealtimeDbRefresh(false);
    }
  }, 25000);
}

function renderVitrineWorks() {
  const container = document.getElementById('vitrine-works-grid');
  if (!container || !currentVitrinePro) return;

  const proCityName = currentVitrinePro.city || currentActiveLocation.city || 'Parauapebas';
  const posts = currentVitrinePro.posts || [];
  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-works-box">
        <div class="empty-works-icon">
          <i class="fa-solid fa-camera"></i>
        </div>
        <div class="empty-works-title">Nenhum trabalho publicado ainda</div>
        <div class="empty-works-desc">Mostre fotos dos seus serviços executados em ${proCityName} para conquistar mais clientes.</div>
        ${isVitrineOwner ? `
          <button class="btn-empty-upload" onclick="triggerAddMediaFlow()">
            <i class="fa-solid fa-plus"></i> Publicar primeira foto
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="pro-work-tile" onclick="openPostDetail('${post.id}')">
      ${post.image ? `
        <img class="pro-work-img" src="${post.image}" alt="${post.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="pro-work-fallback" style="display: none; background: ${post.gradient};">
          <i class="fa-solid ${post.icon || 'fa-bolt'}"></i>
          <span>${post.serviceCategory || post.title}</span>
        </div>
      ` : `
        <div class="pro-work-fallback" style="background: ${post.gradient};">
          <i class="fa-solid ${post.icon || 'fa-bolt'}"></i>
          <span>${post.serviceCategory || post.title}</span>
        </div>
      `}
      <div class="pro-work-tile-overlay">
        <span class="pro-work-badge">${post.serviceCategory || post.title}</span>
      </div>
    </div>
  `).join('');
}

function toggleBioExpand() {
  const extraBio = document.getElementById('vitrine-expanded-bio');
  const btn = document.getElementById('vitrine-readmore-btn');
  if (!extraBio || !btn) return;

  if (extraBio.style.display === 'none' || !extraBio.style.display) {
    extraBio.style.display = 'block';
    btn.innerText = 'Ver menos';
  } else {
    extraBio.style.display = 'none';
    btn.innerText = 'Ver descrição completa';
  }
}

function toggleVitrineMenu() {
  const menu = document.getElementById('vitrine-dropdown-menu');
  if (menu) menu.classList.toggle('active');
}

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
  const menu = document.getElementById('vitrine-dropdown-menu');
  const trigger = document.getElementById('vitrine-menu-trigger');
  if (menu && menu.classList.contains('active')) {
    if (!menu.contains(e.target) && !trigger?.contains(e.target)) {
      menu.classList.remove('active');
    }
  }
});

// Modal Bottom Sheet: Meus Serviços
function openServicesSheet() {
  if (!currentVitrinePro) return;
  const listContainer = document.getElementById('services-sheet-list');
  const actionContainer = document.getElementById('services-sheet-owner-action');

  if (listContainer) {
    listContainer.innerHTML = (currentVitrinePro.services || []).map(s => `
      <div class="service-card-item">
        <div class="service-card-item-info">
          <h5>${s.title}</h5>
          <span>${s.price} <small>(${s.unit || 'por serviço'})</small></span>
        </div>
        ${!isVitrineOwner ? `
          <button class="btn-service-action" onclick="closeServicesSheet(); openRequestModal('${s.title}', '${currentVitrinePro.name}')">
            Solicitar
          </button>
        ` : ''}
      </div>
    `).join('');
  }

  if (actionContainer) {
    actionContainer.innerHTML = isVitrineOwner ? `
      <button class="v-btn-outline" style="width: 100%; height: 40px;" onclick="closeServicesSheet(); openManageServicesModal();">
        <i class="fa-solid fa-plus"></i> Gerenciar Catálogo de Serviços
      </button>
    ` : `
      <button class="v-btn-solid" style="width: 100%; height: 42px;" onclick="closeServicesSheet(); startChatWithPro();">
        <i class="fa-solid fa-comments"></i> Conversar com ${currentVitrinePro.name}
      </button>
    `;
  }

  document.getElementById('services-sheet-overlay').classList.add('active');
}

function closeServicesSheet() {
  document.getElementById('services-sheet-overlay').classList.remove('active');
}

// Modal Avaliações
function openReviewsModal() {
  if (!currentVitrinePro) return;
  const p = currentVitrinePro;
  const summaryBox = document.getElementById('modal-reviews-summary');
  const feedBox = document.getElementById('modal-reviews-list');

  if (summaryBox) {
    summaryBox.innerHTML = `
      <div class="reviews-score-big">
        <i class="fa-solid fa-star text-amber"></i> ${p.rating ? p.rating.toFixed(1).replace('.', ',') : '4,9'}
      </div>
      <div class="reviews-stars-gold">
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
        <i class="fa-solid fa-star"></i>
      </div>
      <div class="reviews-verified-note">
        Baseado em ${p.reviewsCount || 28} avaliações reais de clientes em Parauapebas
      </div>
    `;
  }

  if (feedBox) {
    const reviews = p.reviews || [];
    if (reviews.length === 0) {
      feedBox.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Nenhuma avaliação recente.</div>';
    } else {
      feedBox.innerHTML = reviews.map(rev => `
        <div class="review-feed-card">
          <div class="review-card-header">
            <div class="review-author-info">
              <div class="review-author-avatar">${rev.author[0]}</div>
              <div>
                <div class="review-author-name">${rev.author}</div>
                <span class="review-author-bairro"><i class="fa-solid fa-location-dot"></i> ${rev.neighborhood || 'Parauapebas'}</span>
              </div>
            </div>
            <div>
              <div style="color: #F59E0B; font-size: 11px; text-align: right;">
                ${'★'.repeat(Math.floor(rev.rating || 5))}
              </div>
              <span class="review-date">${rev.date}</span>
            </div>
          </div>
          <p class="review-comment-text">"${rev.comment}"</p>
        </div>
      `).join('');
    }
  }

  document.getElementById('reviews-modal-overlay').classList.add('active');
}

function closeReviewsModal() {
  document.getElementById('reviews-modal-overlay').classList.remove('active');
}

// Ações de Contato
function startChatWithPro() {
  if (!currentVitrinePro) return;
  const pro = currentVitrinePro;
  closeProVitrine();
  switchTab('chat');
  openChatWith(pro.name, pro.specialty, pro.id);
}

function requestQuoteWithPro() {
  if (!currentVitrinePro) return;
  openRequestModal(currentVitrinePro.specialty, currentVitrinePro.name);
}

// =========================================================
// GESTÃO DE PROFISSIONAIS FAVORITOS DO CLIENTE
// =========================================================

function getFavorites() {
  try {
    const raw = localStorage.getItem('go_user_favorites');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function isProFavorited(proId) {
  if (!proId) return false;
  const favs = getFavorites();
  return favs.includes(proId);
}

function toggleProFavorite(proId) {
  if (typeof requireUserAuth === 'function' && !requireUserAuth('favorite')) return false;
  if (!proId) return false;
  let favs = getFavorites();
  const index = favs.indexOf(proId);
  const pro = PROFESSIONALS.find(p => p.id === proId);
  const proName = pro ? pro.name : 'Profissional';
  let added = false;

  if (index >= 0) {
    favs.splice(index, 1);
    added = false;
  } else {
    favs.push(proId);
    added = true;
  }

  localStorage.setItem('go_user_favorites', JSON.stringify(favs));
  
  // Atualiza botão na vitrine aberta
  updateVitrineFavBtn(proId);
  
  // Se modal de favoritos estiver aberto, atualiza lista
  const favModal = document.getElementById('favorites-modal-overlay');
  if (favModal && favModal.classList.contains('active')) {
    renderFavoritesList();
  }

  showToast(added 
    ? `❤️ ${proName} adicionado aos seus favoritos!` 
    : `${proName} removido dos favoritos.`);

  return added;
}

function updateVitrineFavBtn(proId) {
  if (!currentVitrinePro || currentVitrinePro.id !== proId) return;
  const btn = document.getElementById('btn-vitrine-toggle-fav');
  if (!btn) return;

  const isFav = isProFavorited(proId);
  btn.className = `v-btn-outline ${isFav ? 'favorited' : ''}`;
  btn.innerHTML = `
    <i class="${isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
    <span>${isFav ? 'Favoritado' : 'Favoritar'}</span>
  `;
}

function openFavoritesModal() {
  renderFavoritesList();
  const modal = document.getElementById('favorites-modal-overlay');
  if (modal) modal.classList.add('active');
}

function closeFavoritesModal() {
  const modal = document.getElementById('favorites-modal-overlay');
  if (modal) modal.classList.remove('active');
}

function renderFavoritesList() {
  const container = document.getElementById('favorites-list-container');
  const countLabel = document.getElementById('favorites-count-label');
  if (!container) return;

  const favIds = getFavorites();
  const favPros = PROFESSIONALS.filter(p => favIds.includes(p.id));

  if (countLabel) {
    countLabel.textContent = `${favPros.length} ${favPros.length === 1 ? 'profissional salvo' : 'profissionais salvos'}`;
  }

  if (favPros.length === 0) {
    container.innerHTML = `
      <div class="empty-favorites-box">
        <div class="empty-fav-icon">
          <i class="fa-regular fa-heart"></i>
        </div>
        <h4 class="empty-fav-title">Nenhum profissional salvo ainda</h4>
        <p class="empty-fav-desc">Salve seus profissionais de confiança clicando no botão <strong>Favoritar</strong> no perfil deles para encontrá-los facilmente aqui sempre que precisar.</p>
        <button type="button" class="btn-explore-favs" onclick="closeFavoritesModal(); switchTab('search');">
          <i class="fa-solid fa-compass"></i> Explorar Profissionais
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = favPros.map(p => `
    <div class="fav-pro-card">
      <div class="fav-pro-left" onclick="closeFavoritesModal(); openProDetail('${p.id}')">
        <div class="fav-avatar-wrap">
          ${p.avatar 
            ? `<img src="${p.avatar}" alt="${p.name}" class="fav-avatar-img">` 
            : `<div class="fav-avatar-fallback">${(p.name || 'P')[0]}</div>`
          }
          ${p.verified ? '<i class="fa-solid fa-circle-check fav-verified"></i>' : ''}
        </div>
        <div class="fav-pro-info">
          <div class="fav-name-row">
            <h5>${p.name}</h5>
            ${p.emergencyAvailable !== false ? '<span class="fav-badge-24h">24h</span>' : ''}
          </div>
          <span class="fav-specialty">${p.specialty}</span>
          <div class="fav-meta-row">
            <span class="fav-rating"><i class="fa-solid fa-star"></i> ${p.rating ? p.rating.toFixed(1).replace('.', ',') : '5,0'}</span>
            <span class="fav-dot-sep">•</span>
            <span class="fav-location"><i class="fa-solid fa-location-dot"></i> ${p.neighborhood || 'Parauapebas, PA'}</span>
          </div>
        </div>
      </div>
      <div class="fav-pro-actions">
        <button type="button" class="btn-fav-chat" onclick="closeFavoritesModal(); openChatWith('${p.name}', '${p.specialty}', '${p.id}')" title="Conversar com ${p.name}">
          <i class="fa-solid fa-comments"></i>
        </button>
        <button type="button" class="btn-fav-remove" onclick="toggleProFavorite('${p.id}')" title="Remover dos favoritos">
          <i class="fa-solid fa-heart"></i>
        </button>
      </div>
    </div>
  `).join('');
}

window.getFavorites = getFavorites;
window.isProFavorited = isProFavorited;
window.toggleProFavorite = toggleProFavorite;
window.openFavoritesModal = openFavoritesModal;
window.closeFavoritesModal = closeFavoritesModal;
window.renderFavoritesList = renderFavoritesList;

// =========================================================
// SISTEMA DE COMPARTILHAMENTO VIRAL & RECOMENDAÇÕES (WHATSAPP + QR CODE)
// =========================================================
let activeShareData = {
  url: '',
  message: '',
  title: '',
  qrUrl: '',
  pro: null,
  mode: 'recommender'
};

let activePostReviewData = {
  proName: '',
  specialty: '',
  url: '',
  message: ''
};

function shareProProfile() {
  const mode = isVitrineOwner ? 'owner' : 'recommender';
  openShareProModal(currentVitrinePro, mode);
}

function openShareProModal(proOrId, mode) {
  let p = null;
  if (proOrId && typeof proOrId === 'object') {
    p = proOrId;
  } else if (typeof proOrId === 'string') {
    p = PROFESSIONALS.find(item => item.id === proOrId);
  } else if (currentVitrinePro) {
    p = currentVitrinePro;
  } else if (PROFESSIONALS.length > 0) {
    p = PROFESSIONALS[0];
  }

  // Se o modo não foi forçado, detecta se o usuário é o dono da vitrine
  let shareMode = mode;
  if (!shareMode) {
    if (isVitrineOwner && currentVitrinePro && p && currentVitrinePro.id === p.id) {
      shareMode = 'owner';
    } else {
      shareMode = 'recommender';
    }
  }

  const modal = document.getElementById('share-pro-modal-overlay');
  if (!modal) return;

  const modalTitle = document.getElementById('share-modal-title');
  const bannerText = document.getElementById('share-banner-text');
  const bannerIcon = document.getElementById('share-banner-icon');
  const proNameElem = document.getElementById('share-pro-name');
  const proSpecialtyElem = document.getElementById('share-pro-specialty');
  const pro24hBadge = document.getElementById('share-pro-24h-badge');
  const ratingVal = document.getElementById('share-rating-val');
  const reviewsCnt = document.getElementById('share-reviews-cnt');
  const proLoc = document.getElementById('share-pro-loc');
  const avatarImg = document.getElementById('share-avatar-img');
  const avatarFallback = document.getElementById('share-avatar-fallback');
  const waTitle = document.getElementById('share-whatsapp-title');
  const waSub = document.getElementById('share-whatsapp-sub');
  const linkInput = document.getElementById('share-link-input');
  const qrImage = document.getElementById('share-qrcode-image');

  let handle = p ? (p.handle || (p.name ? p.name.toLowerCase().replace(/\s+/g, '.') : 'pro')) : 'trampou';
  let targetUrl = `${OFFICIAL_APP_URL}/#pro/${p ? (p.id || handle) : handle}`;
  let shareTitle = '';
  let shareMsg = '';

  if (shareMode === 'app') {
    targetUrl = `${OFFICIAL_APP_URL}/`;
    shareTitle = 'Indicar o Trampou';
    shareMsg = `Vizinhos e amigos de Parauapebas, estou usando o Trampou para encontrar os melhores profissionais e serviços de confiança da nossa cidade (eletricistas, encanadores, pintores, diaristas e plantão 24h). Vale muito a pena conhecer: ${targetUrl}`;
    
    if (modalTitle) modalTitle.innerText = 'Indicar o App Trampou';
    if (bannerText) bannerText.innerText = 'Convide amigos, familiares e vizinhos de Parauapebas para conhecer os serviços da cidade.';
    if (bannerIcon) bannerIcon.className = 'fa-solid fa-users';

    if (proNameElem) proNameElem.innerText = 'Trampou';
    if (proSpecialtyElem) proSpecialtyElem.innerText = 'App Oficial da Cidade';
    if (pro24hBadge) pro24hBadge.style.display = 'inline-flex';
    if (ratingVal) ratingVal.innerText = '4.9';
    if (reviewsCnt) reviewsCnt.innerText = '1.2k+';
    if (proLoc) proLoc.innerText = 'Parauapebas, PA';
    if (avatarImg) {
      avatarImg.src = 'trampou_app_icon.png';
      avatarImg.style.display = 'block';
    }
    if (avatarFallback) {
      avatarFallback.style.display = 'none';
    }
    if (waTitle) waTitle.innerText = 'Compartilhar nos Grupos do WhatsApp';
    if (waSub) waSub.innerText = 'Mensagem pronta para condomínio, vizinhos e amigos';
  } else if (shareMode === 'owner' && p) {
    shareTitle = `Minha Vitrine: ${p.name}`;
    shareMsg = `Olá! Aqui é ${p.name} (${p.specialty}) em Parauapebas. Conheça meu perfil profissional oficial com fotos de serviços recentes, avaliações verificadas de clientes e solicite orçamentos direto pelo link: ${targetUrl}`;

    if (modalTitle) modalTitle.innerText = 'Compartilhar Minha Vitrine';
    if (bannerText) bannerText.innerText = 'Envie seu cartão digital para clientes e contatos no WhatsApp. Eles verão suas fotos, avaliações e poderão te chamar direto!';
    if (bannerIcon) bannerIcon.className = 'fa-solid fa-id-card';

    if (proNameElem) proNameElem.innerText = p.name;
    if (proSpecialtyElem) proSpecialtyElem.innerText = p.specialty;
    if (pro24hBadge) pro24hBadge.style.display = (p.is24h || p.emergencyAvailable) ? 'inline-flex' : 'none';
    if (ratingVal) ratingVal.innerText = (p.rating || 5.0).toFixed(1);
    if (reviewsCnt) reviewsCnt.innerText = p.reviewsCount || 28;
    if (proLoc) proLoc.innerText = p.neighborhood || 'Parauapebas, PA';

    if (p.avatar && avatarImg) {
      avatarImg.src = p.avatar;
      avatarImg.style.display = 'block';
      if (avatarFallback) avatarFallback.style.display = 'none';
    } else if (avatarFallback) {
      avatarFallback.innerText = (p.name || 'P')[0].toUpperCase();
      avatarFallback.style.display = 'flex';
      if (avatarImg) avatarImg.style.display = 'none';
    }

    if (waTitle) waTitle.innerText = 'Enviar Minha Vitrine no WhatsApp';
    if (waSub) waSub.innerText = 'Apresente seus trabalhos para clientes e contatos';
  } else {
    // Modo Recomendador (Cliente indicando o profissional)
    const proName = p ? p.name : 'Profissional';
    const proSpec = p ? p.specialty : 'Serviços';
    shareTitle = `Recomendação: ${proName}`;
    shareMsg = `Oi vizinhos(as)! Fiz um serviço com o(a) ${proName} (${proSpec}) aqui em Parauapebas e recomendo muito! Muito caprichoso(a), pontual e de confiança. Dá uma olhada nas fotos dos serviços e avaliações dele(a) aqui no Trampou: ${targetUrl}`;

    if (modalTitle) modalTitle.innerText = 'Recomendar Profissional';
    if (bannerText) bannerText.innerText = 'Recomende este profissional para familiares, amigos e grupos de vizinhos de condomínio em Parauapebas!';
    if (bannerIcon) bannerIcon.className = 'fa-solid fa-heart';

    if (p) {
      if (proNameElem) proNameElem.innerText = p.name;
      if (proSpecialtyElem) proSpecialtyElem.innerText = p.specialty;
      if (pro24hBadge) pro24hBadge.style.display = (p.is24h || p.emergencyAvailable) ? 'inline-flex' : 'none';
      if (ratingVal) ratingVal.innerText = (p.rating || 5.0).toFixed(1);
      if (reviewsCnt) reviewsCnt.innerText = p.reviewsCount || 28;
      if (proLoc) proLoc.innerText = p.neighborhood || 'Parauapebas, PA';

      if (p.avatar && avatarImg) {
        avatarImg.src = p.avatar;
        avatarImg.style.display = 'block';
        if (avatarFallback) avatarFallback.style.display = 'none';
      } else if (avatarFallback) {
        avatarFallback.innerText = (p.name || 'P')[0].toUpperCase();
        avatarFallback.style.display = 'flex';
        if (avatarImg) avatarImg.style.display = 'none';
      }
    }

    if (waTitle) waTitle.innerText = 'Recomendar no WhatsApp dos Vizinhos';
    if (waSub) waSub.innerText = 'Mensagem com recomendação e link direto';
  }

  // Gera o QR Code de alta fidelidade
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&format=png&data=${encodeURIComponent(targetUrl)}`;
  if (qrImage) qrImage.src = qrUrl;

  if (linkInput) linkInput.value = targetUrl;

  activeShareData = {
    url: targetUrl,
    message: shareMsg,
    title: shareTitle,
    qrUrl: qrUrl,
    pro: p,
    mode: shareMode
  };

  // Reseta estado do botão copiar
  const labelCopy = document.getElementById('label-copy-link');
  const iconCopy = document.getElementById('icon-copy-link');
  const btnCopy = document.getElementById('btn-copy-pro-link');
  if (labelCopy) labelCopy.innerText = 'Copiar';
  if (iconCopy) iconCopy.className = 'fa-regular fa-copy';
  if (btnCopy) btnCopy.classList.remove('copied');

  // Garante que o QR code comece recolhido
  const qrBody = document.getElementById('share-qrcode-body');
  const iconQr = document.getElementById('icon-toggle-qrcode');
  if (qrBody) qrBody.style.display = 'none';
  if (iconQr) iconQr.className = 'fa-solid fa-chevron-down';

  modal.classList.add('active');
}

function closeShareProModal() {
  const modal = document.getElementById('share-pro-modal-overlay');
  if (modal) modal.classList.remove('active');
}

function shareProViaWhatsApp() {
  if (!activeShareData.message) return;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(activeShareData.message)}`;
  window.open(waUrl, '_blank');
}

function copyProShareLink() {
  if (!activeShareData.url) return;
  const link = activeShareData.url;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      onProLinkCopied();
    }).catch(() => {
      fallbackCopy(link);
    });
  } else {
    fallbackCopy(link);
  }
}

function onProLinkCopied() {
  const labelCopy = document.getElementById('label-copy-link');
  const iconCopy = document.getElementById('icon-copy-link');
  const btnCopy = document.getElementById('btn-copy-pro-link');
  if (labelCopy) labelCopy.innerText = 'Copiado!';
  if (iconCopy) iconCopy.className = 'fa-solid fa-check';
  if (btnCopy) btnCopy.classList.add('copied');

  showToast('🔗 Link copiado para a área de transferência!');

  setTimeout(() => {
    if (labelCopy) labelCopy.innerText = 'Copiar';
    if (iconCopy) iconCopy.className = 'fa-regular fa-copy';
    if (btnCopy) btnCopy.classList.remove('copied');
  }, 2200);
}

function fallbackCopy(text) {
  const input = document.getElementById('share-link-input');
  if (input) {
    input.select();
    input.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      onProLinkCopied();
      return;
    } catch (e) {}
  }
  showToast('🔗 Link pronto para copiar!');
}

function toggleShareQrCode() {
  const qrBody = document.getElementById('share-qrcode-body');
  const icon = document.getElementById('icon-toggle-qrcode');
  if (!qrBody) return;
  const isHidden = qrBody.style.display === 'none';
  qrBody.style.display = isHidden ? 'block' : 'none';
  if (icon) {
    icon.className = isHidden ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
  }
}

function downloadProQrCode() {
  if (!activeShareData.qrUrl) return;
  window.open(activeShareData.qrUrl, '_blank');
  showToast('Abrindo imagem do QR Code para salvar/imprimir...');
}

function shareProViaNative() {
  if (navigator.share) {
    navigator.share({
      title: activeShareData.title || 'Trampou',
      text: activeShareData.message,
      url: activeShareData.url
    }).catch(err => {
      console.log('Compartilhamento cancelado ou não suportado:', err);
    });
  } else {
    copyProShareLink();
  }
}

function openShareAppModal() {
  openShareProModal(null, 'app');
}

// -------------------------------------------------------------
// CELEBRAÇÃO PÓS-AVALIAÇÃO VERIFICADA
// -------------------------------------------------------------
function openPostReviewShare(proName, specialty, proId, comment, rating) {
  const modal = document.getElementById('post-review-celebration-modal');
  if (!modal) return;

  const targetProName = proName || 'o profissional';
  const targetSpec = specialty || 'Serviços';
  const handle = targetProName.toLowerCase().replace(/\s+/g, '.');
  const proUrl = `${OFFICIAL_APP_URL}/#pro/${proId || handle}`;

  const quoteElem = document.getElementById('celeb-quote-text');
  if (quoteElem) {
    quoteElem.innerText = comment ? `"${comment}"` : `"Excelente atendimento com ${targetProName}! Trabalho de qualidade e muito capricho."`;
  }

  const nameElem = document.getElementById('celeb-pro-name');
  if (nameElem) nameElem.innerText = targetProName;

  const shareMsg = `Oi vizinhos(as)! Acabei de avaliar o serviço de ${targetProName} (${targetSpec}) aqui em Parauapebas com ${rating || 5} estrelas ⭐. Trabalho excelente, recomendo com confiança! Veja o perfil dele(a) no Trampou: ${proUrl}`;

  activePostReviewData = {
    proName: targetProName,
    specialty: targetSpec,
    url: proUrl,
    message: shareMsg
  };

  const labelCopy = document.getElementById('label-celeb-copy');
  if (labelCopy) labelCopy.innerText = 'Copiar Link de Recomendação';

  modal.classList.add('active');
}

function closePostReviewCelebration() {
  const modal = document.getElementById('post-review-celebration-modal');
  if (modal) modal.classList.remove('active');
}

function recommendPostReviewViaWhatsApp() {
  if (!activePostReviewData.message) return;
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(activePostReviewData.message)}`;
  window.open(waUrl, '_blank');
}

function copyPostReviewShareLink() {
  if (!activePostReviewData.url) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(activePostReviewData.url);
  }
  const labelCopy = document.getElementById('label-celeb-copy');
  if (labelCopy) labelCopy.innerText = 'Link Copiado!';
  showToast('🔗 Link de recomendação copiado!');
  setTimeout(() => {
    if (labelCopy) labelCopy.innerText = 'Copiar Link de Recomendação';
  }, 2000);
}

window.shareProProfile = shareProProfile;
window.openShareProModal = openShareProModal;
window.closeShareProModal = closeShareProModal;
window.shareProViaWhatsApp = shareProViaWhatsApp;
window.copyProShareLink = copyProShareLink;
window.toggleShareQrCode = toggleShareQrCode;
window.downloadProQrCode = downloadProQrCode;
window.shareProViaNative = shareProViaNative;
window.openShareAppModal = openShareAppModal;
window.openPostReviewShare = openPostReviewShare;
window.closePostReviewCelebration = closePostReviewCelebration;
window.recommendPostReviewViaWhatsApp = recommendPostReviewViaWhatsApp;
window.copyPostReviewShareLink = copyPostReviewShareLink;

// =========================================================
// =========================================================
// SISTEMA DE CURTIDAS DOS SERVIÇOS/POSTS
// =========================================================
function getLikedPosts() {
  try {
    const raw = localStorage.getItem('go_liked_posts');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function isPostLiked(postId) {
  if (!postId) return false;
  return getLikedPosts().includes(postId);
}

function togglePostLike(postId) {
  if (typeof requireUserAuth === 'function' && !requireUserAuth('like')) return;
  if (!postId || !currentVitrinePro) return;
  const post = currentVitrinePro.posts.find(p => p.id === postId);
  if (!post) return;

  let likedPosts = getLikedPosts();
  const isLiked = likedPosts.includes(postId);
  const delta = isLiked ? -1 : 1;

  if (isLiked) {
    likedPosts = likedPosts.filter(id => id !== postId);
    post.likes = Math.max(0, (post.likes || 1) - 1);
    showToast('Curtida removida.');
  } else {
    likedPosts.push(postId);
    post.likes = (post.likes || 0) + 1;
    animateHeartPop(postId);
    showToast('❤️ Você curtiu este serviço!');
  }

  localStorage.setItem('go_liked_posts', JSON.stringify(likedPosts));
  saveProfessionalsToStorage();
  updatePostDetailLikeUI(post);

  // Sincroniza curtida no banco de dados se o post tiver ID UUID do Supabase
  const targetDbItemId = post.dbItemId || (/^[0-9a-f-]{36}$/i.test(String(post.id)) ? post.id : null);
  if (targetDbItemId) {
    fetch(`${SUPABASE_URL}/rest/v1/rpc/like_portfolio_item`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ p_item_id: targetDbItemId, p_delta: delta })
    }).catch(() => {});
  }
}

function updatePostDetailLikeUI(post) {
  const isLiked = isPostLiked(post.id);
  const btn = document.getElementById(`btn-like-${post.id}`);
  if (btn) {
    btn.className = `post-act-btn ${isLiked ? 'liked' : ''}`;
    btn.innerHTML = `
      <i class="${isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
    `;
    btn.setAttribute('title', isLiked ? 'Descurtir' : 'Curtir');
  }

  const label = document.getElementById(`post-likes-label-${post.id}`);
  if (label) {
    const count = post.likes || 0;
    label.innerHTML = `
      <i class="fa-solid fa-heart" style="color: #EF4444; font-size: 13px;"></i>
      <span><strong>${count}</strong> ${count === 1 ? 'curtida' : 'curtidas'}</span>
    `;
  }
}

let lastPhotoTapTime = 0;
function handlePostPhotoTap(postId) {
  const now = Date.now();
  if (now - lastPhotoTapTime < 350) {
    // Toque duplo (Double Tap estilo Instagram)
    if (!isPostLiked(postId)) {
      togglePostLike(postId);
    } else {
      animateHeartPop(postId);
    }
    lastPhotoTapTime = 0;
  } else {
    lastPhotoTapTime = now;
  }
}

function animateHeartPop(postId) {
  const heartElem = document.getElementById(`dt-heart-${postId}`);
  if (!heartElem) return;
  heartElem.classList.remove('pop');
  void heartElem.offsetWidth;
  heartElem.classList.add('pop');
  setTimeout(() => {
    heartElem.classList.remove('pop');
  }, 700);
}

function shareServicePost(postId) {
  if (!currentVitrinePro) return;
  const post = currentVitrinePro.posts.find(p => p.id === postId);
  const title = post ? post.title : 'Serviço';
  const url = `${OFFICIAL_APP_URL}/#post/${postId}`;
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    showToast(`🔗 Link do serviço "${title}" copiado com sucesso!`);
  } else {
    showToast(`Link de "${title}" compartilhado!`);
  }
}

function requestThisService(postId) {
  if (!currentVitrinePro) return;
  const post = currentVitrinePro.posts.find(p => p.id === postId);
  const pro = currentVitrinePro;

  // 1. Fecha o visualizador do post e a vitrine do profissional
  closePostDetail();
  closeProVitrine();

  // 2. Alterna para a aba de conversas
  switchTab('chat');

  // 3. Abre conversa no chat com o profissional
  openChatWith(pro.name, pro.specialty, pro.id);

  // 4. Insere a referência ao serviço diretamente no input do chat
  const chatInput = document.getElementById('chat-input');
  if (chatInput && post) {
    chatInput.value = `Olá ${pro.name}! Vi seu serviço "${post.title}" na sua vitrine do Trampou e gostaria de solicitar um orçamento similar.`;
    setTimeout(() => {
      chatInput.focus();
    }, 150);
  }
}

// =========================================================
// MODAL: VISUALIZAÇÃO INDIVIDUAL DO POST (POST DETAIL)
// =========================================================
function openPostDetail(postId) {
  if (!currentVitrinePro) return;
  const post = currentVitrinePro.posts.find(p => p.id === postId);
  if (!post) return;

  const pro = currentVitrinePro;
  const isLiked = isPostLiked(post.id);
  const likesCount = post.likes || 0;

  // 1. Barra Superior com dados do profissional
  const proInfoContainer = document.getElementById('post-viewer-pro-info');
  if (proInfoContainer) {
    proInfoContainer.innerHTML = `
      ${pro.avatar 
        ? `<img src="${pro.avatar}" alt="${pro.name}" class="post-viewer-avatar">` 
        : `<div class="post-viewer-fallback-avatar">${(pro.name || 'P')[0]}</div>`
      }
      <div class="post-viewer-name-box">
        <span class="post-viewer-name">${pro.name} <i class="fa-solid fa-circle-check" style="color: #7C3AED; font-size: 11px;"></i></span>
        <span class="post-viewer-sub">@${pro.handle || pro.name.toLowerCase().replace(/\s+/g, '.')} • ${post.neighborhood || pro.neighborhood || 'Parauapebas, PA'}</span>
      </div>
    `;
  }

  // 2. Ações do dono (excluir) ou compartilhar
  const ownerActions = document.getElementById('post-owner-actions');
  if (ownerActions) {
    ownerActions.innerHTML = isVitrineOwner ? `
      <button class="v-nav-icon-btn" style="color: #EF4444;" title="Excluir Publicação" onclick="deletePost('${post.id}')">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    ` : `
      <button class="v-nav-icon-btn" title="Compartilhar" onclick="shareServicePost('${post.id}')">
        <i class="fa-solid fa-share-nodes"></i>
      </button>
    `;
  }

  // 3. Corpo rolável com Foto Ampliada, Ações de Curtir, Legenda e Descrição
  const body = document.getElementById('post-detail-body');
  body.innerHTML = `
    <!-- Foto Ampliada com suporte a toque duplo para curtir -->
    <div class="post-hero-image-wrap" onclick="handlePostPhotoTap('${post.id}')">
      ${post.image ? `
        <img class="post-hero-full-img" src="${post.image}" alt="${post.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
        <div class="post-hero-fallback-visual" style="display: none; background: ${post.gradient || 'linear-gradient(135deg, #1e293b, #334155)'};">
          <i class="fa-solid ${post.icon || 'fa-bolt'}"></i>
          <span>${post.serviceCategory || post.title}</span>
        </div>
      ` : `
        <div class="post-hero-fallback-visual" style="background: ${post.gradient || 'linear-gradient(135deg, #1e293b, #334155)'};">
          <i class="fa-solid ${post.icon || 'fa-bolt'}"></i>
          <span>${post.serviceCategory || post.title}</span>
        </div>
      `}
      <div class="post-double-tap-heart" id="dt-heart-${post.id}">
        <i class="fa-solid fa-heart"></i>
      </div>
      <span class="post-img-category-pill">
        <i class="fa-solid ${post.icon || 'fa-bolt'}"></i> ${post.serviceCategory || post.title}
      </span>
    </div>

    <!-- Barra de Curtidas e Interação -->
    <div class="post-interaction-bar">
      <div class="post-interaction-left">
        <button type="button" class="post-act-btn ${isLiked ? 'liked' : ''}" id="btn-like-${post.id}" onclick="togglePostLike('${post.id}')" title="${isLiked ? 'Descurtir' : 'Curtir'}">
          <i class="${isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}"></i>
        </button>
        <button type="button" class="post-act-btn" onclick="shareServicePost('${post.id}')" title="Compartilhar">
          <i class="fa-regular fa-paper-plane"></i>
        </button>
      </div>
      <span style="font-size: 11px; color: #64748B;"><i class="fa-regular fa-clock"></i> ${post.date || 'Recente'}</span>
    </div>

    <!-- Contador de Curtidas -->
    <div class="post-likes-count-row" id="post-likes-label-${post.id}">
      <i class="fa-solid fa-heart" style="color: #EF4444; font-size: 13px;"></i>
      <span><strong>${likesCount}</strong> ${likesCount === 1 ? 'curtida' : 'curtidas'}</span>
    </div>

    <!-- Legenda (Título) e Tags do Serviço -->
    <div class="post-info-box">
      <h3 class="post-service-title">${post.title}</h3>
      <div class="post-meta-chips-row">
        <span class="post-meta-chip"><i class="fa-solid fa-tag"></i> ${post.serviceCategory || 'Serviço'}</span>
        <span class="post-meta-chip"><i class="fa-solid fa-location-dot"></i> ${post.neighborhood || 'Parauapebas, PA'}</span>
        <span class="post-meta-chip"><i class="fa-regular fa-calendar-check"></i> Executado por ${pro.name}</span>
      </div>

      <!-- Descrição Detalhada do Serviço -->
      <div class="post-desc-container">
        <div class="post-desc-label">
          <i class="fa-solid fa-circle-info"></i> Descrição do Serviço
        </div>
        <p class="post-desc-text">${post.description}</p>
      </div>
    </div>

    <!-- Botão de Ação / Solicitar Serviço -->
    <div class="post-cta-wrap">
      ${!isVitrineOwner ? `
        <button type="button" class="btn-request-service" onclick="requestThisService('${post.id}')">
          <i class="fa-solid fa-comments"></i> Solicitar este serviço com ${pro.name}
        </button>
      ` : `
        <button type="button" class="v-btn-outline" style="width: 100%; height: 42px;" onclick="shareServicePost('${post.id}')">
          <i class="fa-solid fa-share-nodes"></i> Compartilhar com clientes
        </button>
      `}
    </div>
  `;

  document.getElementById('post-detail-overlay').classList.add('active');
}

function closePostDetail() {
  document.getElementById('post-detail-overlay').classList.remove('active');
}

async function deletePost(postId) {
  if (!currentVitrinePro) return;
  const postToDelete = (currentVitrinePro.posts || []).find(p => p.id === postId);
  currentVitrinePro.posts = (currentVitrinePro.posts || []).filter(p => p.id !== postId);
  currentVitrinePro.worksCount = currentVitrinePro.posts.length;
  saveProfessionalsToStorage();

  // Remove também do banco de dados Supabase (public.portfolio_items)
  const targetDbItemId = (postToDelete && postToDelete.dbItemId) || (/^[0-9a-f-]{36}$/i.test(String(postId)) ? postId : null);
  const proDbId = currentVitrinePro.dbId || null;
  if (targetDbItemId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_portfolio_item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_item_id: targetDbItemId,
          p_professional_id: proDbId
        })
      });
    } catch (e) {
      console.warn('Erro ao remover foto do Supabase:', e);
    }
  }

  closePostDetail();
  renderVitrineView();
  showToast('Publicação excluída da sua vitrine com sucesso.');
}

window.getLikedPosts = getLikedPosts;
window.isPostLiked = isPostLiked;
window.togglePostLike = togglePostLike;
window.handlePostPhotoTap = handlePostPhotoTap;
window.animateHeartPop = animateHeartPop;
window.shareServicePost = shareServicePost;
window.requestThisService = requestThisService;
window.openPostDetail = openPostDetail;
window.closePostDetail = closePostDetail;
window.deletePost = deletePost;

// =========================================================
// =========================================================
// FLUXO DE PUBLICAÇÃO ESTILO INSTAGRAM (DONO DO PERFIL)
// 1. Clica no botão '+' ou 'Nova publicação' -> Abre a galeria de fotos
// 2. Seleciona a foto -> Abre o modal de visualização, título e descrição
// =========================================================
let selectedCustomImage = null;

// Dispara a abertura imediata da galeria ou câmera nativa (estilo Instagram)
function triggerAddMediaFlow() {
  const fileInput = document.getElementById('portfolio-fab-file-input');
  if (fileInput) {
    fileInput.value = ''; // Limpa para permitir selecionar a mesma foto novamente
    fileInput.click();
  } else {
    openCreatePostModal();
  }
}
window.triggerAddMediaFlow = triggerAddMediaFlow;

// Manipula a foto selecionada na galeria, comprime com alta nitidez e abre o modal de publicação
async function handleMediaSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    selectedCustomImage = await compressImageFile(file, 1080, 0.82);
    openCreatePostModal(selectedCustomImage);
    showToast('📸 Foto carregada e otimizada! Adicione o título e descrição do serviço.');
  } catch (err) {
    console.warn('Erro ao processar imagem selecionada:', err);
    showToast('Não foi possível carregar esta foto. Tente outra imagem.');
  }
}
window.handleMediaSelected = handleMediaSelected;

// Abre o modal de publicação já com a foto em destaque
function openCreatePostModal(imageUrl = null) {
  if (!currentVitrinePro) return;

  if (imageUrl) {
    selectedCustomImage = imageUrl;
  }

  // Preenche opções de serviços do profissional
  const select = document.getElementById('new-post-service-select');
  if (select) {
    const services = currentVitrinePro.services || [];
    if (services.length > 0) {
      select.innerHTML = services.map(s => `<option value="${s.title}">${s.title}</option>`).join('');
    } else {
      select.innerHTML = `<option value="${currentVitrinePro.specialty || 'Serviço Geral'}">${currentVitrinePro.specialty || 'Serviço Geral'}</option>`;
    }
  }

  // Atualiza palco da imagem selecionada
  const postImg = document.getElementById('instagram-post-img');
  const postFallback = document.getElementById('instagram-post-fallback');
  if (selectedCustomImage) {
    if (postImg) {
      postImg.src = selectedCustomImage;
      postImg.style.display = 'block';
    }
    if (postFallback) {
      postFallback.style.display = 'none';
    }
  } else {
    if (postImg) postImg.style.display = 'none';
    if (postFallback) postFallback.style.display = 'flex';
  }

  // Reseta campos de texto para nova postagem
  const titleInput = document.getElementById('new-post-title');
  const descInput = document.getElementById('new-post-desc');
  if (titleInput) titleInput.value = '';
  if (descInput) descInput.value = '';

  const overlay = document.getElementById('create-post-overlay');
  if (overlay) overlay.classList.add('active');

  // Foco no campo de título
  setTimeout(() => {
    if (titleInput) titleInput.focus();
  }, 150);
}
window.openCreatePostModal = openCreatePostModal;

function closeCreatePostModal() {
  const overlay = document.getElementById('create-post-overlay');
  if (overlay) overlay.classList.remove('active');
}
window.closeCreatePostModal = closeCreatePostModal;

// Salva e publica a mídia na vitrine e sincroniza em tempo real no Supabase (public.portfolio_items)
async function submitNewPost() {
  const titleInput = document.getElementById('new-post-title');
  const title = titleInput ? titleInput.value.trim() : '';
  const service = document.getElementById('new-post-service-select')?.value || (currentVitrinePro && currentVitrinePro.specialty) || 'Serviço Profissional';
  const proLoc = currentVitrinePro
    ? `${currentVitrinePro.city || currentActiveLocation.city || 'Parauapebas'}, ${currentVitrinePro.state || currentActiveLocation.state || 'PA'}`
    : `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
  const desc = document.getElementById('new-post-desc')?.value.trim() || '';

  if (!selectedCustomImage) {
    showToast('Selecione uma foto para publicar no seu portfólio.');
    triggerAddMediaFlow();
    return;
  }

  if (!title) {
    showToast('Informe um título para o serviço executado.');
    if (titleInput) titleInput.focus();
    return;
  }

  const finalDescription = desc || `Serviço executado com qualidade e garantia em ${proLoc}.`;
  const tempId = 'post_' + Date.now();
  const newPost = {
    id: tempId,
    dbItemId: null,
    title: title,
    serviceCategory: service,
    neighborhood: proLoc,
    date: 'Agora mesmo',
    image: selectedCustomImage,
    description: finalDescription,
    likes: 0
  };

  if (!currentVitrinePro.posts) {
    currentVitrinePro.posts = [];
  }
  currentVitrinePro.posts.unshift(newPost);
  currentVitrinePro.worksCount = currentVitrinePro.posts.length;

  saveProfessionalsToStorage();
  closeCreatePostModal();
  renderVitrineView();

  // Grava imediatamente no banco Supabase (public.portfolio_items) para todos os clientes verem
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const targetProDbId = (currentVitrinePro && currentVitrinePro.dbId) ||
    (user && user.id && !String(user.id).startsWith('u_') ? user.id : null);

  if (targetProDbId) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_portfolio_item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_professional_id: targetProDbId,
          p_title: title,
          p_description: finalDescription,
          p_image_url: selectedCustomImage,
          p_service_category: service,
          p_city_label: proLoc
        })
      });
      if (res.ok) {
        const savedUuid = await res.json();
        if (savedUuid && typeof savedUuid === 'string') {
          newPost.id = savedUuid;
          newPost.dbItemId = savedUuid;
          saveProfessionalsToStorage();
          renderVitrineView();
        }
      }
    } catch (err) {
      console.warn('Erro ao salvar publicação no Supabase:', err);
    }
  }

  selectedCustomImage = null;
  showToast('✨ Foto do serviço publicada e sincronizada com sucesso!');
}

// =========================================================
// MODAL: EDITAR PERFIL (DONO)
// =========================================================
let pendingEditProAvatar = null;

async function handleEditProAvatarSelect(input) {
  if (!input.files || !input.files[0]) return;
  try {
    const compressed = await compressImageFile(input.files[0], 420, 0.84);
    pendingEditProAvatar = compressed;
    const preview = document.getElementById('edit-pro-avatar-preview');
    if (preview) preview.src = compressed;
    showToast('📸 Nova foto de perfil carregada! Clique em "Salvar Alterações".');
  } catch (e) {
    showToast('Erro ao processar foto de perfil.');
  }
}
window.handleEditProAvatarSelect = handleEditProAvatarSelect;

function openEditProModal() {
  if (!currentVitrinePro) return;
  pendingEditProAvatar = null;
  const avatarPreview = document.getElementById('edit-pro-avatar-preview');
  const nameEl = document.getElementById('edit-pro-name');
  const specEl = document.getElementById('edit-pro-specialty');
  const cepEl = document.getElementById('edit-pro-cep');
  const stateEl = document.getElementById('edit-pro-state');
  const cityEl = document.getElementById('edit-pro-city');
  const bioEl = document.getElementById('edit-pro-bio');
  const statusEl = document.getElementById('edit-pro-location-status');

  if (avatarPreview) avatarPreview.src = currentVitrinePro.avatar || 'trampou_app_icon.png';
  if (nameEl) nameEl.value = currentVitrinePro.name || '';
  if (specEl) specEl.value = currentVitrinePro.specialty || '';
  if (cepEl) cepEl.value = currentVitrinePro.cep || '';
  if (stateEl) stateEl.value = currentVitrinePro.state || currentActiveLocation.state || 'PA';
  if (cityEl) cityEl.value = currentVitrinePro.city || currentActiveLocation.city || 'Parauapebas';
  if (bioEl) bioEl.value = currentVitrinePro.bio || '';
  if (statusEl) statusEl.style.display = 'none';

  fetchIbgeCitiesForState(currentVitrinePro.state || 'PA');

  const emergencyChk = document.getElementById('edit-pro-emergency-available');
  if (emergencyChk) {
    emergencyChk.checked = currentVitrinePro.emergencyAvailable !== false;
  }

  document.getElementById('edit-pro-overlay').classList.add('active');
}

function closeEditProModal() {
  document.getElementById('edit-pro-overlay').classList.remove('active');
}

async function saveProProfile() {
  if (!currentVitrinePro) return;
  const newName = document.getElementById('edit-pro-name')?.value.trim() || currentVitrinePro.name;
  const newSpec = document.getElementById('edit-pro-specialty')?.value.trim() || currentVitrinePro.specialty;
  const newCep = document.getElementById('edit-pro-cep')?.value.trim() || '';
  const newState = (document.getElementById('edit-pro-state')?.value || currentVitrinePro.state || 'PA').toUpperCase();
  const newCity = document.getElementById('edit-pro-city')?.value.trim() || currentVitrinePro.city || 'Parauapebas';
  const newBio = document.getElementById('edit-pro-bio')?.value.trim() || currentVitrinePro.bio;

  if (pendingEditProAvatar) {
    currentVitrinePro.avatar = pendingEditProAvatar;
  }
  currentVitrinePro.name = newName;
  currentVitrinePro.specialty = newSpec;
  currentVitrinePro.category = newSpec;
  currentVitrinePro.cep = newCep;
  currentVitrinePro.state = newState;
  currentVitrinePro.city = newCity;
  currentVitrinePro.neighborhood = `${newCity}, ${newState}`;
  currentVitrinePro.serviceCities = [newCity];
  currentVitrinePro.servedNeighborhoods = [`Toda a cidade (${newCity}, ${newState})`];
  currentVitrinePro.bio = newBio;

  const emergencyChk = document.getElementById('edit-pro-emergency-available');
  if (emergencyChk) {
    currentVitrinePro.emergencyAvailable = emergencyChk.checked;
    currentVitrinePro.is24h = emergencyChk.checked;
  }

  // Sincroniza no Supabase se o profissional possuir dbId
  const user = getCurrentUser();
  if (user && pendingEditProAvatar) {
    user.avatar = pendingEditProAvatar;
    localStorage.setItem('go_currentUser', JSON.stringify(user));
  }
  const targetDbId = currentVitrinePro.dbId || (user && user.id && !String(user.id).startsWith('u_') ? user.id : null);
  if (targetDbId) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_professional_profile_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_user_id: targetDbId,
          p_full_name: newName,
          p_phone: currentVitrinePro.phone || (user ? user.phone : ''),
          p_city: newCity,
          p_state: newState,
          p_cep: newCep,
          p_bio: newBio,
          p_avatar_url: currentVitrinePro.avatar || '',
          p_skills: [newSpec],
          p_lat: currentVitrinePro.latitude || null,
          p_lng: currentVitrinePro.longitude || null
        })
      });
    } catch (e) {
      console.warn('Falha ao sincronizar perfil profissional no Supabase:', e);
    }
  }

  pendingEditProAvatar = null;
  saveProfessionalsToStorage();
  setActiveLocation(newCity, newState, currentVitrinePro.latitude, currentVitrinePro.longitude, false);
  closeEditProModal();
  renderVitrineView();
  showToast(`✅ Perfil atualizado! Atuando em toda ${newCity}, ${newState}.`);
}

// =========================================================
// MODAL: GERENCIAR SERVIÇOS (DONO)
// =========================================================
function openManageServicesModal() {
  if (!currentVitrinePro) return;
  renderManageServicesList();
  document.getElementById('manage-services-overlay').classList.add('active');
}

function closeManageServicesModal() {
  document.getElementById('manage-services-overlay').classList.remove('active');
}

function renderManageServicesList() {
  const container = document.getElementById('manage-services-list');
  if (!container || !currentVitrinePro) return;

  container.innerHTML = currentVitrinePro.services.map((s, idx) => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--border-grey);">
      <div>
        <div style="font-size: 12px; font-weight: 700;">${s.title}</div>
        <div style="font-size: 11px; color: var(--primary-purple); font-weight: 700;">${s.price}</div>
      </div>
      <button class="icon-btn-round" style="color: var(--error-red); width: 28px; height: 28px;" onclick="deleteService(${idx})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

function addNewService() {
  const title = document.getElementById('new-service-title').value.trim();
  const price = document.getElementById('new-service-price').value.trim();

  if (!title || !price) {
    showToast('Preencha o nome e o preço do serviço.');
    return;
  }

  currentVitrinePro.services.push({
    id: 's_' + Date.now(),
    title: title,
    price: price,
    unit: 'por serviço'
  });

  document.getElementById('new-service-title').value = '';
  document.getElementById('new-service-price').value = '';

  renderManageServicesList();
  renderVitrineView();
  showToast('Serviço adicionado ao seu catálogo!');
}

function deleteService(index) {
  if (!currentVitrinePro) return;
  currentVitrinePro.services.splice(index, 1);
  renderManageServicesList();
  renderVitrineView();
  showToast('Serviço removido.');
}

// ==============================================================================
// CHAT INTERNO COM REGISTRO LEVE DE ATENDIMENTO E AVALIAÇÕES VERIFICADAS
// ==============================================================================

let chatPerspective = 'client'; // 'client' ou 'professional' (permite testar ambos os lados na mesma tela)
let activeReviewRating = 5;

function toggleChatPerspective() {
  const user = getCurrentUser();
  chatPerspective = (user && user.role === 'professional') ? 'professional' : 'client';
  const label = document.getElementById('chat-active-role-label');
  if (label) {
    label.innerText = chatPerspective === 'client' ? 'Você: Cliente' : 'Você: Profissional';
  }
}

function openChatWith(name, service, proId) {
  const contactNameElem = document.getElementById('chat-contact-name');
  const contactServElem = document.getElementById('chat-contact-service');
  const contactAvatarElem = document.getElementById('chat-contact-avatar');
  const roleLabelElem = document.getElementById('chat-active-role-label');

  // Encontra o profissional correspondente para avatar e navegação
  let targetPro = null;
  if (proId) {
    targetPro = PROFESSIONALS.find(p => p.id === proId);
  }
  if (!targetPro && name) {
    const cleanName = name.toLowerCase().trim();
    targetPro = PROFESSIONALS.find(p => {
      const pName = (p.name || '').toLowerCase();
      return pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
    });
  }
  if (!targetPro && service) {
    const serv = service.toLowerCase().replace(/\[sos\]/gi, '').trim();
    targetPro = PROFESSIONALS.find(p => {
      const spec = (p.specialty || '').toLowerCase();
      return spec.includes(serv) || serv.includes(spec);
    });
  }
  if (!targetPro) {
    targetPro = (PROFESSIONALS && PROFESSIONALS.length > 0) ? PROFESSIONALS[0] : null;
  }

  if (contactNameElem) contactNameElem.innerText = name;
  if (contactServElem) contactServElem.innerText = service ? `${service} • Ver trabalhos` : 'Ver perfil e trabalhos';
  if (contactAvatarElem) {
    if (targetPro && targetPro.avatar) {
      contactAvatarElem.innerHTML = `<img src="${targetPro.avatar}" alt="${name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      contactAvatarElem.innerText = (name || 'P').trim()[0].toUpperCase();
    }
  }
  if (roleLabelElem) roleLabelElem.innerText = chatPerspective === 'client' ? 'Você: Cliente' : 'Você: Profissional';

  // Localiza ou cria a conversa
  activeChat = conversations.find(c => c.proName === name);
  if (!activeChat) {
    activeChat = {
      id: 'c_' + Date.now(),
      proName: name,
      proId: targetPro ? targetPro.id : (proId || null),
      clientName: (currentUser && currentUser.name) ? currentUser.name : 'Cliente Trampou',
      service: service || 'Negociação de Serviço',
      messages: [
        { isMe: false, text: `Olá! Como posso ajudar com seu pedido de ${service || 'serviço'}?`, time: 'Agora' }
      ],
      attendance: null
    };
    conversations.unshift(activeChat);
  } else if (!activeChat.proId && targetPro) {
    activeChat.proId = targetPro.id;
  }

  // Se a conversa não tem attendance definido ainda, garante campo
  if (activeChat.attendance === undefined) {
    activeChat.attendance = null;
  }

  // Marca mensagens desta conversa como lidas
  if (activeChat) {
    activeChat.unread = 0;
    updateNotificationBadges();
  }

  renderAttendanceCard();
  renderChatMessages();

  const chatOverlay = document.getElementById('chat-overlay');
  if (chatOverlay) chatOverlay.classList.add('active');
}

// Navegar para o perfil e portfólio de trabalhos do profissional a partir do chat
function openProProfileFromChat() {
  if (!activeChat) return;

  let pro = null;
  if (activeChat.proId) {
    pro = PROFESSIONALS.find(p => p.id === activeChat.proId);
  }

  if (!pro && activeChat.proName) {
    const cleanName = activeChat.proName.toLowerCase().trim();
    pro = PROFESSIONALS.find(p => {
      const pName = (p.name || '').toLowerCase();
      return pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName);
    });
  }

  if (!pro && activeChat.service) {
    const serv = activeChat.service.toLowerCase().replace(/\[sos\]/gi, '').trim();
    pro = PROFESSIONALS.find(p => {
      const spec = (p.specialty || '').toLowerCase();
      return spec.includes(serv) || serv.includes(spec);
    });
  }

  if (!pro) {
    pro = PROFESSIONALS[0];
  }

  if (pro) {
    // Abre vitrine em modo visitante para o cliente visualizar trabalhos, fotos e avaliações
    openProDetail(pro.id);
  }
}
window.openProProfileFromChat = openProProfileFromChat;

function closeChat() {
  const chatOverlay = document.getElementById('chat-overlay');
  if (chatOverlay) chatOverlay.classList.remove('active');
  renderConversations();
  updateNotificationBadges();
}

function renderChatMessages() {
  const container = document.getElementById('chat-messages-container');
  if (!activeChat || !container) return;

  container.innerHTML = activeChat.messages.map(m => {
    if (m.isSystem) {
      return `
        <div style="text-align: center; margin: 8px 0;">
          <span style="display: inline-block; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500;">
            ${m.text}
          </span>
        </div>
      `;
    }
    return `
      <div class="chat-bubble ${m.isMe ? 'me' : 'other'}">
        <div>${m.text}</div>
        <span class="bubble-time">${m.time}</span>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !activeChat) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  activeChat.messages.push({
    isMe: true,
    text: text,
    time: timeStr
  });
  activeChat.lastMsg = text;
  activeChat.time = timeStr;

  input.value = '';
  renderChatMessages();
  renderConversations();

  setTimeout(() => {
    const replyText = 'Entendido! Podemos negociar os detalhes e combinar diretamente por aqui.';
    const replyNow = new Date();
    const replyTimeStr = `${String(replyNow.getHours()).padStart(2, '0')}:${String(replyNow.getMinutes()).padStart(2, '0')}`;
    
    activeChat.messages.push({
      isMe: false,
      text: replyText,
      time: replyTimeStr
    });
    activeChat.lastMsg = replyText;
    activeChat.time = replyTimeStr;

    const chatOverlay = document.getElementById('chat-overlay');
    const isChatActive = chatOverlay && chatOverlay.classList.contains('active');
    
    if (!isChatActive) {
      activeChat.unread = (activeChat.unread || 0) + 1;
      showToast(`🔔 Nova mensagem de ${activeChat.proName}: "${replyText.slice(0, 30)}..."`);
    }

    renderChatMessages();
    renderConversations();
    updateNotificationBadges();
  }, 1000);
}

// ==============================================================================
// CONTROLE DO CARTÃO CONTEXTUAL DE ATENDIMENTO
// ==============================================================================

function renderAttendanceCard() {
  const wrapper = document.getElementById('chat-attendance-card-wrapper');
  if (!wrapper || !activeChat) return;

  const att = activeChat.attendance;

  // CASO 1: Nenhum atendimento em andamento nesta conversa
  if (!att) {
    wrapper.innerHTML = `
      <div class="chat-attendance-bar-idle">
        <span style="font-size: 11px; color: #64748B;">
          <i class="fa-solid fa-handshake" style="color: #4F46E5;"></i> Combinou o serviço pelo chat?
        </span>
        <button type="button" class="btn-chat-register-service" onclick="openRegisterAttendanceModal()">
          <i class="fa-solid fa-plus"></i> Registrar serviço combinado
        </button>
      </div>
    `;
    return;
  }

  // CASO 2: Atendimento existente com um dos 6 estados visuais
  let statusBadgeText = '';
  let statusBadgeClass = '';
  let cardStateClass = '';
  let iconHtml = '';
  let bodyContent = '';
  let actionsHtml = '';

  const isRequester = (chatPerspective === att.requestedByRole);
  const isClient = (chatPerspective === 'client');
  const isPro = (chatPerspective === 'professional');

  switch (att.status) {
    case 'pending_confirmation':
      cardStateClass = 'state-pending';
      statusBadgeText = 'Aguardando confirmação';
      iconHtml = '<i class="fa-solid fa-clock-rotate-left" style="color: #D97706;"></i>';
      
      const requestedByLabel = att.requestedByRole === 'client' ? 'o cliente' : 'o profissional';

      if (isRequester) {
        bodyContent = `
          <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
          <div class="attendance-meta-text">
            Você enviou a solicitação de registro. Aguardando a aceitação do outro participante.
          </div>
        `;
        actionsHtml = `
          <button type="button" class="btn-att-action btn-att-outline" onclick="cancelAttendanceRequest()">
            <i class="fa-solid fa-xmark"></i> Cancelar Solicitação
          </button>
        `;
      } else {
        bodyContent = `
          <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
          <div class="attendance-meta-text">
            <strong>${requestedByLabel}</strong> solicitou o registro deste serviço combinado. Deseja aceitar?
          </div>
        `;
        actionsHtml = `
          <button type="button" class="btn-att-action btn-att-success" onclick="handleRespondAttendance(true)">
            <i class="fa-solid fa-check"></i> Aceitar Registro
          </button>
          <button type="button" class="btn-att-action btn-att-danger" onclick="handleRespondAttendance(false)">
            <i class="fa-solid fa-xmark"></i> Recusar
          </button>
        `;
      }
      break;

    case 'confirmed':
      cardStateClass = 'state-confirmed';
      statusBadgeText = 'Serviço combinado';
      iconHtml = '<i class="fa-solid fa-circle-check" style="color: #2563EB;"></i>';
      bodyContent = `
        <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
        <div class="attendance-meta-text">
          Serviço registrado e combinado entre as partes. Realize o serviço conforme o acordado no chat.
        </div>
      `;

      if (isPro) {
        actionsHtml = `
          <button type="button" class="btn-att-action btn-att-primary" onclick="handleRequestCompletion()">
            <i class="fa-solid fa-flag-checkered"></i> Solicitar Confirmação de Conclusão
          </button>
        `;
      } else {
        actionsHtml = `
          <span style="font-size: 11px; color: #475569;">
            <i class="fa-solid fa-spinner fa-spin" style="color: #2563EB;"></i> Em andamento. O profissional solicitará a conclusão após realizar o trabalho.
          </span>
        `;
      }
      break;

    case 'completion_requested':
      cardStateClass = 'state-completion_requested';
      statusBadgeText = 'Conclusão solicitada';
      iconHtml = '<i class="fa-solid fa-bell" style="color: #EA580C;"></i>';
      bodyContent = `
        <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
        <div class="attendance-meta-text">
          O profissional informou que o serviço foi finalizado e solicitou a sua confirmação.
        </div>
      `;

      if (isClient) {
        actionsHtml = `
          <button type="button" class="btn-att-action btn-att-success" onclick="handleConfirmCompletion()">
            <i class="fa-solid fa-circle-check"></i> Confirmar Conclusão
          </button>
          <button type="button" class="btn-att-action btn-att-danger" onclick="openDisputeModal()">
            <i class="fa-solid fa-triangle-exclamation"></i> Contestar Conclusão
          </button>
        `;
      } else {
        actionsHtml = `
          <span style="font-size: 11px; color: #9A3412;">
            <i class="fa-solid fa-clock"></i> Aguardando o cliente confirmar a conclusão do serviço.
          </span>
        `;
      }
      break;

    case 'completed':
      cardStateClass = 'state-completed';
      statusBadgeText = 'Atendimento concluído';
      iconHtml = '<i class="fa-solid fa-circle-check" style="color: #16A34A;"></i>';
      bodyContent = `
        <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
        <div class="attendance-meta-text">
          Atendimento verificado e confirmado pelo cliente! ${att.hasReview ? 'Avaliação registrada com sucesso.' : 'Avaliação habilitada.'}
        </div>
      `;

      if (isClient) {
        if (!att.hasReview) {
          actionsHtml = `
            <button type="button" class="btn-att-action btn-att-review" onclick="openVerifiedReviewModal()">
              <i class="fa-solid fa-star"></i> Avaliar Profissional (Verificado)
            </button>
          `;
        } else {
          actionsHtml = `
            <span class="review-verified-card-badge">
              <i class="fa-solid fa-certificate"></i> Avaliado com ${att.reviewRating || 5} estrelas
            </span>
          `;
        }
      } else {
        actionsHtml = `
          <span style="font-size: 11px; color: #15803D; font-weight: 600;">
            <i class="fa-solid fa-award"></i> Atendimento finalizado e computado na reputação!
          </span>
        `;
      }
      break;

    case 'disputed':
      cardStateClass = 'state-disputed';
      statusBadgeText = 'Conclusão contestada';
      iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #DC2626;"></i>';
      bodyContent = `
        <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
        <div class="attendance-meta-text" style="color: #991B1B;">
          <strong>Motivo da contestação:</strong> "${att.disputeReason || 'O cliente informou que o serviço ainda não foi concluído satisfatoriamente.'}"
        </div>
      `;

      if (isPro) {
        actionsHtml = `
          <button type="button" class="btn-att-action btn-att-primary" onclick="handleRequestCompletion()">
            <i class="fa-solid fa-rotate-right"></i> Solicitar Conclusão Novamente
          </button>
        `;
      } else {
        actionsHtml = `
          <span style="font-size: 11px; color: #B91C1C;">
            Você contestou a conclusão. Converse pelo chat para acertar os pontos pendentes.
          </span>
        `;
      }
      break;

    case 'cancelled':
      cardStateClass = 'state-cancelled';
      statusBadgeText = 'Atendimento cancelado';
      iconHtml = '<i class="fa-solid fa-ban" style="color: #64748B;"></i>';
      bodyContent = `
        <div class="attendance-service-name">${att.title || 'Serviço Combinado'}</div>
        <div class="attendance-meta-text">
          O registro foi cancelado ou recusado. A conversa continua funcionando livremente.
        </div>
      `;
      actionsHtml = `
        <button type="button" class="btn-att-action btn-att-outline" onclick="openRegisterAttendanceModal()">
          <i class="fa-solid fa-handshake"></i> Novo Registro
        </button>
      `;
      break;
  }

  wrapper.innerHTML = `
    <div class="chat-attendance-card ${cardStateClass}">
      <div class="chat-attendance-card-header">
        <div class="attendance-header-title">
          ${iconHtml}
          <span>Registro de Atendimento</span>
        </div>
        <span class="attendance-status-badge">${statusBadgeText}</span>
      </div>
      <div class="chat-attendance-card-body">
        ${bodyContent}
        <div class="attendance-actions-row">
          ${actionsHtml}
        </div>
      </div>
    </div>
  `;
}

// ==============================================================================
// MODAL: REGISTRAR SERVIÇO COMBINADO
// ==============================================================================

function openRegisterAttendanceModal() {
  if (typeof requireUserAuth === 'function' && !requireUserAuth('deal')) return;
  if (!activeChat) return;
  const input = document.getElementById('reg-att-title-input');
  if (input) {
    input.value = activeChat.service || 'Serviço Combinado';
  }
  const modal = document.getElementById('modal-register-attendance');
  if (modal) modal.classList.add('active');
}

function closeRegisterAttendanceModal() {
  const modal = document.getElementById('modal-register-attendance');
  if (modal) modal.classList.remove('active');
}

function submitRegisterAttendanceRequest() {
  if (!activeChat) return;
  const input = document.getElementById('reg-att-title-input');
  const title = (input ? input.value.trim() : '') || activeChat.service || 'Serviço Combinado';

  const attId = 'att_' + Date.now();
  const requesterRole = chatPerspective; // 'client' ou 'professional'

  activeChat.attendance = {
    id: attId,
    conversationId: activeChat.id,
    title: title,
    status: 'pending_confirmation',
    requestedByRole: requesterRole,
    requestedAt: new Date().toISOString(),
    confirmedAt: null,
    completedAt: null,
    hasReview: false
  };

  closeRegisterAttendanceModal();
  renderAttendanceCard();

  const requesterName = requesterRole === 'client' ? 'O cliente' : 'O profissional';
  activeChat.messages.push({
    isSystem: true,
    text: `📋 ${requesterName} solicitou o registro do serviço combinado: "${title}". Aguardando confirmação do outro participante.`
  });
  renderChatMessages();
  showToast('Solicitação de registro enviada!');
}

function cancelAttendanceRequest() {
  if (!activeChat || !activeChat.attendance) return;
  activeChat.attendance.status = 'cancelled';
  renderAttendanceCard();
  activeChat.messages.push({
    isSystem: true,
    text: `❌ A solicitação de registro de serviço combinado foi cancelada.`
  });
  renderChatMessages();
  showToast('Solicitação cancelada.');
}

// Resposta à solicitação: Aceitar ou Recusar
function handleRespondAttendance(accept) {
  if (accept && typeof requireUserAuth === 'function' && !requireUserAuth('deal')) return;
  if (!activeChat || !activeChat.attendance) return;

  if (accept) {
    activeChat.attendance.status = 'confirmed';
    activeChat.attendance.confirmedAt = new Date().toISOString();
    activeChat.messages.push({
      isSystem: true,
      text: `🤝 Serviço combinado registrado com sucesso por ambas as partes! A negociação segue livre no chat.`
    });
    showToast('Serviço combinado confirmado!');
  } else {
    activeChat.attendance.status = 'cancelled';
    activeChat.attendance.cancelledAt = new Date().toISOString();
    activeChat.messages.push({
      isSystem: true,
      text: `❌ A solicitação de registro foi recusada. A conversa continua aberta normalmente.`
    });
    showToast('Registro recusado. O chat continua ativo.');
  }

  renderAttendanceCard();
  renderChatMessages();
}

// Profissional solicita conclusão
function handleRequestCompletion() {
  if (!activeChat || !activeChat.attendance) return;

  activeChat.attendance.status = 'completion_requested';
  activeChat.attendance.completionRequestedAt = new Date().toISOString();

  activeChat.messages.push({
    isSystem: true,
    text: `🛠️ O profissional solicitou a confirmação de conclusão do serviço.`
  });

  renderAttendanceCard();
  renderChatMessages();
  showToast('Solicitação de conclusão enviada para o cliente!');
}

// Cliente confirma conclusão
function handleConfirmCompletion() {
  if (!activeChat || !activeChat.attendance) return;

  activeChat.attendance.status = 'completed';
  activeChat.attendance.completedAt = new Date().toISOString();

  activeChat.messages.push({
    isSystem: true,
    text: `✅ Atendimento concluído e confirmado pelo cliente! Avaliação verificada habilitada.`
  });

  renderAttendanceCard();
  renderChatMessages();
  showToast('Atendimento marcado como concluído!');

  // Abre automaticamente o modal de avaliação para o cliente
  setTimeout(() => {
    openVerifiedReviewModal();
  }, 600);
}

// Modal de Contestação
function openDisputeModal() {
  const modal = document.getElementById('modal-dispute-attendance');
  const input = document.getElementById('dispute-reason-input');
  if (input) input.value = '';
  if (modal) modal.classList.add('active');
}

function closeDisputeModal() {
  const modal = document.getElementById('modal-dispute-attendance');
  if (modal) modal.classList.remove('active');
}

function submitDisputeAttendance() {
  if (!activeChat || !activeChat.attendance) return;
  const input = document.getElementById('dispute-reason-input');
  const reason = (input ? input.value.trim() : '') || 'O cliente informou que o serviço ainda precisa de ajustes.';

  activeChat.attendance.status = 'disputed';
  activeChat.attendance.disputeReason = reason;

  closeDisputeModal();

  activeChat.messages.push({
    isSystem: true,
    text: `⚠️ Conclusão contestada pelo cliente: "${reason}". O profissional foi notificado para alinhar no chat.`
  });

  renderAttendanceCard();
  renderChatMessages();
  showToast('Contestação registrada. Alinhem os ajustes pelo chat.');
}

// Modal de Avaliação Verificada
function openVerifiedReviewModal() {
  if (typeof requireUserAuth === 'function' && !requireUserAuth('review')) return;
  if (!activeChat || !activeChat.attendance) return;

  if (activeChat.attendance.status !== 'completed') {
    showToast('Apenas atendimentos concluídos podem ser avaliados.');
    return;
  }

  if (activeChat.attendance.hasReview) {
    showToast('Este atendimento já foi avaliado anteriormente.');
    return;
  }

  const proNameElem = document.getElementById('review-modal-pro-name');
  if (proNameElem) proNameElem.innerText = activeChat.proName || 'o profissional';

  const commentInput = document.getElementById('review-comment-input');
  if (commentInput) commentInput.value = '';

  setReviewRating(5);

  const modal = document.getElementById('modal-verified-review');
  if (modal) modal.classList.add('active');
}

function closeVerifiedReviewModal() {
  const modal = document.getElementById('modal-verified-review');
  if (modal) modal.classList.remove('active');
}

function setReviewRating(stars) {
  activeReviewRating = stars;
  const starIcons = document.querySelectorAll('#stars-picker-container i');
  starIcons.forEach(icon => {
    const val = parseInt(icon.getAttribute('data-value'), 10);
    if (val <= stars) {
      icon.classList.add('selected');
    } else {
      icon.classList.remove('selected');
    }
  });
}

function submitVerifiedReview() {
  if (!activeChat || !activeChat.attendance) return;

  if (activeChat.attendance.status !== 'completed') {
    showToast('Não é possível avaliar antes da conclusão confirmada.');
    return;
  }

  if (activeChat.attendance.hasReview) {
    showToast('Este atendimento já possui uma avaliação.');
    return;
  }

  const commentInput = document.getElementById('review-comment-input');
  const comment = commentInput ? commentInput.value.trim() : '';

  // Registra a avaliação associada ao atendimento
  activeChat.attendance.hasReview = true;
  activeChat.attendance.reviewRating = activeReviewRating;
  activeChat.attendance.reviewComment = comment;

  closeVerifiedReviewModal();
  renderAttendanceCard();

  activeChat.messages.push({
    isSystem: true,
    text: `⭐ O cliente publicou uma avaliação verificada de ${activeReviewRating} estrelas para este atendimento!`
  });
  renderChatMessages();

  showToast('⭐ Avaliação verificada publicada com sucesso!');

  // Gatilho Viral: se a avaliação for 4 ou 5 estrelas, convida o cliente a recomendar no WhatsApp dos vizinhos
  if (activeReviewRating >= 4 && activeChat.user) {
    const targetProName = activeChat.user.name;
    const targetSpecialty = activeChat.user.specialty;
    const targetId = activeChat.user.id;
    const recordedRating = activeReviewRating;
    const recordedComment = comment;

    setTimeout(() => {
      if (typeof openPostReviewShare === 'function') {
        openPostReviewShare(targetProName, targetSpecialty, targetId, recordedComment, recordedRating);
      }
    }, 550);
  }
}

window.openChatWith = openChatWith;
window.closeChat = closeChat;
window.toggleChatPerspective = toggleChatPerspective;
window.openRegisterAttendanceModal = openRegisterAttendanceModal;
window.closeRegisterAttendanceModal = closeRegisterAttendanceModal;
window.submitRegisterAttendanceRequest = submitRegisterAttendanceRequest;
window.cancelAttendanceRequest = cancelAttendanceRequest;
window.handleRespondAttendance = handleRespondAttendance;
window.handleRequestCompletion = handleRequestCompletion;
window.handleConfirmCompletion = handleConfirmCompletion;
window.openDisputeModal = openDisputeModal;
window.closeDisputeModal = closeDisputeModal;
window.submitDisputeAttendance = submitDisputeAttendance;
window.openVerifiedReviewModal = openVerifiedReviewModal;
window.closeVerifiedReviewModal = closeVerifiedReviewModal;
window.setReviewRating = setReviewRating;
window.submitVerifiedReview = submitVerifiedReview;
window.sendChatMessage = sendChatMessage;

let currentQuoteTarget = null;

// Modal Solicitar Orçamento
function openRequestModal(category, proName, proId) {
  currentQuoteTarget = { category, proName, proId };
  document.getElementById('quote-title-input').value = category ? `Orçamento para ${category}` : '';
  document.getElementById('quote-modal-overlay').classList.add('active');
}

function closeQuoteModal() {
  currentQuoteTarget = null;
  document.getElementById('quote-modal-overlay').classList.remove('active');
}

function submitQuoteRequest() {
  const title = document.getElementById('quote-title-input').value.trim();
  const locLabel = `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
  const desc = document.getElementById('quote-desc-input').value.trim();

  if (!title) {
    showToast('Informe o título do serviço solicitado.');
    return;
  }

  const targetProName = (currentQuoteTarget && currentQuoteTarget.proName) ? currentQuoteTarget.proName : 'Profissionais da região';
  const targetProId = currentQuoteTarget ? currentQuoteTarget.proId : null;

  userRequests.unshift({
    id: 'req_' + Date.now(),
    title: title,
    description: desc || `Solicitação enviada pelo cliente em ${locLabel}.`,
    category: (currentQuoteTarget && currentQuoteTarget.category) || 'Geral',
    neighborhood: locLabel,
    status: 'pending',
    statusLabel: 'Aguardando resposta',
    proName: targetProName,
    date: 'Hoje'
  });

  closeQuoteModal();
  showToast('Solicitação enviada com sucesso!');
  if (targetProName && targetProName !== 'Profissionais da região') {
    openChatWith(targetProName, title, targetProId);
  }
}

function closeProDashboard() {
  closeProVitrine();
}

// Alternar Abas Principais
function switchTab(tabId) {
  // 1. Fechar qualquer tela cheia, modal ou overlay aberto (vitrine do profissional, chat, radar, etc.)
  document.querySelectorAll('.modal-overlay.active').forEach(modal => {
    modal.classList.remove('active');
  });

  // 2. Alternar abas principais
  document.querySelectorAll('.screen-tab').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetNav = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);

  if (targetTab) targetTab.classList.add('active');
  if (targetNav) targetNav.classList.add('active');

  // 3. Scroll para o topo
  const appScreen = document.querySelector('.app-screen');
  if (appScreen) appScreen.scrollTop = 0;
  const vitrineScroll = document.getElementById('vitrine-scroll-body');
  if (vitrineScroll) vitrineScroll.scrollTop = 0;
  window.scrollTo(0, 0);

  // 4. Executar callbacks específicos de cada aba
  if (tabId === 'search' && typeof renderSearchResults === 'function') {
    renderSearchResults();
  } else if (tabId === 'chat' && typeof renderConversations === 'function') {
    renderConversations();
  } else if (tabId === 'profile' && typeof renderAuthUI === 'function') {
    renderAuthUI();
  } else if (tabId === 'home') {
    if (typeof renderRecommendedProfessionals === 'function') renderRecommendedProfessionals();
    if (typeof renderNewsFeed === 'function') renderNewsFeed();
  }
}

// ==============================================================================
// MODAL / TELA DE LISTA DE PROFISSIONAIS (FILTROS EXCLUSIVOS POR PROFISSÃO)
// ==============================================================================

let currentProListQuery = '';
let currentProListProfession = 'all';

function openProListModal(queryOrCategory = '', professionFilter = 'all') {
  currentProListQuery = (queryOrCategory || '').trim();
  currentProListProfession = professionFilter || 'all';

  const modal = document.getElementById('pro-list-overlay');
  const titleEl = document.getElementById('pro-list-title');
  const subEl = document.getElementById('pro-list-subtitle');
  const countEl = document.getElementById('pro-list-count');
  const filterBar = document.getElementById('pro-list-filter-bar');
  const container = document.getElementById('pro-list-items-container');

  if (!modal || !container) return;

  function normalize(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  const qNorm = normalize(currentProListQuery);

  // Lista exclusiva de profissões para o filtro
  const professionsList = [
    { name: 'Todas', val: 'all', icon: 'fa-border-all' },
    { name: 'Eletricista', val: 'Eletricista', icon: 'fa-bolt' },
    { name: 'Encanador', val: 'Encanador', icon: 'fa-faucet-drip' },
    { name: 'Pedreiro', val: 'Pedreiro', icon: 'fa-trowel-bricks' },
    { name: 'Diarista', val: 'Diarista', icon: 'fa-broom' },
    { name: 'Ar-Condicionado', val: 'Ar-Condicionado', icon: 'fa-snowflake' },
    { name: 'Pintor', val: 'Pintor', icon: 'fa-paint-roller' },
    { name: 'Mecânico', val: 'Mecânico', icon: 'fa-wrench' },
    { name: 'Carpinteiro', val: 'Carpinteiro', icon: 'fa-hammer' },
    { name: 'Informática', val: 'Informática', icon: 'fa-laptop' },
    { name: 'Chaveiro', val: 'Chaveiro', icon: 'fa-key' }
  ];

  // Se a busca inicial for o nome de uma categoria e o filtro estiver 'all', ativa a categoria
  if (currentProListProfession === 'all' && qNorm) {
    const matchedProf = professionsList.find(p => p.val !== 'all' && normalize(p.val) === qNorm);
    if (matchedProf) {
      currentProListProfession = matchedProf.val;
      currentProListQuery = '';
    }
  }

  // Título e subtítulo com a cidade ativa
  const activeLocText = `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
  if (currentProListProfession !== 'all') {
    titleEl.textContent = `${currentProListProfession} em ${currentActiveLocation.city}`;
    subEl.textContent = `Profissionais disponíveis em ${activeLocText}`;
  } else if (currentProListQuery) {
    const formattedTitle = currentProListQuery.charAt(0).toUpperCase() + currentProListQuery.slice(1);
    titleEl.textContent = `${formattedTitle}`;
    subEl.textContent = `Resultados da busca em ${activeLocText}`;
  } else {
    titleEl.textContent = `Profissionais em ${currentActiveLocation.city}`;
    subEl.textContent = `Autônomos verificados em ${activeLocText}`;
  }

  // Renderiza a barra de filtros exclusivamente por PROFISSÃO
  filterBar.innerHTML = professionsList.map(item => {
    const isActive = currentProListProfession === item.val;
    return `
      <button type="button" class="pro-filter-chip ${isActive ? 'active' : ''}" onclick="applyProListProfessionFilter('${item.val}')">
        <i class="fa-solid ${item.icon}"></i>
        <span>${item.name}</span>
      </button>
    `;
  }).join('');

  // 0. Filtra primeiro pela cidade ativa
  const cityFiltered = filterAndSortProsByLocation(PROFESSIONALS || []);

  // 1. Filtra profissionais pela busca textual (se houver)
  let matched = cityFiltered.filter(p => {
    if (!currentProListQuery) return true;
    const q = normalize(currentProListQuery);
    const nameNorm = normalize(p.name);
    const specNorm = normalize(p.specialty);
    const bioNorm = normalize(p.bio || p.headline || '');
    const servicesNorm = (p.services || []).map(s => normalize(s.title)).join(' ');
    const postsNorm = (p.posts || []).map(po => normalize(po.title + ' ' + (po.serviceCategory || ''))).join(' ');
    return nameNorm.includes(q) || 
           specNorm.includes(q) || 
           bioNorm.includes(q) || 
           servicesNorm.includes(q) || 
           postsNorm.includes(q);
  });

  // 2. Filtra profissionais estritamente por PROFISSÃO
  if (currentProListProfession !== 'all') {
    const profNorm = normalize(currentProListProfession);
    matched = matched.filter(p => {
      const specNorm = normalize(p.specialty);
      const servicesNorm = (p.services || []).map(s => normalize(s.title)).join(' ');
      const postsNorm = (p.posts || []).map(po => normalize(po.title + ' ' + (po.serviceCategory || ''))).join(' ');
      return specNorm.includes(profNorm) || 
             servicesNorm.includes(profNorm) || 
             postsNorm.includes(profNorm);
    });
  }

  countEl.textContent = `${matched.length} ${matched.length === 1 ? 'disponível' : 'disponíveis'}`;

  // Renderiza a lista de profissionais
  if (matched.length === 0) {
    container.innerHTML = `
      <div class="pro-list-empty-box">
        <i class="fa-solid fa-user-slash"></i>
        <h5>Nenhum profissional encontrado</h5>
        <p>Não encontramos profissionais cadastrados na profissão selecionada no momento.</p>
        <button type="button" class="btn-pro-listing-primary" style="max-width: 220px; margin: 0 auto;" onclick="applyProListProfessionFilter('all')">
          <i class="fa-solid fa-arrows-rotate"></i> Ver todas as profissões
        </button>
      </div>
    `;
  } else {
    // Usa o formato de card compacto horizontal para o modal
    container.innerHTML = matched.map(p => renderCompactProCard(p)).join('');
  }

  modal.classList.add('active');
}

function applyProListProfessionFilter(profession) {
  openProListModal(currentProListQuery, profession);
}

function applyProListBairroFilter(bairro) {
  applyProListProfessionFilter('all');
}

function closeProListModal() {
  const modal = document.getElementById('pro-list-overlay');
  if (modal) modal.classList.remove('active');
}

window.openProListModal = openProListModal;
window.closeProListModal = closeProListModal;
window.applyProListProfessionFilter = applyProListProfessionFilter;
window.applyProListBairroFilter = applyProListBairroFilter;

// ==============================================================================
// COMPONENTE: CARD HORIZONTAL COMPACTO DE PROFISSIONAL (90–115px)
// ==============================================================================

function renderCompactProCard(p) {
  if (!p || !p.id) return '';

  const initials = getInitials(p.name);
  const avatarHtml = p.avatar
    ? `<img src="${p.avatar}" alt="${p.name}" loading="lazy" onerror="this.parentElement.textContent='${initials}'">`
    : `${initials}`;

  const ratingVal = (p.rating && !isNaN(p.rating)) ? Number(p.rating).toFixed(1) : null;
  const reviewsCount = (p.reviewsCount && !isNaN(p.reviewsCount) && Number(p.reviewsCount) > 0) ? Number(p.reviewsCount) : null;
  const neighborhood = p.neighborhood ? p.neighborhood.replace(', Parauapebas', '').replace(', PA', '') : null;
  const distBadge = (p._distanceKm !== null && p._distanceKm !== undefined)
    ? `<span class="pro-distance-badge"><i class="fa-solid fa-location-crosshairs"></i> ${p._distanceKm < 1 ? Math.round(p._distanceKm * 1000) + ' m' : p._distanceKm.toFixed(1) + ' km'}</span>`
    : '';

  return `
    <article class="pro-compact-card" role="button" tabindex="0" onclick="openProDetail('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProDetail('${p.id}');}" aria-label="Ver perfil de ${p.name}">
      <!-- Foto / Avatar (52–60 px) alinhada à esquerda -->
      <div class="pro-compact-avatar">
        ${avatarHtml}
      </div>

      <!-- Informações agrupadas no centro -->
      <div class="pro-compact-info">
        <!-- 1. Nome do profissional em destaque + Selo de verificação (se aplicável) -->
        <div class="pro-compact-name-row">
          <span class="pro-compact-name">${p.name}</span>
          ${p.verified ? '<i class="fa-solid fa-circle-check pro-compact-verified" title="Profissional Verificado" aria-label="Verificado"></i>' : ''}
        </div>

        <!-- 2. Categoria ou Especialidade em texto secundário -->
        ${p.specialty ? `<div class="pro-compact-specialty">${p.specialty}</div>` : ''}

        <!-- 3. Avaliação + 4. Localização resumida + Distância -->
        <div class="pro-compact-meta-row">
          ${ratingVal ? `
            <span class="pro-compact-rating">
              <i class="fa-solid fa-star" aria-hidden="true"></i>
              <span class="pro-rating-val">${ratingVal}</span>
              ${reviewsCount ? `<span class="pro-reviews-cnt">(${reviewsCount})</span>` : ''}
            </span>
          ` : ''}
          ${ratingVal && neighborhood ? '<span class="pro-compact-meta-dot">·</span>' : ''}
          ${neighborhood ? `
            <span class="pro-compact-loc">
              <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
              <span>${neighborhood}</span>
            </span>
          ` : ''}
          ${distBadge}
        </div>
      </div>

      <!-- Indicador discreto de navegação à direita -->
      <div class="pro-compact-action" aria-hidden="true">
        <i class="fa-solid fa-chevron-right pro-compact-chevron"></i>
      </div>
    </article>
  `;
}
window.renderCompactProCard = renderCompactProCard;

// ==============================================================================
// PÁGINA EXPLORAR — LISTAGEM, BUSCA E FILTROS DE PROFISSIONAIS
// ==============================================================================

let exploreCategory = 'all';
let exploreBairro = 'all';
let exploreSort = 'rating';

// Obtém lista consolidada de todas as categorias do aplicativo (padrão + criadas dinamicamente)
function getAllCategoriesList() {
  const base = [
    { value: 'Eletricista', label: 'Eletricista Residencial e Predial', icon: 'fa-bolt', tone: 'tone-amber' },
    { value: 'Ar-Condicionado', label: 'Ar-Condicionado e Refrigeração', icon: 'fa-snowflake', tone: 'tone-blue' },
    { value: 'Encanador', label: 'Encanador e Hidráulica', icon: 'fa-faucet-drip', tone: 'tone-blue' },
    { value: 'Pedreiro', label: 'Pedreiro e Reformas', icon: 'fa-hammer', tone: 'tone-slate' },
    { value: 'Pintor', label: 'Pintor e Texturas', icon: 'fa-paint-roller', tone: 'tone-rose' },
    { value: 'Diarista', label: 'Diarista e Faxina Residencial', icon: 'fa-broom', tone: 'tone-green' },
    { value: 'Jardinagem', label: 'Jardinagem e Limpeza de Lotes', icon: 'fa-seedling', tone: 'tone-green' },
    { value: 'Marceneiro', label: 'Marceneiro e Móveis Planejados', icon: 'fa-couch', tone: 'tone-amber' },
    { value: 'Mecânico', label: 'Mecânica e Auto Socorro', icon: 'fa-wrench', tone: 'tone-slate' },
    { value: 'Estética', label: 'Manicure, Cabelo e Estética', icon: 'fa-scissors', tone: 'tone-rose' },
    { value: 'Informática', label: 'Técnico de Informática e Redes', icon: 'fa-laptop', tone: 'tone-lavender' },
    { value: 'Fretes', label: 'Fretes e Mudanças', icon: 'fa-truck', tone: 'tone-amber' }
  ];

  const customCats = (typeof getCustomCategories === 'function' ? getCustomCategories() : []).map(catName => ({
    value: catName,
    label: catName,
    icon: 'fa-hammer',
    tone: 'tone-lavender',
    isCustom: true
  }));

  return [...base, ...customCats];
}
window.getAllCategoriesList = getAllCategoriesList;

// Contagem dinâmica de profissionais por categoria
function getCategoryProCount(catName) {
  if (!catName || catName === 'all') return (PROFESSIONALS || []).length;
  const normalize = (str) => (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[-_]/g, ' ').trim();
  const catNorm = normalize(catName);
  const stemCat = catNorm.replace(/s$/, '');

  return (PROFESSIONALS || []).filter(p => {
    const pCat = normalize(p.category || '');
    const specNorm = normalize(p.specialty || '');
    const headlineNorm = normalize(p.headline || '');
    const bioNorm = normalize(p.bio || '');
    const postsNorm = (p.posts || []).map(po => normalize(po.serviceCategory || '')).join(' ');
    const servicesNorm = (p.services || []).map(s => normalize(s.title || '')).join(' ');

    return pCat === catNorm ||
           specNorm.includes(catNorm) || 
           specNorm.includes(stemCat) ||
           catNorm.includes(specNorm) ||
           headlineNorm.includes(catNorm) ||
           headlineNorm.includes(stemCat) ||
           postsNorm.includes(catNorm) || 
           postsNorm.includes(stemCat) ||
           servicesNorm.includes(catNorm) ||
           servicesNorm.includes(stemCat);
  }).length;
}
window.getCategoryProCount = getCategoryProCount;

// Renderiza os chips de categorias na barra horizontal da página Explorar
function renderExploreCategoryChips() {
  const container = document.getElementById('dynamic-explore-chips');
  if (!container) return;

  const cats = getAllCategoriesList();
  container.innerHTML = cats.map(c => {
    const isActive = exploreCategory === c.value;
    return `
      <button type="button" class="explore-chip-btn ${isActive ? 'active' : ''}" data-category="${c.value}" onclick="selectCategoryAndFilter('${c.value}')">
        <i class="fa-solid ${c.icon}" aria-hidden="true"></i>
        <span>${c.value}</span>
      </button>
    `;
  }).join('');

  // Atualiza botão "Todas as Categorias"
  const allBtn = document.getElementById('btn-explore-all-cats');
  if (allBtn) {
    allBtn.classList.toggle('active', exploreCategory === 'all');
  }
}
window.renderExploreCategoryChips = renderExploreCategoryChips;

// Abre o modal de Todas as Categorias exibindo todas as opções disponíveis
function openAllCategoriesModal() {
  const overlay = document.getElementById('all-categories-modal-overlay');
  if (!overlay) return;

  renderAllCategoriesModal('');
  overlay.classList.add('show');
  overlay.style.display = 'flex';

  const searchInput = document.getElementById('all-cats-search-input');
  if (searchInput) {
    searchInput.value = '';
    setTimeout(() => searchInput.focus(), 150);
  }
}
window.openAllCategoriesModal = openAllCategoriesModal;

// Fecha o modal de Todas as Categorias
function closeAllCategoriesModal() {
  const overlay = document.getElementById('all-categories-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  setTimeout(() => {
    if (!overlay.classList.contains('show')) overlay.style.display = 'none';
  }, 250);
}
window.closeAllCategoriesModal = closeAllCategoriesModal;

// Renderiza o grid de opções de categorias dentro do modal
function renderAllCategoriesModal(filterText = '') {
  const container = document.getElementById('all-categories-container');
  if (!container) return;

  const normalize = (str) => (str || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const query = normalize(filterText);

  const allCats = getAllCategoriesList();
  const totalPros = (PROFESSIONALS || []).length;
  const isAllActive = exploreCategory === 'all';

  let html = '';

  // Card Especial: Ver Todos os Profissionais (se busca estiver vazia ou bater com "todas" / "todos")
  if (!query || 'todos os profissionais todas as categorias'.includes(query)) {
    html += `
      <div class="all-cat-item-special ${isAllActive ? 'active' : ''}" onclick="selectCategoryAndFilter('all')">
        <div class="all-cat-special-left">
          <div class="all-cat-special-icon">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="all-cat-special-texts">
            <h5>Todos os Profissionais</h5>
            <span>Ver listagem completa da cidade sem filtro</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="all-cat-count" style="font-weight: 700; color: var(--color-brand);">${totalPros} profissionais</span>
          ${isAllActive ? '<i class="fa-solid fa-circle-check all-cat-active-check"></i>' : '<i class="fa-solid fa-chevron-right" style="font-size: 11px; color: #94A3B8;"></i>'}
        </div>
      </div>
    `;
  }

  // Filtragem das categorias pelo campo de busca interna
  const filteredCats = allCats.filter(c => {
    if (!query) return true;
    return normalize(c.value).includes(query) || normalize(c.label).includes(query);
  });

  if (filteredCats.length === 0) {
    html += `
      <div style="text-align: center; padding: 24px 10px; color: #64748B;">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 24px; opacity: 0.4; margin-bottom: 8px; display: block;"></i>
        <p style="font-size: 13px; font-weight: 600; margin: 0 0 4px;">Nenhuma categoria encontrada para "${filterText}"</p>
        <span style="font-size: 11.5px;">Tente outro termo ou cadastre sua nova categoria no cadastro profissional.</span>
      </div>
    `;
  } else {
    html += `<div class="all-cats-section-label">Categorias Disponíveis em Parauapebas</div>`;
    html += `<div class="all-cats-grid">`;

    filteredCats.forEach(c => {
      const isSelected = exploreCategory === c.value;
      const count = getCategoryProCount(c.value);
      const toneClass = getCategoryTone(c.icon, c.value);

      html += `
        <div class="all-cat-card ${isSelected ? 'active' : ''}" onclick="selectCategoryAndFilter('${c.value}')">
          <div class="all-cat-icon-box ${toneClass}">
            <i class="fa-solid ${c.icon}" aria-hidden="true"></i>
          </div>
          <div class="all-cat-texts">
            <span class="all-cat-name" title="${c.value}">${c.value}</span>
            <span class="all-cat-count">
              <i class="fa-solid fa-user-check" style="font-size: 9px;"></i>
              ${count} ${count === 1 ? 'profissional' : 'profissionais'}
            </span>
          </div>
          ${isSelected ? '<i class="fa-solid fa-check all-cat-active-check"></i>' : ''}
        </div>
      `;
    });

    html += `</div>`;
  }

  container.innerHTML = html;
}
window.renderAllCategoriesModal = renderAllCategoriesModal;

// Filtra categorias no modal conforme o usuário digita
function filterCategoriesInModal(val) {
  const clearBtn = document.getElementById('all-cats-clear-btn');
  if (clearBtn) {
    clearBtn.style.display = val && val.length > 0 ? 'flex' : 'none';
  }
  renderAllCategoriesModal(val);
}
window.filterCategoriesInModal = filterCategoriesInModal;

function clearModalCategorySearch() {
  const input = document.getElementById('all-cats-search-input');
  if (input) {
    input.value = '';
    filterCategoriesInModal('');
    input.focus();
  }
}
window.clearModalCategorySearch = clearModalCategorySearch;

// Seleciona a categoria e exibe todos os profissionais correspondentes
function selectCategoryAndFilter(catName) {
  closeAllCategoriesModal();

  exploreCategory = catName || 'all';

  // Atualiza botão "Todas as Categorias"
  const allBtn = document.getElementById('btn-explore-all-cats');
  if (allBtn) {
    allBtn.classList.toggle('active', exploreCategory === 'all');
  }

  // Atualiza botões de chips
  document.querySelectorAll('#explore-category-filter .explore-chip-btn').forEach(btn => {
    const cat = btn.getAttribute('data-category');
    const isThis = cat === exploreCategory;
    btn.classList.toggle('active', isThis);
    if (isThis && cat !== 'all') {
      try {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (e) {}
    }
  });

  // Atualiza indicador visual de categoria ativa
  const activeIndicator = document.getElementById('active-category-indicator');
  const activeText = document.getElementById('active-category-text');
  if (activeIndicator && activeText) {
    if (exploreCategory === 'all') {
      activeIndicator.style.display = 'none';
    } else {
      activeIndicator.style.display = 'inline-flex';
      activeText.textContent = exploreCategory;
    }
  }

  renderSearchResults();

  // Scroll suave para o topo dos resultados da página Explorar
  const exploreBody = document.querySelector('#tab-search .explore-scroll-body');
  if (exploreBody) {
    exploreBody.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.selectCategoryAndFilter = selectCategoryAndFilter;

function renderSearchResults() {
  const container = document.getElementById('explore-professionals-container');
  const countEl = document.getElementById('explore-results-count');
  const searchInput = document.getElementById('main-search-input');
  const clearBtn = document.getElementById('clear-search-btn');

  if (!container) return;

  const query = (searchInput ? searchInput.value : '').trim();

  // Controla botão de limpar busca por texto
  if (clearBtn) {
    clearBtn.style.display = query.length > 0 ? 'block' : 'none';
  }

  function normalize(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[-_]/g, ' ')
      .trim();
  }

  const qNorm = normalize(query);
  const catNorm = exploreCategory === 'all' ? '' : normalize(exploreCategory);
  const stemCat = catNorm.replace(/s$/, '');
  const bairroNorm = exploreBairro === 'all' ? '' : normalize(exploreBairro);
  const activeCityNorm = normalize(currentActiveLocation.city);
  const userLat = currentActiveLocation.lat;
  const userLng = currentActiveLocation.lng;

  // Filtragem dos profissionais
  let filtered = (PROFESSIONALS || []).filter(p => {
    // 0. Filtro Geográfico por Cidade Ativa
    const pCityNorm = normalize(p.city || 'Parauapebas');
    const servedCities = (p.serviceCities || []).map(normalize);
    const pNeighNorm = normalize(p.neighborhood || '');

    const matchCity = !activeCityNorm ||
                      pCityNorm === activeCityNorm ||
                      servedCities.includes(activeCityNorm) ||
                      pNeighNorm.includes(activeCityNorm);
    if (!matchCity) return false;

    // Filtro por texto digitado
    if (qNorm) {
      const nameNorm = normalize(p.name);
      const specNorm = normalize(p.specialty);
      const neighNorm = normalize(p.neighborhood);
      const bioNorm = normalize(p.bio || p.headline || '');
      const servedNorm = (p.servedNeighborhoods || []).map(normalize).join(' ');
      const servicesNorm = (p.services || []).map(s => normalize(s.title)).join(' ');
      const matchQuery = nameNorm.includes(qNorm) || 
                         specNorm.includes(qNorm) || 
                         neighNorm.includes(qNorm) || 
                         bioNorm.includes(qNorm) || 
                         servedNorm.includes(qNorm) || 
                         servicesNorm.includes(qNorm);
      if (!matchQuery) return false;
    }

    // Filtro por Categoria
    if (catNorm) {
      const pCat = normalize(p.category || '');
      const specNorm = normalize(p.specialty || '');
      const headlineNorm = normalize(p.headline || '');
      const bioNorm = normalize(p.bio || '');
      const postsNorm = (p.posts || []).map(po => normalize(po.serviceCategory || '')).join(' ');
      const servicesNorm = (p.services || []).map(s => normalize(s.title || '')).join(' ');

      const matchCat = pCat === catNorm ||
                       specNorm.includes(catNorm) || 
                       specNorm.includes(stemCat) ||
                       catNorm.includes(specNorm) ||
                       headlineNorm.includes(catNorm) ||
                       headlineNorm.includes(stemCat) ||
                       bioNorm.includes(catNorm) ||
                       bioNorm.includes(stemCat) ||
                       postsNorm.includes(catNorm) || 
                       postsNorm.includes(stemCat) ||
                       servicesNorm.includes(catNorm) || 
                       servicesNorm.includes(stemCat);
      if (!matchCat) return false;
    }

    return true;
  });

  // Calcula distâncias para os profissionais filtrados
  filtered.forEach(p => {
    if (userLat !== null && userLng !== null && p.latitude && p.longitude) {
      p._distanceKm = calculateDistanceKm(userLat, userLng, p.latitude, p.longitude);
    } else {
      p._distanceKm = null;
    }
  });

  // Ordenação
  if (exploreSort === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (exploreSort === 'reviews') {
    filtered.sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
  } else if (exploreSort === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Padrão: mais recentes criados primeiro (com desempate por proximidade se GPS estiver ativo)
    filtered.sort((a, b) => {
      if (currentActiveLocation.isGps && userLat !== null && userLng !== null && a._distanceKm !== null && b._distanceKm !== null) {
        const diff = a._distanceKm - b._distanceKm;
        if (Math.abs(diff) > 0.5) return diff;
      }
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Atualiza contador de resultados
  if (countEl) {
    const locLabel = `${currentActiveLocation.city}, ${currentActiveLocation.state}`;
    if (exploreCategory !== 'all') {
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'profissional em ' : 'profissionais em '} "${exploreCategory}" · ${locLabel}`;
    } else {
      countEl.textContent = `${filtered.length} ${filtered.length === 1 ? 'profissional em ' : 'profissionais em '} ${locLabel}`;
    }
  }

  // Atualiza indicador de categoria ativa
  const activeIndicator = document.getElementById('active-category-indicator');
  const activeText = document.getElementById('active-category-text');
  if (activeIndicator && activeText) {
    if (exploreCategory === 'all') {
      activeIndicator.style.display = 'none';
    } else {
      activeIndicator.style.display = 'inline-flex';
      activeText.textContent = exploreCategory;
    }
  }

  // Renderiza cards compactos ou estado vazio
  if (filtered.length === 0) {
    const availableCities = typeof getAvailableProCities === 'function' ? getAvailableProCities() : [];
    const quickCitiesHtml = availableCities.length > 0 ? `
      <div style="margin-top: 12px; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap;">
        ${availableCities.map(c => `
          <button type="button" class="loc-chip" onclick="selectCityOption('${c.city}', '${c.state}')" style="font-size: 11.5px; padding: 5px 10px;">
            📍 Ver ${c.city}, ${c.state} (${c.count})
          </button>
        `).join('')}
      </div>
    ` : '';

    container.innerHTML = `
      <div class="explore-empty-state">
        <i class="fa-solid fa-location-dot" style="color: #6366F1; font-size: 32px; margin-bottom: 8px;" aria-hidden="true"></i>
        <h5>Nenhum profissional em ${currentActiveLocation.city}, ${currentActiveLocation.state}</h5>
        <p>Não encontramos nenhum profissional cadastrado nesta cidade com os filtros atuais${exploreCategory !== 'all' ? ` em "${exploreCategory}"` : ''}.</p>
        <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 14px;">
          <button type="button" class="btn-reset-filters" onclick="openLocationPickerModal()">
            <i class="fa-solid fa-map-location-dot"></i> Alterar Cidade ou CEP
          </button>
          <button type="button" class="btn-reset-filters" onclick="resetExploreFilters()">
            <i class="fa-solid fa-arrows-rotate"></i> Limpar filtros
          </button>
        </div>
        ${quickCitiesHtml}
      </div>
    `;
  } else {
    container.innerHTML = filtered.map(p => renderCompactProCard(p)).join('');
  }
}
window.renderSearchResults = renderSearchResults;

function resetExploreFilters() {
  selectCategoryAndFilter('all');
  exploreBairro = 'all';
  exploreSort = 'rating';

  const searchInput = document.getElementById('main-search-input');
  if (searchInput) searchInput.value = '';

  const sortSelect = document.getElementById('explore-sort-select');
  if (sortSelect) sortSelect.value = 'rating';

  document.querySelectorAll('#explore-neighborhood-filter .explore-chip-bairro').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-bairro') === 'all');
  });

  renderSearchResults();
}
window.resetExploreFilters = resetExploreFilters;

// Filtro por Categoria vindo da Home -> navega para a página Explorar com a categoria ativa
function filterByCategory(catName) {
  switchTab('search');
  selectCategoryAndFilter(catName);
}
window.filterByCategory = filterByCategory;

// Alternar Favorito
function toggleFavorite(btn) {
  btn.classList.toggle('active');
  const isFav = btn.classList.contains('active');
  btn.innerHTML = isFav ? '<i class="fa-solid fa-heart" style="color: var(--error-red);"></i>' : '<i class="fa-regular fa-heart"></i>';
  showToast(isFav ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toast-message');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// Eventos
function setupEvents() {
  // Busca em tempo real da página Explorar
  const searchInput = document.getElementById('main-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', renderSearchResults);
  }

  const clearBtn = document.getElementById('clear-search-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      renderSearchResults();
      if (searchInput) searchInput.focus();
    });
  }

  // Filtros de Categoria da página Explorar (Delegação limpa)
  const catFilterRow = document.getElementById('explore-category-filter');
  if (catFilterRow) {
    catFilterRow.addEventListener('click', (e) => {
      const chip = e.target.closest('.explore-chip-btn');
      if (!chip) return;
      if (chip.id === 'btn-explore-all-cats') {
        openAllCategoriesModal();
        return;
      }
      const cat = chip.getAttribute('data-category');
      if (cat) {
        selectCategoryAndFilter(cat);
      }
    });
  }

  // Filtros de Bairro da página Explorar
  document.querySelectorAll('#explore-neighborhood-filter .explore-chip-bairro').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#explore-neighborhood-filter .explore-chip-bairro').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      exploreBairro = chip.getAttribute('data-bairro') || 'all';
      renderSearchResults();
    });
  });

  // Ordenação da página Explorar
  const sortSelect = document.getElementById('explore-sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      exploreSort = sortSelect.value || 'rating';
      renderSearchResults();
    });
  }



  // Envio de Mensagem no Chat
  const chatSendBtn = document.getElementById('chat-send-btn');
  if (chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // Busca Inteligente da Home com Sugestões e Autocomplete
  initHomeSmartSearch();

  // Alternar formato de celular / tela cheia
  const toggleFrameBtn = document.getElementById('toggle-frame-btn');
  const deviceContainer = document.getElementById('device-container');
  if (toggleFrameBtn && deviceContainer) {
    toggleFrameBtn.addEventListener('click', () => {
      deviceContainer.classList.toggle('full-width');
      const isFull = deviceContainer.classList.contains('full-width');
      toggleFrameBtn.innerHTML = isFull 
        ? '<i class="fa-solid fa-mobile-screen"></i> Modo Smartphone'
        : '<i class="fa-solid fa-expand"></i> Tela Cheia';
    });
  }

  // Notificações e Avatar
  const notifBtn = document.getElementById('notif-btn');
  if (notifBtn) notifBtn.addEventListener('click', openNotificationsFromHome);
  const avatarBtn = document.getElementById('avatar-btn');
  if (avatarBtn) avatarBtn.addEventListener('click', () => switchTab('profile'));

  // Inicializa os badges de notificação
  updateNotificationBadges();
}

// ==============================================================================
// BUSCA INTELIGENTE NA HOME (AUTOCOMPLETE E SUGESTÕES EM TEMPO REAL)
// ==============================================================================

function initHomeSmartSearch() {
  const searchInput = document.getElementById('home-search-input');
  const clearBtn = document.getElementById('home-search-clear');
  const dropdown = document.getElementById('search-suggestions-dropdown');
  const searchWrapper = document.getElementById('home-search-wrapper');
  const filterBtn = document.getElementById('home-filter-btn');

  if (!searchInput || !dropdown || !searchWrapper) return;

  // Botão de filtros abre a aba de busca com filtros avançados
  if (filterBtn) {
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      switchTab('search');
    });
  }

  function normalizeText(str) {
    return (str || '')
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function safeEscape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightMatch(text, query) {
    if (!query || !text) return safeEscape(text);
    const escapedText = safeEscape(text);
    const cleanQ = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!cleanQ) return escapedText;
    try {
      const regex = new RegExp(`(${cleanQ})`, 'gi');
      return escapedText.replace(regex, '<mark>$1</mark>');
    } catch (e) {
      return escapedText;
    }
  }

  function renderAvatarHtml(p) {
    const initials = getInitials(p.name);
    if (p.avatar) {
      return `<div class="suggestion-pro-avatar"><img src="${p.avatar}" alt="${p.name}" onerror="this.parentElement.textContent='${initials}'"></div>`;
    }
    return `<div class="suggestion-pro-avatar">${initials}</div>`;
  }

  // Sugestões rápidas de categorias e serviços
  const POPULAR_SERVICES = [
    { label: 'Eletricista', icon: 'fa-bolt', query: 'eletricista' },
    { label: 'Encanador', icon: 'fa-faucet-drip', query: 'encanador' },
    { label: 'Diarista', icon: 'fa-broom', query: 'diarista' },
    { label: 'Ar-Condicionado', icon: 'fa-snowflake', query: 'ar' },
    { label: 'Pedreiro', icon: 'fa-trowel-bricks', query: 'pedreiro' },
    { label: 'Pintor', icon: 'fa-paint-roller', query: 'pintor' },
    { label: 'Mecânico', icon: 'fa-wrench', query: 'mecanico' }
  ];

  function openDropdown() {
    dropdown.style.display = 'block';
  }

  function closeDropdown() {
    dropdown.style.display = 'none';
  }

  function renderDefaultSuggestions() {
    // Chips de termos populares
    const chipsHtml = POPULAR_SERVICES.map(s => `
      <div class="suggestion-chip" data-search="${s.query}">
        <i class="fa-solid ${s.icon}"></i>
        <span>${s.label}</span>
      </div>
    `).join('');

    // Profissionais recomendados iniciais
    const topPros = (PROFESSIONALS || []).slice(0, 3);
    const prosHtml = topPros.map(p => `
      <div class="suggestion-pro-item" data-pro-id="${p.id}" role="option" tabindex="0">
        ${renderAvatarHtml(p)}
        <div class="suggestion-pro-info">
          <div class="suggestion-pro-name-row">
            <span class="suggestion-pro-name">${safeEscape(p.name)}</span>
            ${p.verified ? '<i class="fa-solid fa-circle-check suggestion-pro-badge" title="Verificado"></i>' : ''}
          </div>
          <div class="suggestion-pro-sub">${safeEscape(p.specialty || p.headline || '')}</div>
          <div class="suggestion-pro-meta">
            <span class="suggestion-pro-rating"><i class="fa-solid fa-star"></i> ${p.rating ? p.rating.toFixed(1) : '5.0'}</span>
            <span class="suggestion-pro-bairro"><i class="fa-solid fa-location-dot"></i> ${safeEscape(p.neighborhood || 'Parauapebas')}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right suggestion-pro-arrow"></i>
      </div>
    `).join('');

    dropdown.innerHTML = `
      <div class="dropdown-group">
        <div class="dropdown-header-row">
          <span><i class="fa-solid fa-fire text-amber"></i> Buscas em alta em Parauapebas</span>
        </div>
        <div class="suggestion-chips-grid">
          ${chipsHtml}
        </div>
      </div>
      <div class="dropdown-group">
        <div class="dropdown-header-row">
          <span><i class="fa-solid fa-star text-purple"></i> Profissionais recomendados</span>
        </div>
        <div class="suggestion-pros-list">
          ${prosHtml}
        </div>
      </div>
      <div class="suggestion-view-all-banner" data-search="">
        <span><i class="fa-solid fa-users"></i> Ver todos os profissionais de Parauapebas</span>
        <i class="fa-solid fa-arrow-right"></i>
      </div>
    `;

    attachDropdownListeners();
    openDropdown();
  }

  function renderSearchResultsSuggestions(query) {
    const qNorm = normalizeText(query);
    if (!qNorm) {
      renderDefaultSuggestions();
      return;
    }

    // Filtragem em PROFESSIONALS
    const matchedPros = (PROFESSIONALS || []).filter(p => {
      const nameNorm = normalizeText(p.name);
      const specNorm = normalizeText(p.specialty);
      const neighNorm = normalizeText(p.neighborhood);
      const bioNorm = normalizeText(p.bio || p.headline || '');
      const servedNorm = (p.servedNeighborhoods || []).map(normalizeText).join(' ');
      const servicesNorm = (p.services || []).map(s => normalizeText(s.title)).join(' ');
      const postsNorm = (p.posts || []).map(po => normalizeText(po.title + ' ' + (po.serviceCategory || ''))).join(' ');
      return nameNorm.includes(qNorm) || 
             specNorm.includes(qNorm) || 
             neighNorm.includes(qNorm) || 
             bioNorm.includes(qNorm) || 
             servedNorm.includes(qNorm) || 
             servicesNorm.includes(qNorm) || 
             postsNorm.includes(qNorm);
    });

    // Categorias/serviços sugeridos relacionados ao termo
    const matchedServices = POPULAR_SERVICES.filter(s => 
      normalizeText(s.label).includes(qNorm) || normalizeText(s.query).includes(qNorm)
    );

    let html = '';

    // Se houver tags correspondentes
    if (matchedServices.length > 0) {
      const chipsHtml = matchedServices.map(s => `
        <div class="suggestion-chip" data-search="${s.query}">
          <i class="fa-solid ${s.icon}"></i>
          <span>${s.label}</span>
        </div>
      `).join('');
      html += `
        <div class="dropdown-group">
          <div class="dropdown-header-row">
            <span><i class="fa-solid fa-tag"></i> Categorias relacionadas</span>
          </div>
          <div class="suggestion-chips-grid">
            ${chipsHtml}
          </div>
        </div>
      `;
    }

    // Se houver profissionais correspondentes
    if (matchedPros.length > 0) {
      const prosHtml = matchedPros.map(p => `
        <div class="suggestion-pro-item" data-pro-id="${p.id}" role="option" tabindex="0">
          ${renderAvatarHtml(p)}
          <div class="suggestion-pro-info">
            <div class="suggestion-pro-name-row">
              <span class="suggestion-pro-name">${highlightMatch(p.name, query)}</span>
              ${p.verified ? '<i class="fa-solid fa-circle-check suggestion-pro-badge" title="Verificado"></i>' : ''}
            </div>
            <div class="suggestion-pro-sub">${highlightMatch(p.specialty || p.headline || '', query)}</div>
            <div class="suggestion-pro-meta">
              <span class="suggestion-pro-rating"><i class="fa-solid fa-star"></i> ${p.rating ? p.rating.toFixed(1) : '5.0'}</span>
              <span class="suggestion-pro-bairro"><i class="fa-solid fa-location-dot"></i> ${safeEscape(p.neighborhood || 'Parauapebas')}</span>
            </div>
          </div>
          <i class="fa-solid fa-chevron-right suggestion-pro-arrow"></i>
        </div>
      `).join('');

      html += `
        <div class="suggestion-view-all-banner" data-search="${safeEscape(query)}">
          <span><i class="fa-solid fa-list-check"></i> Ver todos os ${matchedPros.length} profissionais encontrados</span>
          <i class="fa-solid fa-arrow-right"></i>
        </div>
        <div class="dropdown-group">
          <div class="dropdown-header-row">
            <span><i class="fa-solid fa-user-check"></i> Profissionais sugeridos (${matchedPros.length})</span>
          </div>
          <div class="suggestion-pros-list">
            ${prosHtml}
          </div>
        </div>
      `;
    } else if (matchedServices.length === 0) {
      // Estado Vazio
      const chipsHtml = POPULAR_SERVICES.slice(0, 4).map(s => `
        <div class="suggestion-chip" data-search="${s.query}">
          <i class="fa-solid ${s.icon}"></i>
          <span>${s.label}</span>
        </div>
      `).join('');

      html = `
        <div class="suggestion-empty-state">
          <div class="suggestion-empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          <div class="suggestion-empty-title">Nenhum profissional encontrado para "${safeEscape(query)}"</div>
          <div class="suggestion-empty-desc">Tente buscar por especialidade (ex: eletricista, diarista, pintor) ou bairro em Parauapebas.</div>
        </div>
        <div class="dropdown-group">
          <div class="dropdown-header-row">
            <span><i class="fa-solid fa-bolt"></i> Tente uma destas categorias</span>
          </div>
          <div class="suggestion-chips-grid">
            ${chipsHtml}
          </div>
        </div>
      `;
    }

    dropdown.innerHTML = html;
    attachDropdownListeners();
    openDropdown();
  }

  function attachDropdownListeners() {
    // Clique nos chips -> abre a lista de profissionais daquela categoria!
    dropdown.querySelectorAll('.suggestion-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const term = chip.getAttribute('data-search') || chip.innerText.trim();
        searchInput.value = term;
        clearBtn.style.display = 'inline-flex';
        closeDropdown();
        openProListModal(term);
      });
    });

    // Clique no banner 'Ver todos os profissionais'
    dropdown.querySelectorAll('.suggestion-view-all-banner').forEach(banner => {
      banner.addEventListener('click', (e) => {
        e.stopPropagation();
        const term = banner.getAttribute('data-search') || searchInput.value;
        closeDropdown();
        openProListModal(term);
      });
    });

    // Clique no profissional -> abre vitrine diretamente na Home!
    dropdown.querySelectorAll('.suggestion-pro-item').forEach(item => {
      const proId = item.getAttribute('data-pro-id');
      const handleSelect = (e) => {
        e.stopPropagation();
        closeDropdown();
        if (typeof openProDetail === 'function') {
          openProDetail(proId);
        }
      };
      item.addEventListener('click', handleSelect);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSelect(e);
      });
    });
  }

  // Input listener
  searchInput.addEventListener('input', () => {
    const val = searchInput.value;
    if (val.trim().length > 0) {
      clearBtn.style.display = 'inline-flex';
      renderSearchResultsSuggestions(val);
    } else {
      clearBtn.style.display = 'none';
      renderDefaultSuggestions();
    }
  });

  // Focus listener
  searchInput.addEventListener('focus', () => {
    const val = searchInput.value;
    if (val.trim().length > 0) {
      renderSearchResultsSuggestions(val);
    } else {
      renderDefaultSuggestions();
    }
  });

  // Clear button
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    searchInput.value = '';
    clearBtn.style.display = 'none';
    renderDefaultSuggestions();
    searchInput.focus();
  });

  // Teclado
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'Enter') {
      // Abre a lista de profissionais para o termo digitado
      const term = searchInput.value.trim();
      if (term) {
        closeDropdown();
        openProListModal(term);
      }
    }
  });

  // Clique fora fecha o dropdown
  document.addEventListener('click', (e) => {
    if (!searchWrapper.contains(e.target)) {
      closeDropdown();
    }
  });
}

// ==============================================================================
// SISTEMA DE AUTENTICAÇÃO E CADASTRO MULTI-ETAPAS (GO PARAUAPEBAS)
// ==============================================================================

let currentUser = null;

// Inicializa o Gerenciador de Autenticação
function initAuthManager() {
  getCurrentUser();
  renderAuthUI();
  if (typeof populateProCategoryOptions === 'function') {
    populateProCategoryOptions();
  }
  syncCurrentUserProfileFromSupabase();
}

// Sincroniza os dados da sessão do usuário logado diretamente com public.profiles no Supabase
async function syncCurrentUserProfileFromSupabase() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    let queryParam = '';
    if (user.id && !String(user.id).startsWith('u_')) {
      queryParam = `id=eq.${encodeURIComponent(user.id)}`;
    } else if (user.email) {
      queryParam = `email=eq.${encodeURIComponent(user.email.trim().toLowerCase())}`;
    } else {
      return;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?${queryParam}&select=*&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    if (!res.ok) return;
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return;

    const dbProfile = rows[0];
    const city = dbProfile.city || user.city || 'Parauapebas';
    const state = dbProfile.state || user.state || 'PA';

    user.id = dbProfile.id || user.id;
    user.name = dbProfile.full_name || user.name;
    user.email = dbProfile.email || user.email;
    user.phone = dbProfile.phone_whatsapp || user.phone;
    user.role = dbProfile.role || user.role;
    user.city = city;
    user.state = state;
    user.cep = dbProfile.cep || user.cep || '';
    user.neighborhood = `${city}, ${state}`;
    if (dbProfile.avatar_url) user.avatar = dbProfile.avatar_url;
    if (user.role === 'professional' && dbProfile.id) {
      user.proId = 'db_' + dbProfile.id.slice(0, 8);
    }

    currentUser = user;
    localStorage.setItem('go_currentUser', JSON.stringify(currentUser));
    renderAuthUI();
  } catch (_) {}
}

// Obtém o usuário atual persistido no localStorage (ou null se visitante)
function getCurrentUser() {
  if (!currentUser) {
    const stored = localStorage.getItem('go_currentUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Limpa dados de usuário fictício de testes caso tenha ficado em cache
        if (parsed && (parsed.id === 'u_client_1' || parsed.email === 'joao.silva@goparauapebas.com')) {
          localStorage.removeItem('go_currentUser');
          currentUser = null;
        } else {
          currentUser = parsed;
        }
      } catch (err) {
        currentUser = null;
      }
    }
  }
  return currentUser;
}

// Atualiza os componentes visuais com os dados do usuário autenticado
function renderAuthUI() {
  const user = getCurrentUser();

  // 1. Atualizar Saudação no Header da Home
  const greetingEl = document.querySelector('.greeting-text');
  if (greetingEl) {
    greetingEl.textContent = user ? `Olá, ${user.name.split(' ')[0]}` : 'Olá, Visitante';
  }

  // 2. Atualizar Card do Usuário na Aba Perfil
  const nameEl = document.getElementById('profile-user-name');
  const emailEl = document.getElementById('profile-user-email');
  const locEl = document.getElementById('profile-user-loc');
  const badgeEl = document.getElementById('profile-user-badge');
  const avatarImg = document.getElementById('profile-avatar-img');
  const avatarIcon = document.getElementById('profile-avatar-icon');

  if (nameEl) nameEl.textContent = user ? user.name : 'Visitante';
  if (emailEl) emailEl.textContent = user ? user.email : 'Toque em entrar para acessar sua conta';
  if (locEl) {
    const userLocText = user
      ? `${user.city || currentActiveLocation.city || 'Parauapebas'}, ${user.state || currentActiveLocation.state || 'PA'}`
      : `${currentActiveLocation.city || 'Parauapebas'}, ${currentActiveLocation.state || 'PA'}`;
    locEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${userLocText}`;
  }

  if (badgeEl) {
    if (!user) {
      badgeEl.textContent = 'Visitante';
      badgeEl.className = 'user-role-badge';
    } else if (user.role === 'professional') {
      badgeEl.textContent = 'Profissional';
      badgeEl.className = 'user-role-badge pro';
    } else {
      badgeEl.textContent = 'Cliente';
      badgeEl.className = 'user-role-badge';
    }
  }

  if (avatarImg && avatarIcon) {
    if (user && user.avatar) {
      avatarImg.src = user.avatar;
      avatarImg.style.display = 'block';
      avatarIcon.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarIcon.style.display = 'block';
    }
  }

  // 3. Atualizar Banner da Área do Profissional
  const proCardTitle = document.getElementById('pro-card-title');
  const proCardDesc = document.getElementById('pro-card-desc');
  const proBtnText = document.getElementById('pro-btn-text');
  const proCardIcon = document.getElementById('pro-card-icon');

  if (proCardTitle && proCardDesc && proBtnText) {
    if (user && user.role === 'professional') {
      proCardTitle.textContent = 'Área do Profissional';
      proCardDesc.textContent = 'Gerencie seus serviços, orçamentos e sua vitrine pública';
      proBtnText.textContent = 'Acessar Vitrine';
      if (proCardIcon) proCardIcon.className = 'fa-solid fa-briefcase pro-badge-icon';
    } else if (user && user.role === 'client') {
      proCardTitle.textContent = 'Quero ser Profissional';
      proCardDesc.textContent = 'Crie sua vitrine digital e receba orçamentos de clientes';
      proBtnText.textContent = 'Cadastrar';
      if (proCardIcon) proCardIcon.className = 'fa-solid fa-user-tie pro-badge-icon';
    } else {
      proCardTitle.textContent = 'Área do Profissional';
      proCardDesc.textContent = 'Crie sua vitrine profissional ou acesse sua conta';
      proBtnText.textContent = 'Entrar';
      if (proCardIcon) proCardIcon.className = 'fa-solid fa-briefcase pro-badge-icon';
    }
  }

  // 4. Botão de Logout / Login no Menu
  const logoutLabel = document.getElementById('logout-text-label');
  const logoutBtn = document.getElementById('btn-profile-logout');
  if (logoutLabel && logoutBtn) {
    if (user) {
      logoutLabel.textContent = 'Sair da conta';
      logoutBtn.className = 'menu-item logout-item';
    } else {
      logoutLabel.textContent = 'Entrar ou Criar Conta';
      logoutBtn.className = 'menu-item';
    }
  }
}

// Clique na Área do Profissional (Direcionamento Inteligente de Acordo com o Papel)
function handleProAreaClick() {
  const user = getCurrentUser();
  if (user && user.role === 'professional') {
    // Abre vitrine em modo proprietário
    openProVitrine(user.proId || 'p1', true);
  } else if (user && user.role === 'client') {
    // Usuário já autenticado como cliente: vincula e abre cadastro profissional sem pedir nova conta
    openProSignup();
  } else {
    // Visitante: abre tela de boas-vindas
    openAuthWelcome();
  }
}

// Marcação de Onboarding visto no primeiro acesso
function markOnboardingAsSeen() {
  try {
    localStorage.setItem('trampou_has_seen_onboarding', 'true');
  } catch (e) {
    console.warn('Erro ao salvar status de onboarding:', e);
  }
}
window.markOnboardingAsSeen = markOnboardingAsSeen;

// Verifica se é o primeiro acesso para exibir o Onboarding automaticamente
function checkFirstTimeOnboarding() {
  try {
    const hasSeen = localStorage.getItem('trampou_has_seen_onboarding');
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    
    // Se ainda não viu o onboarding e não tem sessão ativa, exibe o onboarding de boas-vindas
    if (!hasSeen && !user) {
      setTimeout(() => {
        openAuthWelcome();
      }, 350);
    }
  } catch (e) {
    console.warn('Erro ao checar primeiro acesso:', e);
  }
}
window.checkFirstTimeOnboarding = checkFirstTimeOnboarding;

// Reset para testes rápidos no console: resetOnboardingTest()
window.resetOnboardingTest = function() {
  localStorage.removeItem('trampou_has_seen_onboarding');
  window.location.reload();
};

// ==============================================================================
// SISTEMA DE REGRAS DE ACESSO & INCENTIVO DE CADASTRO (AUTH GATE)
// Permite navegação livre ao visitante, mas bloqueia ações restritas com modal educativo
// ==============================================================================

const AUTH_GATED_FEATURES = {
  sos: {
    icon: 'fa-solid fa-truck-medical',
    iconColor: '#DC2626',
    iconBg: '#FEE2E2',
    badge: 'Segurança & Emergência',
    title: 'SOS Exclusivo para Cadastrados',
    description: 'Para o acionamento de emergência com envio rápido de profissionais ao seu local em Parauapebas, é necessário ter um perfil ativo.',
    benefit: 'Seus dados e telefone ficam seguros e prontos para socorro rápido.'
  },
  deal: {
    icon: 'fa-solid fa-handshake',
    iconColor: '#4F46E5',
    iconBg: '#EEF2FF',
    badge: 'Negociação Protegida',
    title: 'Feche Acordos com Garantia',
    description: 'Registrar o serviço combinado no chat garante os detalhes acordados e habilita a avaliação verificada ao término do trabalho.',
    benefit: 'Atendimento protegido e histórico de serviços no seu perfil.'
  },
  review: {
    icon: 'fa-solid fa-star',
    iconColor: '#D97706',
    iconBg: '#FEF3C7',
    badge: 'Comunidade Confiável',
    title: 'Avalie com Perfil Verificado',
    description: 'No Trampou, cada nota vem de uma pessoa real! Crie sua conta para compartilhar sua experiência e fortalecer os melhores profissionais.',
    benefit: 'Sua nota ganha o selo de Cliente Verificado de Parauapebas.'
  },
  like: {
    icon: 'fa-solid fa-heart',
    iconColor: '#E11D48',
    iconBg: '#FFE4E6',
    badge: 'Apoie o Profissional',
    title: 'Curta Fotos e Trabalhos',
    description: 'Crie seu perfil gratuito para curtir as fotos dos serviços concluídos e valorizar a dedicação dos trabalhadores da cidade.',
    benefit: 'Interaja e acompanhe as novidades dos profissionais favoritos.'
  },
  favorite: {
    icon: 'fa-solid fa-bookmark',
    iconColor: '#7C3AED',
    iconBg: '#F3E8FF',
    badge: 'Sua Lista Pessoal',
    title: 'Salve nos seus Favoritos',
    description: 'Crie sua conta para salvar profissionais de confiança e encontrá-los sempre que precisar de reparos ou manutenções.',
    benefit: 'Seus prestadores prediletos guardados e acessíveis a 1 toque.'
  },
  feedback: {
    icon: 'fa-solid fa-lightbulb',
    iconColor: '#9333EA',
    iconBg: '#FAF5FF',
    badge: 'Construa Conosco',
    title: 'Envie sua Sugestão',
    description: 'Crie sua conta para nos enviar ideias, sugestões de melhorias ou elogios e receber a resposta da nossa equipe.',
    benefit: 'Participe diretamente das novidades e atualizações do Trampou.'
  }
};

let currentGatedFeature = 'deal';

function requireUserAuth(featureKey) {
  const user = (typeof getCurrentUser === 'function' ? getCurrentUser() : null);
  if (user && user.id) {
    return true; // Usuário autenticado, libera o recurso!
  }
  openAuthGateModal(featureKey || 'deal');
  return false; // Visitante bloqueado, abre modal persuasivo
}
window.requireUserAuth = requireUserAuth;

function openAuthGateModal(featureKey) {
  currentGatedFeature = featureKey || 'deal';
  const config = AUTH_GATED_FEATURES[featureKey] || AUTH_GATED_FEATURES.deal;

  const modal = document.getElementById('auth-gate-modal');
  const badgeEl = document.getElementById('auth-gate-badge');
  const iconWrap = document.getElementById('auth-gate-icon-wrapper');
  const iconEl = document.getElementById('auth-gate-icon');
  const titleEl = document.getElementById('auth-gate-title');
  const descEl = document.getElementById('auth-gate-description');
  const benefitEl = document.getElementById('auth-gate-benefit-text');

  if (badgeEl) badgeEl.innerHTML = `<i class="fa-solid fa-sparkles"></i> ${config.badge}`;
  if (iconWrap) {
    iconWrap.style.background = config.iconBg;
    iconWrap.style.color = config.iconColor;
    iconWrap.style.boxShadow = `0 12px 24px -6px ${config.iconBg}`;
  }
  if (iconEl) {
    iconEl.className = config.icon;
    iconEl.style.color = config.iconColor;
  }
  if (titleEl) titleEl.textContent = config.title;
  if (descEl) descEl.textContent = config.description;
  if (benefitEl) benefitEl.textContent = config.benefit;

  if (modal) modal.classList.add('active');
}
window.openAuthGateModal = openAuthGateModal;

function closeAuthGateModal() {
  const modal = document.getElementById('auth-gate-modal');
  if (modal) modal.classList.remove('active');
}
window.closeAuthGateModal = closeAuthGateModal;

function proceedToSignupFromGate() {
  closeAuthGateModal();
  openClientSignup();
}
window.proceedToSignupFromGate = proceedToSignupFromGate;

function proceedToLoginFromGate() {
  closeAuthGateModal();
  openLoginModal();
}
window.proceedToLoginFromGate = proceedToLoginFromGate;

function triggerProReviewFromModal() {
  closeReviewsModal();
  if (!requireUserAuth('review')) return;
  showToast('Para avaliar, finalize e confirme um atendimento pelo chat.');
}
window.triggerProReviewFromModal = triggerProReviewFromModal;

// Abertura e Fechamento de Modais de Auth & Sistema
function openAuthModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  } else {
    console.warn('[Modal] Elemento não encontrado:', modalId);
  }
}

function openAuthWelcome() {
  closeAllAuthModals();
  const overlay = document.getElementById('auth-welcome-overlay');
  if (overlay) overlay.classList.add('active');
}

function closeAuthModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
  if (modalId === 'auth-welcome-overlay') {
    markOnboardingAsSeen();
  }
}

function closeAllAuthModals() {
  const modals = [
    'auth-welcome-overlay',
    'auth-gate-modal',
    'auth-login-modal',
    'auth-recovery-modal',
    'auth-client-signup-modal',
    'auth-pro-signup-modal',
    'edit-profile-modal',
    'privacy-hub-modal',
    'privacy-policy-modal',
    'terms-of-use-modal',
    'dpo-channel-modal',
    'delete-account-confirm-modal',
    'modal-location-picker',
    'modal-app-feedback'
  ];
  modals.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
}

function openLoginModal() {
  markOnboardingAsSeen();
  closeAllAuthModals();
  const modal = document.getElementById('auth-login-modal');
  if (modal) {
    modal.classList.add('active');
    const errAlert = document.getElementById('login-error-alert');
    if (errAlert) errAlert.style.display = 'none';
  }
}

function openRecoveryModal() {
  closeAllAuthModals();
  const modal = document.getElementById('auth-recovery-modal');
  if (modal) {
    modal.classList.add('active');
    const recAlert = document.getElementById('recovery-alert');
    if (recAlert) recAlert.style.display = 'none';
  }
}

function openClientSignup() {
  markOnboardingAsSeen();
  closeAllAuthModals();
  const modal = document.getElementById('auth-client-signup-modal');
  if (modal) {
    modal.classList.add('active');
    const errAlert = document.getElementById('client-signup-error');
    if (errAlert) errAlert.style.display = 'none';
  }
}

function openProSignup() {
  markOnboardingAsSeen();
  closeAllAuthModals();
  initProWizard();
  const modal = document.getElementById('auth-pro-signup-modal');
  if (modal) modal.classList.add('active');
}

// Alternar visibilidade de senhas
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!input || !icon) return;

  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.setAttribute('type', 'password');
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
}

// Login
async function handleLoginSubmit(event) {
  event.preventDefault();
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  const btn = document.getElementById('btn-login-submit');
  const label = document.getElementById('btn-login-label');
  const arrow = document.getElementById('btn-login-arrow');
  const spinner = document.getElementById('btn-login-spinner');
  const errorAlert = document.getElementById('login-error-alert');
  const errorText = document.getElementById('login-error-text');

  if (!identifier || !password) {
    if (errorAlert && errorText) {
      errorAlert.style.display = 'flex';
      errorText.textContent = 'Por favor, preencha o e-mail/telefone e a senha.';
    }
    return;
  }

  // Estado de carregamento
  btn.disabled = true;
  label.textContent = 'Autenticando...';
  if (arrow) arrow.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';
  if (errorAlert) errorAlert.style.display = 'none';

  try {
    // 1. Tenta autenticação real no Supabase Auth
    let supabaseSuccess = false;
    let authUser = null;
    let authSessionToken = null;
    let profileData = null;

    if (identifier.includes('@') && window.fetch) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ email: identifier.trim().toLowerCase(), password }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          supabaseSuccess = true;
          authUser = data.user;
          authSessionToken = data.access_token;
          if (authSessionToken) {
            localStorage.setItem('go_supabase_token', authSessionToken);
          }

          // Busca perfil correspondente no banco Supabase
          try {
            const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authUser.id}&select=*`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${authSessionToken}`
              }
            });
            if (pRes.ok) {
              const pData = await pRes.json();
              if (Array.isArray(pData) && pData.length > 0) profileData = pData[0];
            }
          } catch (_) {}
        }
      } catch (networkErr) {
        console.warn('Falha de conexão com Supabase Auth:', networkErr);
      }
    }

    // 2. Validação local (fallback para contas registradas offline)
    const localUsers = JSON.parse(localStorage.getItem('go_all_users') || '[]');
    const matchedLocal = localUsers.find(u => 
      (u.email.toLowerCase() === identifier.toLowerCase().trim() || u.phone === identifier.trim()) && 
      u.password === password
    );

    if (supabaseSuccess || matchedLocal) {
      let loggedUser;

      if (supabaseSuccess && authUser) {
        const role = (profileData && profileData.role) || (authUser.user_metadata && authUser.user_metadata.role) || 'client';
        const fullName = (profileData && profileData.full_name) || (authUser.user_metadata && authUser.user_metadata.full_name) || identifier.split('@')[0];
        const phone = (profileData && profileData.phone_whatsapp) || (authUser.user_metadata && authUser.user_metadata.phone_whatsapp) || '';
        const avatar = (profileData && profileData.avatar_url) || (authUser.user_metadata && authUser.user_metadata.avatar_url) || '';
        const city = (profileData && profileData.city) || (authUser.user_metadata && authUser.user_metadata.city) || currentActiveLocation.city || 'Parauapebas';
        const state = ((profileData && profileData.state) || (authUser.user_metadata && authUser.user_metadata.state) || currentActiveLocation.state || 'PA').toUpperCase();
        const cep = (profileData && profileData.cep) || (authUser.user_metadata && authUser.user_metadata.cep) || '';
        const neighborhood = `${city}, ${state}`;

        let proId = null;
        if (role === 'professional') {
          proId = 'db_' + authUser.id.slice(0, 8);
        }

        loggedUser = {
          id: authUser.id,
          name: fullName,
          email: authUser.email || identifier,
          phone: phone,
          role: role,
          city: city,
          state: state,
          cep: cep,
          neighborhood: neighborhood,
          avatar: avatar,
          proId: proId
        };

        setActiveLocation(city, state, null, null, false);
        await loadProfessionalsFromSupabase();
      } else if (matchedLocal) {
        loggedUser = { ...matchedLocal };
        delete loggedUser.password;
      }

      currentUser = loggedUser;
      localStorage.setItem('go_currentUser', JSON.stringify(currentUser));
      renderAuthUI();

      closeAuthModal('auth-login-modal');
      showToast(`Bem-vindo de volta, ${currentUser.name}!`);

      if (currentUser.role === 'professional') {
        openProVitrine(currentUser.proId || 'p1', true);
      } else {
        switchTab('home');
      }
    } else {
      throw new Error('E-mail/telefone ou senha incorretos. Por favor, verifique seus dados ou crie uma conta.');
    }
  } catch (err) {
    if (errorAlert && errorText) {
      errorAlert.style.display = 'flex';
      errorText.textContent = err.message || 'E-mail ou senha incorretos. Tente novamente.';
    }
  } finally {
    btn.disabled = false;
    label.textContent = 'Entrar';
    if (arrow) arrow.style.display = 'inline-block';
    if (spinner) spinner.style.display = 'none';
  }
}

// Recuperação de Senha
async function handleRecoverySubmit(event) {
  event.preventDefault();
  const identifier = document.getElementById('recovery-identifier').value.trim();
  const alertBox = document.getElementById('recovery-alert');
  const alertText = document.getElementById('recovery-alert-text');
  const btn = document.getElementById('btn-recovery-submit');
  const label = document.getElementById('btn-recovery-label');
  const spinner = document.getElementById('btn-recovery-spinner');

  if (!identifier) return;

  btn.disabled = true;
  label.textContent = 'Enviando...';
  if (spinner) spinner.style.display = 'inline-block';

  try {
    if (identifier.includes('@')) {
      await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ email: identifier })
      }).catch(() => {});
    }

    setTimeout(() => {
      alertBox.className = 'auth-alert success';
      alertBox.style.display = 'flex';
      alertText.textContent = `Instruções de redefinição de senha enviadas com sucesso para ${identifier}. Verifique seu contato.`;
      btn.disabled = false;
      label.textContent = 'Enviar instruções';
      if (spinner) spinner.style.display = 'none';
    }, 700);
  } catch (err) {
    btn.disabled = false;
    label.textContent = 'Enviar instruções';
    if (spinner) spinner.style.display = 'none';
  }
}

// Cadastro do Cliente
async function handleClientSignupSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('client-name').value.trim();
  const email = document.getElementById('client-email').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const password = document.getElementById('client-password').value;
  const passwordConfirm = document.getElementById('client-password-confirm').value;
  const termsCheck = document.getElementById('client-terms-check').checked;

  const errorAlert = document.getElementById('client-signup-error');
  const errorText = document.getElementById('client-signup-error-text');
  const btn = document.getElementById('btn-client-signup-submit');
  const label = document.getElementById('btn-client-signup-label');
  const arrow = document.getElementById('btn-client-signup-arrow');
  const spinner = document.getElementById('btn-client-signup-spinner');

  if (!name || name.length < 3) {
    errorAlert.style.display = 'flex';
    errorText.textContent = 'Informe seu nome completo (mínimo 3 letras).';
    return;
  }
  if (!email || !email.includes('@')) {
    errorAlert.style.display = 'flex';
    errorText.textContent = 'Informe um e-mail válido.';
    return;
  }
  if (!phone || phone.length < 8) {
    errorAlert.style.display = 'flex';
    errorText.textContent = 'Informe um telefone ou WhatsApp com DDD.';
    return;
  }
  if (!password || password.length < 6) {
    errorAlert.style.display = 'flex';
    errorText.textContent = 'A senha deve conter no mínimo 6 caracteres.';
    return;
  }
  if (password !== passwordConfirm) {
    errorAlert.style.display = 'flex';
    errorText.textContent = 'As senhas digitadas não coincidem.';
    return;
  }
  if (!termsCheck) {
    errorAlert.style.display = 'flex';
    errorText.textContent = 'Você deve aceitar os Termos de Uso e Política de Privacidade.';
    return;
  }

  // Prevenção de duplo envio
  btn.disabled = true;
  label.textContent = 'Criando conta...';
  if (arrow) arrow.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';
  if (errorAlert) errorAlert.style.display = 'none';

  const state = (document.getElementById('client-state') ? document.getElementById('client-state').value : 'PA').trim().toUpperCase();
  const city = (document.getElementById('client-city') ? document.getElementById('client-city').value : 'Parauapebas').trim() || 'Parauapebas';
  const cep = (document.getElementById('client-cep') ? document.getElementById('client-cep').value : '').trim();
  const neighborhood = `${city}, ${state}`;
  const latVal = document.getElementById('client-lat') ? document.getElementById('client-lat').value : '';
  const lngVal = document.getElementById('client-lng') ? document.getElementById('client-lng').value : '';
  const lat = latVal ? parseFloat(latVal) : null;
  const lng = lngVal ? parseFloat(lngVal) : null;

  try {
    let supabaseUserId = null;
    // Tenta registrar no Supabase Auth com metadados de localização geográfica
    try {
      const sRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          data: {
            full_name: name.trim(),
            role: 'client',
            phone_whatsapp: phone.trim(),
            city: city,
            state: state,
            cep: cep,
            neighborhood: neighborhood,
            latitude: lat,
            longitude: lng
          }
        })
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        supabaseUserId = (sData.user && sData.user.id) || sData.id || null;
        if (sData.access_token) localStorage.setItem('go_supabase_token', sData.access_token);
      }
    } catch (_) {}

    // Salva usuário no banco local para login persistente e offline
    const localUsers = JSON.parse(localStorage.getItem('go_all_users') || '[]');
    const existingIndex = localUsers.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    const newUserData = {
      id: supabaseUserId || ('u_' + Date.now()),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: 'client',
      city: city,
      state: state,
      neighborhood: neighborhood || city,
      latitude: lat,
      longitude: lng,
      avatar: '',
      proId: null
    };

    if (existingIndex >= 0) {
      localUsers[existingIndex] = newUserData;
    } else {
      localUsers.push(newUserData);
    }
    localStorage.setItem('go_all_users', JSON.stringify(localUsers));

    // Define sessão ativa
    const sessionUser = { ...newUserData };
    delete sessionUser.password;
    currentUser = sessionUser;
    localStorage.setItem('go_currentUser', JSON.stringify(currentUser));

    // Ativa a cidade de cadastro do cliente
    if (typeof setActiveLocation === 'function') {
      setActiveLocation(city, state, lat, lng, !!lat);
    }

    renderAuthUI();
    closeAuthModal('auth-client-signup-modal');
    showToast(`🎉 Conta criada com sucesso! Bem-vindo(a), ${name.split(' ')[0]}!`);
    switchTab('home');

  } catch (err) {
    if (errorAlert && errorText) {
      errorAlert.style.display = 'flex';
      errorText.textContent = err.message || 'Erro ao criar conta. Tente novamente.';
    }
  } finally {
    btn.disabled = false;
    label.textContent = 'Criar Conta e Continuar';
    if (arrow) arrow.style.display = 'inline-block';
    if (spinner) spinner.style.display = 'none';
  }
}

// ==============================================================================
// WIZARD DE CADASTRO DO PROFISSIONAL EM 4 ETAPAS (COM SALVAMENTO DE RASCUNHO)
// ==============================================================================

let currentProStep = 1;
let proWizardData = {
  account: { name: '', email: '', phone: '', password: '', terms: false },
  profile: {
    commercialName: '',
    category: '',
    specialties: ['Instalações Novas', 'Residencial'],
    city: 'Parauapebas',
    state: 'PA',
    cep: '',
    neighborhoods: ['Parauapebas, PA'],
    bio: ''
  },
  vitrine: {
    avatar: '',
    photos: [],
    extraInfo: ''
  }
};

// ==============================================================================
// GESTÃO DE CATEGORIAS DINÂMICAS (PERMITE CRIAR E REAPROVEITAR NOVAS CATEGORIAS)
// ==============================================================================
const BASE_PRO_CATEGORIES = [
  { value: 'Eletricista', label: 'Eletricista Residencial e Comercial' },
  { value: 'Ar-Condicionado', label: 'Técnico em Refrigeração & Split' },
  { value: 'Encanador', label: 'Encanador e Bombeiro Hidráulico' },
  { value: 'Pedreiro', label: 'Pedreiro e Reformas Gerais' },
  { value: 'Pintor', label: 'Pintor e Texturas' },
  { value: 'Diarista', label: 'Diarista e Limpeza Pesada' },
  { value: 'Mecânico', label: 'Mecânico e Socorro Automotivo' },
  { value: 'Marceneiro', label: 'Marcenaria e Montagem de Móveis' },
  { value: 'Informática', label: 'Técnico em Informática e Redes' },
  { value: 'Fretes', label: 'Fretes e Carretos' }
];

function getCustomCategories() {
  try {
    const raw = localStorage.getItem('go_custom_categories');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addCustomCategory(catName) {
  if (!catName || catName.trim().length < 3) return null;
  const raw = catName.trim();
  const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
  let customCats = getCustomCategories();
  if (!customCats.includes(formatted)) {
    customCats.push(formatted);
    localStorage.setItem('go_custom_categories', JSON.stringify(customCats));
  }
  populateProCategoryOptions(formatted);
  if (typeof fetchCategories === 'function') {
    fetchCategories();
  }
  if (typeof renderExploreCategoryChips === 'function') {
    renderExploreCategoryChips();
  }
  return formatted;
}

function populateProCategoryOptions(selectedVal = null) {
  const select = document.getElementById('pro-main-category');
  if (!select) return;

  const currentSelection = selectedVal !== null ? selectedVal : select.value;
  const customCats = getCustomCategories();

  let html = `<option value="">Selecione sua profissão...</option>`;

  // Categorias padrão
  BASE_PRO_CATEGORIES.forEach(c => {
    html += `<option value="${c.value}">${c.label}</option>`;
  });

  // Categorias novas adicionadas pelos profissionais
  if (customCats.length > 0) {
    html += `<optgroup label="✨ Novas categorias criadas">`;
    customCats.forEach(cat => {
      html += `<option value="${cat}">${cat}</option>`;
    });
    html += `</optgroup>`;
  }

  // Opção para criar nova categoria
  html += `<option value="__NEW__">➕ Outra profissão / Criar nova categoria...</option>`;

  select.innerHTML = html;

  if (currentSelection) {
    select.value = currentSelection;
  }
}

function handleProCategoryChange(val) {
  const box = document.getElementById('new-category-box');
  const input = document.getElementById('new-category-input');
  if (val === '__NEW__') {
    if (box) {
      box.style.display = 'block';
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  } else {
    if (box) box.style.display = 'none';
  }
}

function toggleNewCategoryField() {
  const box = document.getElementById('new-category-box');
  const select = document.getElementById('pro-main-category');
  const input = document.getElementById('new-category-input');
  if (!box) return;

  const isVisible = box.style.display === 'block';
  if (isVisible) {
    box.style.display = 'none';
    if (select && select.value === '__NEW__') select.value = '';
  } else {
    box.style.display = 'block';
    if (select) select.value = '__NEW__';
    if (input) {
      input.focus();
    }
  }
}

function confirmAddCustomCategory() {
  const input = document.getElementById('new-category-input');
  if (!input) return;
  const raw = input.value.trim();
  if (!raw || raw.length < 3) {
    showToast('Digite o nome da profissão ou serviço (mínimo 3 letras).');
    input.focus();
    return;
  }

  const createdName = addCustomCategory(raw);
  const select = document.getElementById('pro-main-category');
  if (select && createdName) {
    select.value = createdName;
  }

  const box = document.getElementById('new-category-box');
  if (box) box.style.display = 'none';
  input.value = '';

  showToast(`✅ Categoria "${createdName}" cadastrada e selecionada!`);
}

// Inicializa o Wizard do Profissional
function initProWizard() {
  currentProStep = 1;

  // Carrega rascunho anterior se existir
  const savedDraft = localStorage.getItem('go_pro_wizard_draft');
  if (savedDraft) {
    try {
      proWizardData = JSON.parse(savedDraft);
    } catch (_) {}
  }

  // Verifica se o usuário já possui conta autenticada
  const user = getCurrentUser();
  const loggedBanner = document.getElementById('pro-already-logged-banner');
  const loggedName = document.getElementById('logged-user-display-name');
  const accountInputsWrap = document.getElementById('pro-account-inputs-wrap');

  if (user && user.role === 'client') {
    // Vinculação inteligente com conta existente: reaproveita dados
    proWizardData.account.name = user.name;
    proWizardData.account.email = user.email;
    proWizardData.account.phone = user.phone;
    proWizardData.account.terms = true;

    if (loggedBanner) loggedBanner.style.display = 'flex';
    if (loggedName) loggedName.textContent = user.name;
    if (accountInputsWrap) accountInputsWrap.style.display = 'none';
  } else {
    if (loggedBanner) loggedBanner.style.display = 'none';
    if (accountInputsWrap) accountInputsWrap.style.display = 'block';
  }

  // Preenche campos da Etapa 1
  const proNameInput = document.getElementById('pro-name');
  const proEmailInput = document.getElementById('pro-email');
  const proPhoneInput = document.getElementById('pro-phone');
  if (proNameInput) proNameInput.value = proWizardData.account.name || '';
  if (proEmailInput) proEmailInput.value = proWizardData.account.email || '';
  if (proPhoneInput) proPhoneInput.value = proWizardData.account.phone || '';

  // Preenche campos da Etapa 2
  const commNameInput = document.getElementById('pro-commercial-name');
  const bioInput = document.getElementById('pro-bio');
  const proStateSelect = document.getElementById('pro-state');
  const proCityInput = document.getElementById('pro-city');
  const proCepInput = document.getElementById('pro-cep');
  const proStatusEl = document.getElementById('pro-location-status');
  if (commNameInput) commNameInput.value = proWizardData.profile.commercialName || '';
  populateProCategoryOptions(proWizardData.profile.category || '');
  if (bioInput) bioInput.value = proWizardData.profile.bio || '';
  const initialState = proWizardData.profile.state || (user && user.state) || currentActiveLocation.state || 'PA';
  const initialCity = proWizardData.profile.city || (user && user.city) || currentActiveLocation.city || 'Parauapebas';
  if (proStateSelect) proStateSelect.value = initialState;
  if (proCityInput) proCityInput.value = initialCity;
  if (proCepInput) proCepInput.value = proWizardData.profile.cep || (user && user.cep) || '';
  if (proStatusEl) proStatusEl.style.display = 'none';
  fetchIbgeCitiesForState(initialState);

  // Preenche campos da Etapa 3
  const extraInfoInput = document.getElementById('pro-extra-info');
  if (extraInfoInput) extraInfoInput.value = proWizardData.vitrine.extraInfo || '';

  renderWizardGalleryGrid();
  updateWizardAvatarPreview();
  goStep(1);
}

// Salva o rascunho das etapas no localStorage
function saveProDraft() {
  localStorage.setItem('go_pro_wizard_draft', JSON.stringify(proWizardData));
  const draftToast = document.getElementById('wizard-draft-toast');
  if (draftToast) {
    draftToast.style.display = 'flex';
    setTimeout(() => { draftToast.style.display = 'none'; }, 2000);
  }
}

// Navegação entre as 4 etapas
function goStep(targetStep) {
  currentProStep = targetStep;

  // Atualiza indicadores visuais 1 a 4
  for (let i = 1; i <= 4; i++) {
    const ind = document.getElementById(`w-indicator-${i}`);
    const pane = document.getElementById(`step-pane-${i}`);
    if (ind) {
      ind.classList.remove('active', 'completed');
      if (i === currentProStep) {
        ind.classList.add('active');
      } else if (i < currentProStep) {
        ind.classList.add('completed');
      }
    }
    if (pane) {
      pane.classList.remove('active');
      if (i === currentProStep) pane.classList.add('active');
    }
  }

  // Atualiza conectores
  for (let c = 1; c <= 3; c++) {
    const conn = document.getElementById(`w-conn-${c}`);
    if (conn) {
      if (c < currentProStep) {
        conn.classList.add('active');
      } else {
        conn.classList.remove('active');
      }
    }
  }

  // Scroll do corpo para o topo
  const body = document.querySelector('.auth-wizard-body');
  if (body) body.scrollTop = 0;

  // Se chegou na revisão, renderiza o resumo
  if (currentProStep === 4) {
    renderProReviewSummary();
  }
}

// Validação por etapa antes de avançar
function validateAndGoStep(targetStep) {
  const user = getCurrentUser();

  if (targetStep === 2) {
    // Validar Etapa 1 se não estiver autenticado
    if (!user || user.role !== 'client') {
      const name = document.getElementById('pro-name').value.trim();
      const email = document.getElementById('pro-email').value.trim();
      const phone = document.getElementById('pro-phone').value.trim();
      const pwd = document.getElementById('pro-password').value;
      const pwdConfirm = document.getElementById('pro-password-confirm').value;
      const terms = document.getElementById('pro-terms-check').checked;

      if (!name || name.length < 3) {
        showToast('Informe seu nome completo na Etapa 1.');
        return;
      }
      if (!email || !email.includes('@')) {
        showToast('Informe um e-mail válido para sua conta profissional.');
        return;
      }
      if (!phone || phone.length < 8) {
        showToast('Informe seu telefone ou WhatsApp de atendimento.');
        return;
      }
      if (!pwd || pwd.length < 6) {
        showToast('A senha deve conter no mínimo 6 caracteres.');
        return;
      }
      if (pwd !== pwdConfirm) {
        showToast('As senhas não coincidem.');
        return;
      }
      if (!terms) {
        showToast('Você deve aceitar os Termos de Prestação de Serviços.');
        return;
      }

      proWizardData.account = { name, email, phone, password: pwd, terms: true };
    }
    saveProDraft();
    goStep(2);

  } else if (targetStep === 3) {
    // Validar Etapa 2 (Perfil profissional)
    const commName = document.getElementById('pro-commercial-name').value.trim();
    let cat = document.getElementById('pro-main-category').value;
    const newCatInput = document.getElementById('new-category-input');
    const bio = document.getElementById('pro-bio').value.trim();

    const proState = (document.getElementById('pro-state') ? document.getElementById('pro-state').value : 'PA').trim().toUpperCase();
    const proCity = (document.getElementById('pro-city') ? document.getElementById('pro-city').value : 'Parauapebas').trim();
    const proCep = (document.getElementById('pro-cep') ? document.getElementById('pro-cep').value : '').trim();
    const proLatVal = document.getElementById('pro-lat') ? document.getElementById('pro-lat').value : '';
    const proLngVal = document.getElementById('pro-lng') ? document.getElementById('pro-lng').value : '';

    // Se selecionou criar nova ou digitou no campo de nova categoria
    if (cat === '__NEW__' || (!cat && newCatInput && newCatInput.value.trim())) {
      const typed = newCatInput ? newCatInput.value.trim() : '';
      if (typed.length >= 3) {
        cat = addCustomCategory(typed);
        const sel = document.getElementById('pro-main-category');
        if (sel) sel.value = cat;
        const box = document.getElementById('new-category-box');
        if (box) box.style.display = 'none';
      } else {
        showToast('Digite o nome da sua profissão para cadastrar a nova categoria.');
        if (newCatInput) newCatInput.focus();
        return;
      }
    }

    if (!commName || commName.length < 3) {
      showToast('Informe o Nome Comercial ou Público para sua vitrine.');
      return;
    }
    if (!cat) {
      showToast('Selecione sua Profissão Principal ou crie uma nova categoria.');
      return;
    }
    if (!proCity || proCity.length < 2) {
      showToast('Informe sua cidade de atuação ou digite seu CEP.');
      const cityEl = document.getElementById('pro-city');
      if (cityEl) cityEl.focus();
      return;
    }

    const fullCityLabel = `${proCity}, ${proState}`;
    proWizardData.profile.commercialName = commName;
    proWizardData.profile.category = cat;
    proWizardData.profile.bio = bio;
    proWizardData.profile.state = proState;
    proWizardData.profile.city = proCity;
    proWizardData.profile.cep = proCep;
    proWizardData.profile.neighborhoods = [`Toda a cidade (${fullCityLabel})`];
    proWizardData.profile.lat = proLatVal ? parseFloat(proLatVal) : null;
    proWizardData.profile.lng = proLngVal ? parseFloat(proLngVal) : null;

    saveProDraft();
    goStep(3);

  } else if (targetStep === 4) {
    // Etapa 3 (Vitrine: fotos e campos complementares são opcionais)
    const extraInfo = document.getElementById('pro-extra-info').value.trim();
    proWizardData.vitrine.extraInfo = extraInfo;

    saveProDraft();
    goStep(4);
  }
}

// Botão Voltar no Wizard
function handleProWizardBack() {
  if (currentProStep > 1) {
    goStep(currentProStep - 1);
  } else {
    closeAuthModal('auth-pro-signup-modal');
  }
}

// Seleção de Chips de Especialidade
function toggleTagChip(el) {
  el.classList.toggle('active');
  const specName = el.textContent.trim();
  const list = proWizardData.profile.specialties;

  if (el.classList.contains('active')) {
    if (!list.includes(specName)) list.push(specName);
  } else {
    proWizardData.profile.specialties = list.filter(s => s !== specName);
  }
  saveProDraft();
}

// Seleção de Chips de Bairro
function toggleNeighborhoodChip(el) {
  el.classList.toggle('active');
  const bairro = el.textContent.trim();
  const list = proWizardData.profile.neighborhoods;

  if (el.classList.contains('active')) {
    if (!list.includes(bairro)) list.push(bairro);
  } else {
    proWizardData.profile.neighborhoods = list.filter(b => b !== bairro);
  }
  saveProDraft();
}

// Upload de Avatar no Wizard (com compressão inteligente)
async function handleWizardAvatarSelect(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    try {
      proWizardData.vitrine.avatar = await compressImageFile(file, 420, 0.84);
      updateWizardAvatarPreview();
      saveProDraft();
      showToast('📸 Foto de perfil otimizada com sucesso!');
    } catch (_) {}
  }
}

function updateWizardAvatarPreview() {
  const img = document.getElementById('wizard-avatar-img');
  const defIcon = document.getElementById('wizard-avatar-default-icon');
  const delBtn = document.getElementById('btn-remove-avatar');

  if (proWizardData.vitrine.avatar) {
    if (img) { img.src = proWizardData.vitrine.avatar; img.style.display = 'block'; }
    if (defIcon) defIcon.style.display = 'none';
    if (delBtn) delBtn.style.display = 'inline-flex';
  } else {
    if (img) { img.style.display = 'none'; }
    if (defIcon) defIcon.style.display = 'block';
    if (delBtn) delBtn.style.display = 'none';
  }
}

function removeWizardAvatar() {
  proWizardData.vitrine.avatar = '';
  const input = document.getElementById('wizard-avatar-input');
  if (input) input.value = '';
  updateWizardAvatarPreview();
  saveProDraft();
}

// Upload de Galeria de Fotos no Wizard (com compressão inteligente de até 6 fotos)
async function handleWizardGallerySelect(input) {
  if (!input.files || input.files.length === 0) return;
  const files = Array.from(input.files);

  for (const file of files) {
    if (proWizardData.vitrine.photos.length >= 6) {
      showToast('Limite de 6 fotos de trabalhos atingido.');
      break;
    }
    try {
      const compressed = await compressImageFile(file, 1080, 0.82);
      proWizardData.vitrine.photos.push(compressed);
      renderWizardGalleryGrid();
      saveProDraft();
    } catch (_) {}
  }
  showToast('📸 Foto(s) de trabalho adicionada(s) ao portfólio!');
}

function renderWizardGalleryGrid() {
  const grid = document.getElementById('wizard-gallery-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const photos = proWizardData.vitrine.photos || [];

  if (photos.length === 0) {
    grid.innerHTML = `
      <div class="gallery-empty-tip" id="wizard-gallery-empty">
        <i class="fa-regular fa-images"></i>
        <span>Nenhuma foto adicionada ainda. Clique em "Adicionar" para selecionar imagens do seu aparelho.</span>
      </div>
    `;
    return;
  }

  photos.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'gallery-preview-item';
    item.innerHTML = `
      <img src="${src}" alt="Foto de trabalho">
      <button type="button" class="gallery-item-del-btn" onclick="removeWizardGalleryPhoto(${idx})" title="Remover foto">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    grid.appendChild(item);
  });
}

function removeWizardGalleryPhoto(index) {
  proWizardData.vitrine.photos.splice(index, 1);
  renderWizardGalleryGrid();
  saveProDraft();
}

// Renderiza o Resumo na Etapa 4
function renderProReviewSummary() {
  const revCommName = document.getElementById('rev-commercial-name');
  const revCat = document.getElementById('rev-main-category');
  const revContact = document.getElementById('rev-email-phone');
  const revBairros = document.getElementById('rev-neighborhoods');
  const revSpecs = document.getElementById('rev-specialties');
  const revBio = document.getElementById('rev-bio');
  const revPhotosCount = document.getElementById('rev-photos-count');
  const revAvatar = document.getElementById('rev-avatar-preview');
  const revPhotosStrip = document.getElementById('rev-photos-strip');

  if (revCommName) revCommName.textContent = proWizardData.profile.commercialName || 'Nome Profissional';
  if (revCat) revCat.textContent = proWizardData.profile.category || 'Prestador de Serviços';

  const user = getCurrentUser();
  const email = (user && user.role === 'client') ? user.email : proWizardData.account.email;
  const phone = (user && user.role === 'client') ? user.phone : proWizardData.account.phone;
  if (revContact) revContact.textContent = `${email || 'contato@goparauapebas.com'} • ${phone || '(94) 99123-4567'}`;

  const citySummary = `${proWizardData.profile.city || 'Parauapebas'}, ${proWizardData.profile.state || 'PA'}`;
  if (revBairros) revBairros.textContent = `${citySummary} (Toda a cidade)`;
  if (revSpecs) revSpecs.textContent = proWizardData.profile.specialties.join(', ') || 'Serviços gerais';
  if (revBio) revBio.textContent = proWizardData.profile.bio || 'Sem descrição informada.';

  const photos = proWizardData.vitrine.photos || [];
  if (revPhotosCount) revPhotosCount.textContent = `${photos.length} foto(s) anexada(s)`;

  if (revAvatar) {
    if (proWizardData.vitrine.avatar) {
      revAvatar.innerHTML = `<img src="${proWizardData.vitrine.avatar}" alt="Avatar">`;
    } else {
      revAvatar.innerHTML = `<i class="fa-solid fa-user-tie"></i>`;
    }
  }

  if (revPhotosStrip) {
    revPhotosStrip.innerHTML = '';
    photos.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'summary-strip-thumb';
      revPhotosStrip.appendChild(img);
    });
  }
}

// Confirmação e Publicação Final do Perfil Profissional
async function handleProSignupFinalSubmit() {
  const btn = document.getElementById('btn-pro-confirm-submit');
  const label = document.getElementById('btn-pro-confirm-label');
  const spinner = document.getElementById('btn-pro-confirm-spinner');

  btn.disabled = true;
  label.textContent = 'Publicando vitrine...';
  if (spinner) spinner.style.display = 'inline-block';

  try {
    const user = getCurrentUser();
    const newProId = 'pro_' + Date.now();
    const commercialName = proWizardData.profile.commercialName;
    const category = proWizardData.profile.category;
    const handleName = commercialName.toLowerCase().replace(/[^a-z0-9]/g, '.') || 'pro.parauapebas';
    const email = (user && user.email) ? user.email : proWizardData.account.email;
    const phone = (user && user.phone) ? user.phone : proWizardData.account.phone;
    const password = proWizardData.account.password;

    let dbUserId = user ? user.id : null;
    const proCity = proWizardData.profile.city || 'Parauapebas';
    const proState = proWizardData.profile.state || 'PA';
    const proCep = proWizardData.profile.cep || '';
    const proLat = proWizardData.profile.lat || null;
    const proLng = proWizardData.profile.lng || null;
    const firstNeigh = `${proCity}, ${proState}`;
    const proBioText = proWizardData.profile.bio || `Atendimento profissional e orçamentos em toda a cidade de ${proCity}, ${proState} com garantia e qualidade.`;
    const combinedSkills = [category, ...(proWizardData.profile.specialties || [])].filter(Boolean);

    // 1. Se o usuário ainda não tiver conta autenticada, registra no Supabase Auth com dados completos
    if (!user && email && password) {
      try {
        const supRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
            data: {
              full_name: commercialName,
              role: 'professional',
              phone_whatsapp: phone,
              avatar_url: proWizardData.vitrine.avatar || '',
              city: proCity,
              state: proState,
              cep: proCep,
              bio: proBioText,
              category: category,
              skills: combinedSkills,
              neighborhood: firstNeigh,
              latitude: proLat,
              longitude: proLng
            }
          })
        });
        if (supRes.ok) {
          const supData = await supRes.json();
          if (supData.user) dbUserId = supData.user.id;
          if (supData.access_token) localStorage.setItem('go_supabase_token', supData.access_token);
        }
      } catch (authErr) {
        console.warn('Erro ao registrar pro no Supabase Auth:', authErr);
      }
    }

    // 2. Garante sincronização em public.profiles e public.professional_profiles (inclusive quando cliente vira profissional!)
    if (dbUserId && !String(dbUserId).startsWith('u_')) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/upsert_professional_profile_data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            p_user_id: dbUserId,
            p_full_name: commercialName,
            p_phone: phone,
            p_city: proCity,
            p_state: proState,
            p_cep: proCep,
            p_bio: proBioText,
            p_avatar_url: proWizardData.vitrine.avatar || '',
            p_skills: combinedSkills,
            p_lat: proLat,
            p_lng: proLng
          })
        });

        // 2.1 Sincroniza todas as fotos do portfólio enviadas no cadastro com public.portfolio_items
        const wizardPhotos = proWizardData.vitrine.photos || [];
        for (let idx = 0; idx < wizardPhotos.length; idx++) {
          const imgSrc = wizardPhotos[idx];
          if (!imgSrc) continue;
          try {
            await fetch(`${SUPABASE_URL}/rest/v1/rpc/add_portfolio_item`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                p_professional_id: dbUserId,
                p_title: `${category} em ${firstNeigh}`,
                p_description: proWizardData.vitrine.extraInfo || `Serviço de ${category} realizado com qualidade e garantia em ${firstNeigh}.`,
                p_image_url: imgSrc,
                p_service_category: category,
                p_city_label: firstNeigh
              })
            });
          } catch (_) {}
        }
      } catch (rpcErr) {
        console.warn('Erro ao sincronizar perfil profissional via RPC:', rpcErr);
      }
    }

    const finalProCardId = (dbUserId && !String(dbUserId).startsWith('u_')) ? ('db_' + dbUserId.slice(0, 8)) : newProId;

    // Cria o objeto de perfil profissional no marketplace
    const newProfessional = {
      id: finalProCardId,
      dbId: dbUserId,
      handle: handleName,
      name: commercialName,
      email: email,
      phone: phone,
      cep: proCep,
      created_at: new Date().toISOString(),
      specialty: category,
      category: category,
      headline: proWizardData.profile.specialties.join(' • ') || `${category} em ${proCity}, ${proState}`,
      neighborhood: firstNeigh,
      city: proCity,
      state: proState,
      latitude: proLat,
      longitude: proLng,
      serviceCities: [proCity],
      rating: 5.0,
      reviewsCount: 0,
      worksCount: proWizardData.vitrine.photos.length,
      completedServices: 0,
      verified: true,
      experience: 'Profissional Verificado',
      avatar: proWizardData.vitrine.avatar || 'trampou_app_icon.png',
      bio: proBioText,
      servedNeighborhoods: [`Toda a cidade (${firstNeigh})`],
      posts: proWizardData.vitrine.photos.map((imgSrc, idx) => ({
        id: `post_${finalProCardId}_${idx}`,
        title: `Serviço realizado em ${firstNeigh}`,
        serviceCategory: category,
        neighborhood: firstNeigh,
        date: 'Recente',
        image: imgSrc,
        description: 'Trabalho realizado com dedicação e garantia técnica.',
        likes: 0
      }))
    };

    // Remove eventual duplicata anterior do mesmo usuário e insere no topo
    PROFESSIONALS = PROFESSIONALS.filter(p => p.id !== finalProCardId && (!dbUserId || p.dbId !== dbUserId));
    PROFESSIONALS.unshift(newProfessional);
    saveProfessionalsToStorage();

    // Atualiza o usuário autenticado com vínculo profissional (mesma identidade de conta!)
    currentUser = {
      id: dbUserId || (user ? user.id : ('u_' + Date.now())),
      name: commercialName,
      email: email,
      phone: phone,
      role: 'professional',
      city: proCity,
      state: proState,
      cep: proCep,
      neighborhood: firstNeigh,
      latitude: proLat,
      longitude: proLng,
      avatar: proWizardData.vitrine.avatar || (user ? user.avatar : ''),
      proId: finalProCardId
    };

    localStorage.setItem('go_currentUser', JSON.stringify(currentUser));
    localStorage.removeItem('go_pro_wizard_draft');

    // Seta a cidade ativa do app para a cidade do profissional cadastrado
    if (typeof setActiveLocation === 'function') {
      setActiveLocation(proCity, proState, proLat, proLng, !!proLat);
    }

    renderAuthUI();
    closeAuthModal('auth-pro-signup-modal');

    // Abre a vitrine recém-criada diretamente em modo de dono (proprietário)
    openProVitrine(finalProCardId, true);
    showToast(`🎉 Parabéns! Sua vitrine profissional foi criada e está ativa em ${proCity}, ${proState}!`);

  } catch (err) {
    showToast('Erro ao publicar vitrine. Tente novamente.');
  } finally {
    btn.disabled = false;
    label.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar e Publicar Vitrine';
    if (spinner) spinner.style.display = 'none';
  }
}

// ==============================================================================
// MODAL DE EDIÇÃO DE DADOS BÁSICOS DO CLIENTE
// ==============================================================================

function openEditProfileModal() {
  const user = getCurrentUser();
  if (!user) {
    openAuthWelcome();
    return;
  }
  const nameInp = document.getElementById('edit-profile-name');
  const phoneInp = document.getElementById('edit-profile-phone');
  const cepInp = document.getElementById('edit-profile-cep');
  const stateInp = document.getElementById('edit-profile-state');
  const cityInp = document.getElementById('edit-profile-city');
  const statusEl = document.getElementById('edit-profile-location-status');

  if (nameInp) nameInp.value = user.name || '';
  if (phoneInp) phoneInp.value = user.phone || '';
  if (cepInp) cepInp.value = user.cep || '';
  if (stateInp) stateInp.value = user.state || currentActiveLocation.state || 'PA';
  if (cityInp) cityInp.value = user.city || currentActiveLocation.city || 'Parauapebas';
  if (statusEl) statusEl.style.display = 'none';

  fetchIbgeCitiesForState(user.state || currentActiveLocation.state || 'PA');

  const modal = document.getElementById('edit-profile-modal');
  if (modal) modal.classList.add('active');
}

async function handleProfileEditSubmit(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const name = document.getElementById('edit-profile-name').value.trim();
  const phone = document.getElementById('edit-profile-phone').value.trim();
  const cep = (document.getElementById('edit-profile-cep')?.value || '').trim();
  const state = (document.getElementById('edit-profile-state')?.value || user.state || 'PA').toUpperCase();
  const city = (document.getElementById('edit-profile-city')?.value || user.city || 'Parauapebas').trim();

  if (name.length < 3) {
    showToast('Nome deve conter ao menos 3 letras.');
    return;
  }

  user.name = name;
  user.phone = phone;
  user.cep = cep;
  user.state = state;
  user.city = city;
  user.neighborhood = `${city}, ${state}`;

  if (user.id && !String(user.id).startsWith('u_')) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_user_profile_location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          p_user_id: user.id,
          p_full_name: name,
          p_phone: phone,
          p_city: city,
          p_state: state,
          p_cep: cep
        })
      });
    } catch (e) {
      console.warn('Falha ao atualizar perfil no Supabase:', e);
    }
  }

  currentUser = user;
  localStorage.setItem('go_currentUser', JSON.stringify(currentUser));
  setActiveLocation(city, state, user.latitude || null, user.longitude || null, false);
  renderAuthUI();
  closeAuthModal('edit-profile-modal');
  showToast(`✅ Dados atualizados! Cidade definida: ${city}, ${state}`);
}

function handleLogoutClick() {
  const user = getCurrentUser();
  if (!user) {
    openAuthWelcome();
    return;
  }
  if (confirm('Deseja realmente sair da sua conta no Trampou?')) {
    currentUser = null;
    localStorage.removeItem('go_currentUser');
    renderAuthUI();
    showToast('Sessão encerrada com sucesso.');
    openAuthWelcome();
  }
}

// Exportações para o escopo global (Window)
window.initAuthManager = initAuthManager;
window.getCurrentUser = getCurrentUser;
window.renderAuthUI = renderAuthUI;
window.handleProAreaClick = handleProAreaClick;
window.openAuthWelcome = openAuthWelcome;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.openLoginModal = openLoginModal;
window.openRecoveryModal = openRecoveryModal;
window.openClientSignup = openClientSignup;
window.openProSignup = openProSignup;
window.togglePasswordVisibility = togglePasswordVisibility;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRecoverySubmit = handleRecoverySubmit;
window.handleClientSignupSubmit = handleClientSignupSubmit;
window.goStep = goStep;
window.validateAndGoStep = validateAndGoStep;
window.handleProWizardBack = handleProWizardBack;
window.toggleTagChip = toggleTagChip;
window.toggleNeighborhoodChip = toggleNeighborhoodChip;
window.handleWizardAvatarSelect = handleWizardAvatarSelect;
window.removeWizardAvatar = removeWizardAvatar;
window.handleWizardGallerySelect = handleWizardGallerySelect;
window.removeWizardGalleryPhoto = removeWizardGalleryPhoto;
window.handleProSignupFinalSubmit = handleProSignupFinalSubmit;
window.openEditProfileModal = openEditProfileModal;
window.handleProfileEditSubmit = handleProfileEditSubmit;
window.handleLogoutClick = handleLogoutClick;

// Exportações do Plantão SOS & Radar estilo 99
window.openSOSRequestModal = openSOSRequestModal;
window.closeSOSRequestModal = closeSOSRequestModal;
window.selectSOSProType = selectSOSProType;
window.handleSOSSearch = handleSOSSearch;
window.selectSpecificSOSPro = selectSpecificSOSPro;
window.clearSelectedSpecificPro = clearSelectedSpecificPro;
window.selectSOSCategoryFromSearch = selectSOSCategoryFromSearch;
window.clearSOSSearch = clearSOSSearch;
window.launchSOSRadar = launchSOSRadar;
window.cancelSOSRadar = cancelSOSRadar;
window.goToChatWithAcceptedPro = goToChatWithAcceptedPro;
window.openAcceptedProWhatsApp = openAcceptedProWhatsApp;
window.openEmergencyModal = openEmergencyModal;

// Exportações de Gestão de Categorias Customizadas
window.getCustomCategories = getCustomCategories;
window.addCustomCategory = addCustomCategory;
window.populateProCategoryOptions = populateProCategoryOptions;
window.handleProCategoryChange = handleProCategoryChange;
window.toggleNewCategoryField = toggleNewCategoryField;
window.confirmAddCustomCategory = confirmAddCustomCategory;

// Exportações de Notificações
window.getUnreadNotificationCount = getUnreadNotificationCount;
window.updateNotificationBadges = updateNotificationBadges;
window.openNotificationsFromHome = openNotificationsFromHome;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;

// Exportações de Atendimento 24h & Aceite de Emergência do Profissional
window.openIncomingSOSModal = openIncomingSOSModal;
window.closeIncomingSOSModal = closeIncomingSOSModal;
window.acceptIncomingSOS = acceptIncomingSOS;
window.rejectIncomingSOS = rejectIncomingSOS;
window.loadProfessionalsFromSupabase = loadProfessionalsFromSupabase;

// =========================================================
// GESTÃO E MONETIZAÇÃO: ANTES & DEPOIS (SHOWCASE TRAMPOU PRO)
// =========================================================

let showcaseImageData = { before: null, after: null };
let currentViewingShowcase = null;

function openPublishShowcaseModal() {
  const modal = document.getElementById('modal-publish-showcase');
  if (!modal) return;

  const form = document.getElementById('form-publish-showcase');
  if (form) form.reset();

  showcaseImageData = { before: null, after: null };

  ['before', 'after'].forEach(side => {
    const previewImg = document.getElementById(`preview-img-${side}`);
    const emptyBox = document.getElementById(`dropzone-${side}-empty`);
    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    if (emptyBox) {
      emptyBox.style.display = 'flex';
    }
  });

  const bairroSelect = document.getElementById('showcase-bairro');
  if (bairroSelect && typeof currentSelectedBairro !== 'undefined') {
    bairroSelect.value = currentSelectedBairro || 'Cidade Nova';
  }

  modal.classList.add('active');
}

function closePublishShowcaseModal() {
  const modal = document.getElementById('modal-publish-showcase');
  if (modal) modal.classList.remove('active');
}

async function handleShowcaseImageSelect(input, side) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    const dataUrl = await compressImageFile(file, 1080, 0.82);
    showcaseImageData[side] = dataUrl;
    const previewImg = document.getElementById(`preview-img-${side}`);
    const emptyBox = document.getElementById(`dropzone-${side}-empty`);
    if (previewImg) {
      previewImg.src = dataUrl;
      previewImg.style.display = 'block';
    }
    if (emptyBox) {
      emptyBox.style.display = 'none';
    }
  } catch (_) {}
}

function handlePublishShowcaseSubmit(event) {
  event.preventDefault();

  const title = (document.getElementById('showcase-title')?.value || '').trim();
  const bairro = `${currentActiveLocation.city || 'Parauapebas'}, ${currentActiveLocation.state || 'PA'}`;
  const category = document.getElementById('showcase-category')?.value || 'Serviços Gerais';
  const descBefore = (document.getElementById('showcase-desc-before')?.value || '').trim();
  const descAfter = (document.getElementById('showcase-desc-after')?.value || '').trim();
  const isBoosted = document.getElementById('check-boost-showcase') ? document.getElementById('check-boost-showcase').checked : true;

  if (!title || !descBefore || !descAfter) {
    showToast('Por favor, preencha o título e as descrições de antes e depois.');
    return;
  }

  // Identifica profissional
  let proName = 'Profissional Parceiro';
  let proSpecialty = category;
  let proId = 'p1';
  let proAvatar = null;

  if (typeof currentUser !== 'undefined' && currentUser && (currentUser.role === 'professional' || currentUser.role === 'pro')) {
    proName = currentUser.name || proName;
    proId = currentUser.proId || currentUser.id || proId;
    proAvatar = currentUser.avatar || null;
  } else if (typeof currentVitrinePro !== 'undefined' && currentVitrinePro) {
    proName = currentVitrinePro.name || proName;
    proSpecialty = currentVitrinePro.specialty || proSpecialty;
    proId = currentVitrinePro.id || proId;
    proAvatar = currentVitrinePro.avatar || null;
  } else if (typeof PROFESSIONALS !== 'undefined' && PROFESSIONALS.length > 0) {
    const match = PROFESSIONALS.find(p => p.specialty.toLowerCase().includes(category.toLowerCase().split(' ')[0])) || PROFESSIONALS[0];
    proName = match.name;
    proSpecialty = match.specialty;
    proId = match.id;
    proAvatar = match.avatar;
  }

  const newShowcase = {
    id: 'sc_' + Date.now(),
    title: title,
    neighborhood: bairro,
    category: category,
    proName: proName,
    proSpecialty: proSpecialty,
    proId: proId,
    proAvatar: proAvatar,
    beforeDesc: descBefore,
    afterDesc: descAfter,
    beforeImage: showcaseImageData.before || null,
    afterImage: showcaseImageData.after || null,
    beforeGradient: 'linear-gradient(135deg, #374151, #1e293b)',
    afterGradient: 'linear-gradient(135deg, #059669, #065f46)',
    isBoosted: isBoosted,
    isPro: true,
    publishedAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem('trampou_custom_showcases');
    const customList = raw ? JSON.parse(raw) : [];
    customList.unshift(newShowcase);
    localStorage.setItem('trampou_custom_showcases', JSON.stringify(customList));
  } catch (err) {
    console.error('Erro ao salvar showcase no localStorage', err);
  }

  closePublishShowcaseModal();
  renderShowcase();

  const showcaseElem = document.getElementById('showcase-container');
  if (showcaseElem) {
    showcaseElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showToast('🎉 Publicado com sucesso! Seu Antes & Depois está em destaque GRÁTIS no Trampou.');
}

function openShowcaseViewer(showcaseId) {
  const items = getShowcaseItems();
  const item = items.find(sc => sc.id === showcaseId) || items[0];
  if (!item) return;

  currentViewingShowcase = item;

  const bairroEl = document.getElementById('viewer-bairro');
  if (bairroEl) bairroEl.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${item.neighborhood}`;

  const titleEl = document.getElementById('viewer-title');
  if (titleEl) titleEl.innerText = item.title;

  const wrapBefore = document.getElementById('viewer-img-before-wrap');
  const descBefore = document.getElementById('viewer-desc-before');
  if (descBefore) descBefore.innerText = item.beforeDesc;
  if (wrapBefore) {
    if (item.beforeImage) {
      wrapBefore.innerHTML = `<img src="${item.beforeImage}" alt="Antes - ${item.title}">`;
    } else {
      wrapBefore.innerHTML = `<div class="compare-art-gradient" style="background: ${item.beforeGradient || 'linear-gradient(135deg, #475569, #1e293b)'};"><span style="color: rgba(255,255,255,0.7); font-size: 11px;"><i class="fa-solid fa-camera"></i> Foto do Antes</span></div>`;
    }
  }

  const wrapAfter = document.getElementById('viewer-img-after-wrap');
  const descAfter = document.getElementById('viewer-desc-after');
  if (descAfter) descAfter.innerText = item.afterDesc;
  if (wrapAfter) {
    if (item.afterImage) {
      wrapAfter.innerHTML = `<img src="${item.afterImage}" alt="Depois - ${item.title}">`;
    } else {
      wrapAfter.innerHTML = `<div class="compare-art-gradient" style="background: ${item.afterGradient || 'linear-gradient(135deg, #059669, #065f46)'};"><span style="color: rgba(255,255,255,0.9); font-size: 11px;"><i class="fa-solid fa-wand-magic-sparkles"></i> Foto do Depois</span></div>`;
    }
  }

  const proNameEl = document.getElementById('viewer-pro-name');
  if (proNameEl) proNameEl.innerText = item.proName;

  const proSpecEl = document.getElementById('viewer-pro-spec');
  if (proSpecEl) proSpecEl.innerText = `${item.proSpecialty || 'Especialista'} • ${item.neighborhood || 'Parauapebas'}`;

  const proAvatarEl = document.getElementById('viewer-pro-avatar');
  if (proAvatarEl) {
    if (item.proAvatar) {
      proAvatarEl.innerHTML = `<img src="${item.proAvatar}" alt="${item.proName}">`;
    } else {
      proAvatarEl.innerHTML = `<i class="fa-solid fa-user-tie"></i>`;
    }
  }

  const modal = document.getElementById('modal-showcase-viewer');
  if (modal) modal.classList.add('active');
}

function closeShowcaseViewer() {
  const modal = document.getElementById('modal-showcase-viewer');
  if (modal) modal.classList.remove('active');
}

function viewProFromShowcase() {
  if (!currentViewingShowcase) return;
  const proId = currentViewingShowcase.proId;
  closeShowcaseViewer();
  if (proId && typeof openProVitrine === 'function') {
    openProVitrine(proId, false);
  }
}

function requestQuoteFromViewer() {
  if (!currentViewingShowcase) return;
  const item = currentViewingShowcase;
  closeShowcaseViewer();
  if (item.proId && typeof openChatWith === 'function') {
    openChatWith(item.proName, `Resultado: ${item.title}`, item.proId);
  } else if (typeof openRequestModal === 'function') {
    openRequestModal(item.title, item.proName);
  }
}

function requestQuoteForShowcase(id, title, proName, proId) {
  if (typeof openRequestModal === 'function') {
    openRequestModal(title, proName);
  } else if (typeof openChatWith === 'function' && proId) {
    openChatWith(proName, title, proId);
  } else {
    showToast(`Solicitando orçamento para "${title}" com ${proName}...`);
  }
}

function shareCurrentShowcase() {
  if (!currentViewingShowcase) return;
  const item = currentViewingShowcase;
  const shareText = `Veja esta transformação incrível de "${item.title}" feita por ${item.proName} no Trampou Parauapebas!`;
  if (navigator.share) {
    navigator.share({
      title: item.title,
      text: shareText,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(`${shareText}\n${window.location.href}`);
    showToast('Link da transformação copiado para a área de transferência!');
  }
}

// Exportações Showcase Antes & Depois
window.openPublishShowcaseModal = openPublishShowcaseModal;
window.closePublishShowcaseModal = closePublishShowcaseModal;
window.handleShowcaseImageSelect = handleShowcaseImageSelect;
window.handlePublishShowcaseSubmit = handlePublishShowcaseSubmit;
window.openShowcaseViewer = openShowcaseViewer;
window.closeShowcaseViewer = closeShowcaseViewer;
window.viewProFromShowcase = viewProFromShowcase;
window.requestQuoteFromViewer = requestQuoteFromViewer;
window.requestQuoteForShowcase = requestQuoteForShowcase;
window.shareCurrentShowcase = shareCurrentShowcase;
window.getShowcaseItems = getShowcaseItems;
window.renderShowcase = renderShowcase;

// =========================================================
// LGPD & PRIVACIDADE — LÓGICA E CONFORMIDADE LEGAL
// =========================================================

// 1. Inicializa o banner de consentimento no rodapé
function initLgpdConsent() {
  const consentGiven = localStorage.getItem('trampou_lgpd_consent');
  const banner = document.getElementById('lgpd-consent-banner');
  if (!banner) return;

  // Se o usuário ainda não tiver dado consentimento formal, exibe o banner
  if (!consentGiven) {
    setTimeout(() => {
      banner.style.display = 'block';
    }, 1200);
  }
}

// 2. Aceita o consentimento LGPD
function acceptLgpdConsent() {
  localStorage.setItem('trampou_lgpd_consent', JSON.stringify({
    accepted_at: new Date().toISOString(),
    version: '1.0'
  }));
  const banner = document.getElementById('lgpd-consent-banner');
  if (banner) {
    banner.style.animation = 'fadeOut 0.25s ease-out forwards';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 250);
  }
  showToast('Preferências de privacidade salvas com sucesso.');
}

// 3. Modais de Acesso aos Documentos e Central
function openPrivacyHubModal() {
  // Sincroniza o switch do GPS com a preferência salva
  const prefGps = localStorage.getItem('trampou_pref_gps') !== 'false';
  const gpsToggle = document.getElementById('pref-gps-toggle');
  if (gpsToggle) {
    gpsToggle.checked = prefGps;
  }
  openAuthModal('privacy-hub-modal');
}

function openPrivacyPolicyModal() {
  openAuthModal('privacy-policy-modal');
}

function openTermsOfUseModal() {
  openAuthModal('terms-of-use-modal');
}

function openDpoChannelModal() {
  openAuthModal('dpo-channel-modal');
}

function openDeleteAccountModal() {
  const input = document.getElementById('delete-confirm-input');
  if (input) input.value = '';
  openAuthModal('delete-account-confirm-modal');
}

// 4. Controle de Geolocalização Precisa (GPS)
function toggleGpsPreference(enabled) {
  localStorage.setItem('trampou_pref_gps', enabled ? 'true' : 'false');
  if (enabled) {
    showToast('GPS ativado para ordenação por proximidade em Parauapebas.');
  } else {
    showToast('GPS desativado. O app priorizará seu bairro selecionado.');
  }
}

// 5. Portabilidade de Dados Pessoais (Art. 18, V da LGPD)
function exportMyUserData() {
  const currentUser = getStoredAuthUser();
  const proProfile = getStoredProProfile();
  const consent = localStorage.getItem('trampou_lgpd_consent');
  const conversationsData = localStorage.getItem('trampou_conversations');

  let parsedConversations = [];
  try {
    if (conversationsData) parsedConversations = JSON.parse(conversationsData);
  } catch (e) {
    parsedConversations = [];
  }

  const exportPayload = {
    _info: 'Exportação de Dados Pessoais — Trampou (Parauapebas / PA)',
    _legislacao: 'Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - Art. 18, V)',
    data_extracao: new Date().toISOString(),
    usuario: currentUser ? {
      id: currentUser.id,
      nome: currentUser.name || currentUser.full_name,
      email: currentUser.email,
      telefone: currentUser.phone,
      tipo_perfil: currentUser.role || (isProfessional() ? 'professional' : 'client'),
      criado_em: currentUser.created_at || 'Data não informada'
    } : { status: 'Sessão anônima / Visitante sem conta vinculada' },
    perfil_profissional: proProfile ? {
      categoria: proProfile.categoryName,
      especialidades: proProfile.specialties,
      bairros_atendimento: proProfile.neighborhoods,
      bio: proProfile.bio,
      verificado: proProfile.verified || false
    } : null,
    consentimento_lgpd: consent ? JSON.parse(consent) : 'Pendente de registro',
    total_conversas_locais: parsedConversations.length
  };

  // Cria e faz o download do arquivo JSON
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `meus-dados-trampou-${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  showToast('Arquivo com seus dados gerado e baixado com sucesso!');
}

// 6. Limpeza de Histórico Local no Dispositivo
function clearLocalAppStorage() {
  if (confirm('Deseja limpar o histórico de buscas e cache mantidos neste aparelho? Sua conta continuará ativa.')) {
    localStorage.removeItem('trampou_conversations');
    localStorage.removeItem('trampou_recent_searches');
    showToast('Histórico e cache local limpos com sucesso!');
  }
}

// 7. Exclusão Definitiva de Conta e Dados (Direito ao Esquecimento)
async function executeAccountDeletion() {
  const input = document.getElementById('delete-confirm-input');
  const confirmText = (input?.value || '').trim().toUpperCase();

  if (confirmText !== 'EXCLUIR') {
    alert('Para confirmar a exclusão definitiva, digite exatamente a palavra EXCLUIR.');
    return;
  }

  const btnConfirm = document.getElementById('btn-confirm-delete-action');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Excluindo dados...';
  }

  const user = getStoredAuthUser();

  try {
    // Se o usuário estiver autenticado no Supabase, envia a deleção de seu perfil
    if (user && user.id && typeof SUPABASE_URL !== 'undefined') {
      try {
        // Exclui perfil profissional se houver
        await fetch(`${SUPABASE_URL}/rest/v1/professional_profiles?user_id=eq.${user.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        // Exclui perfil principal de usuário
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });
      } catch (err) {
        console.warn('Erro ao chamar exclusão no Supabase:', err);
      }
    }

    // Limpa todas as informações e dados locais do usuário
    localStorage.removeItem('trampou_auth_user');
    localStorage.removeItem('trampou_user_profile');
    localStorage.removeItem('trampou_pro_profile');
    localStorage.removeItem('trampou_conversations');
    sessionStorage.clear();

    closeAuthModal('delete-account-confirm-modal');
    closeAuthModal('privacy-hub-modal');

    alert('Sua conta e todos os seus dados foram permanentemente eliminados da nossa base, em conformidade com o Artigo 18 da LGPD.');
    
    // Recarrega o app para o estado inicial limpo
    window.location.reload();
  } catch (err) {
    alert('Ocorreu uma falha ao processar a exclusão. Por favor, tente novamente ou contate vertextecnologia001@gmail.com.');
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '<i class="fa-solid fa-trash-can"></i> Excluir Definitivamente';
    }
  }
}

// 8. Envio de solicitações ao Encarregado (DPO) via E-mail ou WhatsApp
function sendDpoEmail(tipo) {
  let assunto = 'Solicitação LGPD — Trampou Parauapebas';
  let corpo = 'Olá Encarregado de Proteção de Dados (DPO) do Trampou,\n\n';

  if (tipo === 'incidente_seguranca') {
    assunto = 'URGENTE: Notificação de Suspeita de Incidente / Falha de Segurança — Trampou';
    corpo += 'Gostaria de relatar uma suspeita de incidente ou vulnerabilidade de segurança:\n\n[Descreva aqui o ocorrido]\n\n';
  } else {
    corpo += 'Gostaria de exercer meus direitos como titular de dados pessoais conforme a Lei nº 13.709/2018 (LGPD):\n\n[Informe sua solicitação: Acesso, Correção ou Revogação]\n\n';
  }

  const user = getStoredAuthUser();
  if (user) {
    corpo += `Nome do Titular: ${user.name || user.full_name || 'Usuário Trampou'}\nE-mail Cadastrado: ${user.email || 'Não informado'}\nTelefone: ${user.phone || 'Não informado'}\n`;
  }

  const mailtoUrl = `mailto:vertextecnologia001@gmail.com?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  window.open(mailtoUrl, '_blank');
}

function sendDpoWhatsapp(tipo) {
  let msg = 'Olá! Sou usuário do aplicativo Trampou em Parauapebas e gostaria de fazer uma solicitação sobre o aplicativo / proteção de dados (LGPD).';
  const whatsappUrl = `https://wa.me/559484490987?text=${encodeURIComponent(msg)}`;
  window.open(whatsappUrl, '_blank');
}

// Exportações Globais de LGPD
window.initLgpdConsent = initLgpdConsent;
window.acceptLgpdConsent = acceptLgpdConsent;
window.openPrivacyHubModal = openPrivacyHubModal;
window.openPrivacyPolicyModal = openPrivacyPolicyModal;
window.openTermsOfUseModal = openTermsOfUseModal;
window.openDpoChannelModal = openDpoChannelModal;
window.openDeleteAccountModal = openDeleteAccountModal;
window.toggleGpsPreference = toggleGpsPreference;
window.exportMyUserData = exportMyUserData;
window.clearLocalAppStorage = clearLocalAppStorage;
window.executeAccountDeletion = executeAccountDeletion;
window.sendDpoEmail = sendDpoEmail;
window.sendDpoWhatsapp = sendDpoWhatsapp;

// Exportações Globais de Expansão Nacional e Geolocalização
window.currentActiveLocation = currentActiveLocation;
window.initLocationManager = initLocationManager;
window.updateLocationDisplay = updateLocationDisplay;
window.setActiveLocation = setActiveLocation;
window.openLocationPickerModal = openLocationPickerModal;
window.closeLocationPickerModal = closeLocationPickerModal;
window.selectCityOption = selectCityOption;
window.applyManualCityChoice = applyManualCityChoice;
window.detectUserLocationGPS = detectUserLocationGPS;
window.detectClientLocationGPS = detectClientLocationGPS;
window.detectProLocationGPS = detectProLocationGPS;
window.filterAndSortProsByLocation = filterAndSortProsByLocation;

// =========================================================
// SISTEMA DE SUGESTÕES & FEEDBACK DOS USUÁRIOS
// =========================================================
function openAppFeedbackModal() {
  if (typeof requireUserAuth === 'function' && !requireUserAuth('feedback')) return;
  closeAllAuthModals();
  const modal = document.getElementById('modal-app-feedback');
  if (!modal) return;

  const user = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) ||
               (typeof getStoredAuthUser === 'function' ? getStoredAuthUser() : null);

  const nameInput = document.getElementById('feedback-user-name');
  const contactInput = document.getElementById('feedback-user-contact');
  const titleInput = document.getElementById('feedback-title-input');
  const messageInput = document.getElementById('feedback-message-input');
  const alertEl = document.getElementById('feedback-submit-alert');

  if (alertEl) alertEl.style.display = 'none';
  if (titleInput) titleInput.value = '';
  if (messageInput) messageInput.value = '';

  if (user) {
    if (nameInput) nameInput.value = user.name || user.full_name || '';
    if (contactInput) contactInput.value = user.email || user.phone || user.phone_whatsapp || '';
  }

  setFeedbackType('sugestao');
  setFeedbackRating(5);

  modal.classList.add('active');
}

function closeAppFeedbackModal() {
  const modal = document.getElementById('modal-app-feedback');
  if (modal) modal.classList.remove('active');
}

function setFeedbackType(type) {
  const input = document.getElementById('feedback-type-val');
  if (input) input.value = type;

  const chips = document.querySelectorAll('.fb-type-chip');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-type') === type);
  });
}

function setFeedbackRating(stars) {
  const input = document.getElementById('feedback-rating-val');
  if (input) input.value = stars;

  const starBtns = document.querySelectorAll('.fb-star');
  starBtns.forEach(btn => {
    const s = parseInt(btn.getAttribute('data-star') || '1', 10);
    btn.classList.toggle('active', s <= stars);
  });

  const textEl = document.getElementById('fb-rating-text');
  if (textEl) {
    const labels = {
      1: 'Muito Ruim (1/5) 😞',
      2: 'Ruim (2/5) 😐',
      3: 'Regular (3/5) 🙂',
      4: 'Muito Bom (4/5) 😊',
      5: 'Excelente (5/5) ⭐'
    };
    textEl.textContent = labels[stars] || `${stars}/5 ⭐`;
  }
}

async function handleFeedbackSubmit(event) {
  event.preventDefault();

  // Exige usuário autenticado también no envio (bloqueia chamadas diretas via console/DOM)
  if (typeof requireUserAuth === 'function' && !requireUserAuth('feedback')) return;

  const user = (typeof getCurrentUser === 'function' ? getCurrentUser() : null) ||
               (typeof getStoredAuthUser === 'function' ? getStoredAuthUser() : null);

  if (!user || (!user.id && !user.email)) {
    closeAppFeedbackModal();
    if (typeof openAuthGateModal === 'function') openAuthGateModal('feedback');
    return;
  }

  const type = document.getElementById('feedback-type-val')?.value || 'sugestao';
  const rating = parseInt(document.getElementById('feedback-rating-val')?.value || '5', 10);
  const title = document.getElementById('feedback-title-input')?.value.trim() || '';
  const message = document.getElementById('feedback-message-input')?.value.trim();

  // Usa sempre os dados reais da conta autenticada (impede falsificação de identidade no formulário)
  const verifiedName = (user.name || user.full_name || '').trim();
  const verifiedEmail = (user.email || '').trim().toLowerCase();
  const verifiedPhone = (user.phone || user.phone_whatsapp || '').trim();

  const alertEl = document.getElementById('feedback-submit-alert');
  const alertText = document.getElementById('feedback-submit-alert-text');
  const btn = document.getElementById('btn-submit-feedback');
  const btnText = document.getElementById('btn-feedback-text');
  const btnSpinner = document.getElementById('btn-feedback-spinner');

  if (!message || message.length < 5) {
    if (alertEl && alertText) {
      alertEl.style.display = 'flex';
      alertText.textContent = 'Por favor, escreva uma mensagem detalhando sua sugestão ou relato.';
    }
    return;
  }

  // Previne cliques duplicados
  if (btn) btn.disabled = true;
  if (btnText) btnText.textContent = 'Enviando sugestão...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';
  if (alertEl) alertEl.style.display = 'none';

  // Se o ID local ainda estiver com prefixo 'u_', resolve o UUID oficial na tabela profiles pelo e-mail
  let realUserId = user.id && !String(user.id).startsWith('u_') ? user.id : null;
  if (!realUserId && verifiedEmail) {
    try {
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(verifiedEmail)}&select=id,full_name,phone_whatsapp&limit=1`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (pRes.ok) {
        const pRows = await pRes.json();
        if (Array.isArray(pRows) && pRows.length > 0 && pRows[0].id) {
          realUserId = pRows[0].id;
          user.id = realUserId;
          localStorage.setItem('go_currentUser', JSON.stringify(user));
        }
      }
    } catch (_) {}
  }

  const payload = {
    user_id: realUserId,
    user_name: verifiedName || 'Usuário Cadastrado',
    user_email: verifiedEmail || null,
    user_phone: verifiedPhone || null,
    feedback_type: type,
    rating: rating,
    title: title || (type === 'sugestao' ? 'Sugestão de Usuário' : type === 'elogio' ? 'Elogio ao App' : 'Relato de Problema'),
    message: message,
    city: currentActiveLocation?.city || 'Parauapebas',
    state: currentActiveLocation?.state || 'PA',
    status: 'pendente'
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_feedbacks`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error('Falha ao registrar feedback no servidor.');
    }

    closeAppFeedbackModal();
    showToast('🎉 Muito obrigado pelo feedback! Sua sugestão foi enviada diretamente para a equipe de desenvolvimento.');

    const form = document.getElementById('form-app-feedback');
    if (form) form.reset();

  } catch (err) {
    console.warn('Erro ao enviar feedback para Supabase, gravando em cache local:', err);
    try {
      const localFeedbacks = JSON.parse(localStorage.getItem('trampou_local_feedbacks') || '[]');
      localFeedbacks.unshift({ ...payload, id: 'fb_' + Date.now(), created_at: new Date().toISOString() });
      localStorage.setItem('trampou_local_feedbacks', JSON.stringify(localFeedbacks));
    } catch (_) {}

    closeAppFeedbackModal();
    showToast('🎉 Feedback registrado com sucesso! Obrigado pela colaboração.');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.innerHTML = '<i class="fa-solid fa-paper-plane" style="margin-right: 6px;"></i> Enviar para a Equipe';
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
}

// Exportações Globais de Feedbacks
window.openAppFeedbackModal = openAppFeedbackModal;
window.closeAppFeedbackModal = closeAppFeedbackModal;
window.setFeedbackType = setFeedbackType;
window.setFeedbackRating = setFeedbackRating;
window.handleFeedbackSubmit = handleFeedbackSubmit;

// Exportações Globais de Navegação por Estado e Cidades
window.STATE_DEFAULT_CITIES = STATE_DEFAULT_CITIES;
window.handleStateSelectChange = handleStateSelectChange;
window.updatePopularCitiesChips = updatePopularCitiesChips;






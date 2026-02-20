const SUPABASE_URL = "https://wuesrzehlzgoiubxjufj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1ZXNyemVobHpnb2l1YnhqdWZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDE5MjgsImV4cCI6MjA4NzE3NzkyOH0.uLvbB2n3J95FF1rA52vGUpLLtwkzjiExDP7ySiJQFJI";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis globais
let isAuthenticated = false;
let isLicenseValid = false;

(async function () {
    console.log('=== EXECUTANDO VERIFICAÇÃO DE LICENÇA E AUTH ===');

    // 1. Verificar licença primeiro
    const savedEmail = localStorage.getItem('infinite_leads_license_email');
    if (savedEmail) {
        try {
            const resp = await validateLicenseRemote(savedEmail);
            if (resp && resp.return === true) {
                console.log('Licença válida encontrada para:', savedEmail);
                isLicenseValid = true;
            } else {
                console.warn('Licença salva é inválida ou expirada');
                localStorage.removeItem('infinite_leads_license_email');
            }
        } catch (e) {
            console.error('Erro na validação automática da licença:', e);
        }
    }

    const startApp = () => {
        if (!isLicenseValid) {
            const licenseOverlay = document.getElementById('licenseOverlay');
            if (licenseOverlay) licenseOverlay.style.display = 'flex';

            const loginOverlay = document.getElementById('loginOverlay');
            if (loginOverlay) loginOverlay.style.display = 'none';

            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.style.display = 'none';
            return;
        }

        // 2. Se licença ok, procede para Auth
        const authToken = localStorage.getItem('leads_infinite_auth');
        const authExpiry = localStorage.getItem('leads_infinite_auth_expiry');
        const userEmail = localStorage.getItem('leads_infinite_user_email');

        console.log('AuthToken:', authToken);
        console.log('AuthExpiry:', authExpiry);
        console.log('UserEmail:', userEmail);

        if (authToken && authExpiry) {
            const now = new Date().getTime();
            const expiry = parseInt(authExpiry);

            if (now < expiry) {
                console.log('USUÁRIO AUTENTICADO - PREPARANDO INTERFACE');
                isAuthenticated = true;
                showMainContentImmediate();
                initializeAuthenticatedApp();
                return;
            } else {
                console.log('TOKEN EXPIRADO - LIMPANDO DADOS');
                localStorage.removeItem('leads_infinite_auth');
                localStorage.removeItem('leads_infinite_auth_expiry');
                localStorage.removeItem('leads_infinite_user_email');
                localStorage.removeItem('leads_infinite_user_data');
            }
        }

        // Não autenticado - mostrar login
        console.log('Usuário NÃO autenticado - preparando login');
        isAuthenticated = false;
        showLoginFormImmediate();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }
})();

// Função utilitária para acessar dados do usuário
function getUserData() {
    try {
        const userData = localStorage.getItem('leads_infinite_user_data');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Erro ao acessar dados do usuário:', error);
        return null;
    }
}

// --- Funções de Licença ---

async function validateLicenseRemote(email) {
    console.log('Validando licença remota para:', email);
    try {
        const response = await fetch('https://webhook.typebotdescomplicado.com.br/webhook/validarInfinite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        });

        if (!response.ok) throw new Error('Erro na resposta do servidor');

        const data = await response.json();
        return data; // { "return": true } ou { "return": false }
    } catch (error) {
        console.error('Erro ao validar licença:', error);
        return { return: false };
    }
}

async function handleLicenseSubmit(event) {
    if (event) event.preventDefault();

    const emailInput = document.getElementById('licenseEmail');
    const email = emailInput.value.trim();
    const licenseBtn = document.getElementById('licenseBtn');
    const licenseBtnText = document.getElementById('licenseBtnText');
    const licenseLoading = document.querySelector('.license-loading');
    const licenseError = document.getElementById('licenseError');

    if (!email) return;

    // UI Feedback
    licenseBtn.disabled = true;
    if (licenseLoading) licenseLoading.style.display = 'inline-block';
    licenseBtnText.textContent = 'Validando...';
    if (licenseError) licenseError.classList.add('d-none');

    try {
        const result = await validateLicenseRemote(email);

        if (result && result.return === true) {
            console.log('Licença validada com sucesso!');
            localStorage.setItem('infinite_leads_license_email', email);
            isLicenseValid = true;

            licenseBtnText.innerHTML = '<i class="bi bi-check-circle me-2"></i>Autorizado!';

            setTimeout(() => {
                const licenseOverlay = document.getElementById('licenseOverlay');
                if (licenseOverlay) licenseOverlay.style.display = 'none';

                // Após validar licença, inicia o fluxo de auth normal
                location.reload(); // Recarrega para executar o fluxo original de auth
            }, 1000);
        } else {
            console.warn('Licença inválida');
            if (licenseError) licenseError.classList.remove('d-none');
        }
    } catch (error) {
        console.error('Erro:', error);
        if (licenseError) licenseError.classList.remove('d-none');
    } finally {
        licenseBtn.disabled = false;
        if (licenseLoading) licenseLoading.style.display = 'none';
        licenseBtnText.innerHTML = '<i class="bi bi-check-circle me-2"></i>Validar Acesso';
    }
}

// Função para verificar plano/permissões
function hasPermission(feature) {
    const userData = getUserData();
    if (!userData) return false;

    // Exemplo de lógica de permissões
    switch (feature) {
        case 'whatsapp_validation':
            return userData.plano === 'pro' || userData.plano === 'premium';
        case 'unlimited_exports':
            return userData.plano === 'premium';
        case 'social_search':
            return userData.plano !== 'básico';
        default:
            return true;
    }
}

// Função para mostrar conteúdo principal imediatamente
function showMainContentImmediate() {
    console.log('Mostrando conteúdo principal...');

    const loginOverlay = document.getElementById('loginOverlay');
    const mainContent = document.getElementById('mainContent');

    if (loginOverlay) {
        loginOverlay.style.display = 'none';
        console.log('Login overlay escondido');
    } else {
        console.log('⚠️ loginOverlay não encontrado');
    }

    if (mainContent) {
        mainContent.classList.add('authenticated');
        mainContent.style.display = 'block';
        console.log('Main content exibido');
    } else {
        console.log('⚠️ mainContent não encontrado');
    }
}

// Função para mostrar login imediatamente
function showLoginFormImmediate() {
    console.log('Mostrando tela de login...');

    const loginOverlay = document.getElementById('loginOverlay');
    const mainContent = document.getElementById('mainContent');

    if (loginOverlay) {
        loginOverlay.style.display = 'flex';
        console.log('Login overlay exibido');
    } else {
        console.log('⚠️ loginOverlay não encontrado');
    }

    if (mainContent) {
        mainContent.classList.remove('authenticated');
        mainContent.style.display = 'none';
        console.log('Main content escondido');
    } else {
        console.log('⚠️ mainContent não encontrado');
    }
}

function initializeAuthenticatedApp() {
    console.log('Inicializando app para usuário autenticado...');

    try {
        loadThemeFromStorage();
        loadAllConfigs();
        updateSearchInterface();
        resetSearch();
        showWelcomeMessage();

        // Mostrar dados do usuário
        const userData = getUserData();
        if (userData) {
            console.log('Dados do usuário carregados:', userData);

            setTimeout(() => {
                showSuccessToast(`Bem-vindo de volta, ${userData.nome}! Plano: ${userData.plano}`);
            }, 1000);
        }

        console.log('✅ App inicializado com sucesso');

    } catch (error) {
        console.error('❌ Erro ao inicializar app:', error);
    }
}

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginLoading = document.querySelector('.login-loading');
    const loginError = document.getElementById('loginError');

    if (!email || !password) {
        showLoginError('Por favor, preencha todos os campos');
        return;
    }

    // Esconder erro anterior
    if (loginError) {
        loginError.classList.add('d-none');
    }

    // Mostrar loading
    loginBtn.disabled = true;
    loginLoading.style.display = 'inline-block';
    loginBtnText.innerHTML = 'Verificando...';

    console.log('Tentando fazer login para:', email);

    try {
        // Consultar diretamente na tabela de usuários
        const { data: userData, error: userError } = await supabaseClient
            .from('userleadsinfinite') // substitua pelo nome da sua tabela
            .select('*')
            .eq('email', email)
            .eq('senha', password) // ou o nome da coluna de senha
            .eq('status', 'ativo') // opcional: verificar se está ativo
            .single();

        if (userError || !userData) {
            throw new Error('E-mail ou senha incorretos');
        }

        console.log('Login bem-sucedido:', userData);
        isAuthenticated = true;

        // Salvar dados no localStorage
        const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 horas
        localStorage.setItem('leads_infinite_auth', 'authenticated');
        localStorage.setItem('leads_infinite_auth_expiry', expiryTime.toString());
        localStorage.setItem('leads_infinite_user_email', email);
        localStorage.setItem('leads_infinite_user_data', JSON.stringify({
            id: userData.id,
            nome: userData.nome || 'Usuário',
            email: userData.email,
            plano: userData.plano || 'básico',
            status: userData.status || 'ativo'
        }));

        loginBtnText.innerHTML = '<i class="bi bi-check-circle me-2"></i>Sucesso!';

        setTimeout(() => {
            showMainContentImmediate();
            initializeAuthenticatedApp();
        }, 1000);

    } catch (error) {
        console.error('Erro no login:', error);
        let errorMessage = 'E-mail ou senha incorretos';

        if (error.message.includes('Row Level Security')) {
            errorMessage = 'Erro de permissão. Contate o suporte.';
        }

        showLoginError(errorMessage);
    } finally {
        loginBtn.disabled = false;
        loginLoading.style.display = 'none';
        loginBtnText.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Entrar';
    }
}

// Função de logout 
function logout() {
    console.log('🚪 Fazendo logout...');
    localStorage.removeItem('leads_infinite_auth');
    localStorage.removeItem('leads_infinite_auth_expiry');
    localStorage.removeItem('leads_infinite_user_email');
    localStorage.removeItem('leads_infinite_user_data');
    isAuthenticated = false;

    // Recarregar a página para garantir limpeza completa
    location.reload();
}

function showLoginError(message) {
    const loginError = document.getElementById('loginError');
    const loginErrorText = document.getElementById('loginErrorText');

    if (loginError && loginErrorText) {
        loginErrorText.textContent = message;
        loginError.classList.remove('d-none');
    }
}

// Global state
let currentSearchType = null; // 'empresas' or 'social'
let selectedPlatform = null; // 'linkedin' or 'instagram' (for social)
let selectedResults = new Set();
let filteredResults = [];
let allResults = [];
let currentPageResults = [];
let searchInProgress = false;
let currentPage = 1;
let hasMoreResults = false;
let pagesData = {};
//let searchCoordinates = null;
let currentFilters = {
    whatsapp: '',
    rating: '',
    search: ''
};

// Map state
let miniMap = null;
let mapMarkers = [];
let currentMapView = 'street';
let capturedCoordinates = null;



const SERPER_CONFIG = {
    baseUrl: 'https://google.serper.dev', // Base URL sem endpoint
    apiKeys: [], // Array de API keys
    currentKeyIndex: 0,
    corsProxies: [
        'https://api.codetabs.com/v1/proxy?quest=',
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?'
    ]
};

const WHATSAPP_API_CONFIG = {
    baseUrl: '',
    instance: '',
    endpoint: '/chat/whatsappNumbers/',
    apiKey: '',
    authHeader: 'apikey'
};

// Theme functions
function setTheme(theme) {
    const html = document.documentElement;
    const themeIcon = document.getElementById('theme-icon');

    html.setAttribute('data-bs-theme', theme);

    if (themeIcon) {
        if (theme === 'dark') {
            themeIcon.className = 'bi bi-moon';
        } else {
            themeIcon.className = 'bi bi-sun';
        }
    }

    localStorage.setItem('leads_infinite_theme', theme);
}

function loadThemeFromStorage() {
    const savedTheme = localStorage.getItem('leads_infinite_theme') || 'dark';
    const themeIcon = document.getElementById('theme-icon');

    if (themeIcon) {
        if (savedTheme === 'dark') {
            themeIcon.className = 'bi bi-moon';
        } else {
            themeIcon.className = 'bi bi-sun';
        }
    }

    document.documentElement.setAttribute('data-bs-theme', savedTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.getAttribute('data-bs-theme') === 'light') {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

// Função para obter a próxima API key no rodízio
function getNextSerperKey() {
    if (SERPER_CONFIG.apiKeys.length === 0) {
        throw new Error('Nenhuma API key configurada');
    }

    const key = SERPER_CONFIG.apiKeys[SERPER_CONFIG.currentKeyIndex];
    SERPER_CONFIG.currentKeyIndex = (SERPER_CONFIG.currentKeyIndex + 1) % SERPER_CONFIG.apiKeys.length;

    console.log(`Usando API key ${SERPER_CONFIG.currentKeyIndex}/${SERPER_CONFIG.apiKeys.length}`);
    return key;
}

// Função para adicionar campo de API key
function addSerperKeyInput() {
    const container = document.getElementById('serper-keys-container');
    const currentInputs = container.querySelectorAll('.serper-key-input').length;

    if (currentInputs >= 5) {
        showErrorToast('Máximo de 5 API keys atingido');
        return;
    }

    const keyIndex = currentInputs + 1;
    const inputHtml = `
        <div class="serper-key-input mb-2" data-key-index="${keyIndex}">
            <div class="input-group">
                <span class="input-group-text">Key ${keyIndex}</span>
                <input type="password" class="form-control serper-key-field" 
                       placeholder="Sua chave do Serper.dev" data-key-index="${keyIndex}">
                <button class="btn btn-outline-danger" type="button" 
                        onclick="removeSerperKeyInput(${keyIndex})">
                    <i class="bi bi-trash"></i>
                </button>
                <button class="btn btn-outline-secondary" type="button" 
                        onclick="togglePasswordVisibility('serper-key-${keyIndex}')">
                    <i class="bi bi-eye"></i>
                </button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', inputHtml);

    // Atualizar o id do input para funcionar com toggle password
    const newInput = container.querySelector(`[data-key-index="${keyIndex}"] .serper-key-field`);
    newInput.id = `serper-key-${keyIndex}`;
}

// Função para remover campo de API key
function removeSerperKeyInput(index) {
    const container = document.getElementById('serper-keys-container');
    const input = container.querySelector(`[data-key-index="${index}"]`);

    if (input) {
        input.remove();
        // Reindexar os inputs restantes
        reindexSerperKeys();
    }
}

// Reindexar inputs após remoção
function reindexSerperKeys() {
    const container = document.getElementById('serper-keys-container');
    const inputs = container.querySelectorAll('.serper-key-input');

    inputs.forEach((input, index) => {
        const newIndex = index + 1;
        input.dataset.keyIndex = newIndex;
        input.querySelector('.input-group-text').textContent = `Key ${newIndex}`;

        const field = input.querySelector('.serper-key-field');
        field.dataset.keyIndex = newIndex;
        field.id = `serper-key-${newIndex}`;

        const removeBtn = input.querySelector('.btn-outline-danger');
        removeBtn.onclick = () => removeSerperKeyInput(newIndex);

        const toggleBtn = input.querySelector('.btn-outline-secondary');
        toggleBtn.onclick = () => togglePasswordVisibility(`serper-key-${newIndex}`);
    });
}

function selectSearchType(type) {
    currentSearchType = type;

    // Update UI
    document.querySelectorAll('.search-type-card').forEach(card => {
        card.classList.remove('active');
    });

    const selectedCard = document.getElementById(`${type}-card`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    // Show/hide sections based on type
    const socialPlatformSection = document.getElementById('social-platform-section');
    const mapSection = document.getElementById('map-section');
    const ratingFilterContainer = document.getElementById('rating-filter-container');
    const disparadorContainer = document.getElementById('disparador-export-container');

    if (type === 'social') {
        if (socialPlatformSection) socialPlatformSection.classList.remove('d-none');
        if (mapSection) mapSection.classList.add('d-none');
        if (ratingFilterContainer) ratingFilterContainer.classList.add('d-none');
        if (disparadorContainer) disparadorContainer.classList.add('d-none');
        selectedPlatform = null;

        // Clear platform selection
        document.querySelectorAll('.platform-card').forEach(card => {
            card.classList.remove('active');
        });
    } else {
        if (socialPlatformSection) socialPlatformSection.classList.add('d-none');
        if (mapSection) mapSection.classList.remove('d-none');
        if (ratingFilterContainer) ratingFilterContainer.classList.remove('d-none');
        if (disparadorContainer) disparadorContainer.classList.remove('d-none');
        selectedPlatform = null;

        // Initialize map if not already done
        if (!miniMap) {
            setTimeout(initializeMap, 100);
        }
    }

    updateSearchInterface();
    resetSearch();
}

function selectPlatform(platform) {
    const previousPlatform = selectedPlatform;
    selectedPlatform = platform;

    // Update UI
    document.querySelectorAll('.platform-card').forEach(card => {
        card.classList.remove('active');
    });

    const selectedCard = document.getElementById(`${platform}-card`);
    if (selectedCard) {
        selectedCard.classList.add('active');
    }

    // LIMPAR BUSCA SE MUDOU DE PLATAFORMA
    if (previousPlatform && previousPlatform !== platform) {
        console.log(`Plataforma mudou de ${previousPlatform} para ${platform} - limpando busca`);
        resetSearch();

        // Limpar também o campo de busca
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }

        // Mostrar toast informativo
        showSuccessToast(`Plataforma alterada para ${platform.charAt(0).toUpperCase() + platform.slice(1)}. Faça uma nova busca.`);
    }

    updateSearchInterface();
}

// Update search interface based on selection
function updateSearchInterface() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchModeBadge = document.getElementById('search-mode-badge');
    const examples = document.getElementById('search-examples');
    const examplesText = document.getElementById('examples-text');

    if (currentSearchType === 'empresas') {
        searchModeBadge.textContent = 'Buscar Empresas';
        searchModeBadge.className = 'badge text-white ms-2';
        searchModeBadge.style.background = 'linear-gradient(135deg, #4285f4, #34a853)';

        searchInput.placeholder = 'Ex: Petshop em Salvador, Dentista em São Paulo...';
        searchInput.disabled = false;
        searchBtn.disabled = false;

        examples.classList.remove('d-none');
        examplesText.innerHTML = '<strong>Empresas:</strong> Use localização + tipo de negócio. Ex: "Petshop Salvador", "Clínica médica São Paulo"';

        updateStatsForEmpresas();

    } else if (currentSearchType === 'social' && selectedPlatform) {
        if (selectedPlatform === 'linkedin') {
            searchModeBadge.textContent = 'LinkedIn';
            searchModeBadge.style.background = 'linear-gradient(135deg, #0077b5, #004182)';
            searchInput.placeholder = 'Ex: CEO, Gerente Comercial, Diretor...';
            examplesText.innerHTML = '<strong>LinkedIn:</strong> Use termos específicos da profissão. Ex: "CEO", "Gerente Comercial"';
        } else {
            searchModeBadge.textContent = 'Instagram';
            searchModeBadge.style.background = 'linear-gradient(135deg, #e4405f, #833ab4)';
            searchInput.placeholder = 'Ex: Clínica Médica, Pet Shop, Restaurante...';
            examplesText.innerHTML = '<strong>Instagram:</strong> Use termos específicos do negócio. Ex: "Clínica de Estética", "Pet Shop"';
        }

        searchInput.disabled = false;
        searchBtn.disabled = false;
        examples.classList.remove('d-none');

        updateStatsForSocial();

    } else {
        searchModeBadge.textContent = 'Selecione o tipo de busca';
        searchModeBadge.className = 'badge bg-primary ms-2';
        searchModeBadge.style.background = '';

        searchInput.placeholder = 'Selecione o tipo de busca primeiro...';
        searchInput.disabled = true;
        searchBtn.disabled = true;
        examples.classList.add('d-none');

        resetStats();
    }

    updateExportInfo();
}

// Update stats container based on search type
function updateStatsForEmpresas() {
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = `
                <div class="col-6">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-success" id="whatsapp-count">0</div>
                        <small class="text-muted">Com WhatsApp</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-danger" id="no-whatsapp-count">0</div>
                        <small class="text-muted">Sem WhatsApp</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-warning" id="avg-rating">0.0</div>
                        <small class="text-muted">Rating Médio</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-info" id="verified-count">0</div>
                        <small class="text-muted">Verificados</small>
                    </div>
                </div>
            `;
}

function updateStatsForSocial() {
    const statsContainer = document.getElementById('stats-container');
    const platformName = selectedPlatform === 'linkedin' ? 'LinkedIn' : 'Instagram';
    const platformColor = selectedPlatform === 'linkedin' ? 'text-primary' : 'text-danger';

    statsContainer.innerHTML = `
                <div class="col-6">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold ${platformColor}" id="platform-count">0</div>
                        <small class="text-muted">${platformName}</small>
                    </div>
                </div>
                <div class="col-6">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-info" id="verified-profiles-count">0</div>
                        <small class="text-muted">Perfis Válidos</small>
                    </div>
                </div>
                <div class="col-12">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-success" id="total-profiles-count">0</div>
                        <small class="text-muted">Total de Perfis</small>
                    </div>
                </div>
            `;
}

function resetStats() {
    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = `
                <div class="col-12">
                    <div class="stats-card p-3 text-center">
                        <div class="fs-2 fw-bold text-muted">-</div>
                        <small class="text-muted">Selecione o tipo de busca</small>
                    </div>
                </div>
            `;
}

// Update export info based on search type
function updateExportInfo() {
    const exportInfo = document.getElementById('export-info');

    if (currentSearchType === 'empresas') {
        exportInfo.innerHTML = `
                    <i class="bi bi-info-circle me-1"></i>
                    <strong>Dados inclusos:</strong> Nome, Endereço, Telefone, E-mail, Rating, Reviews, Website, Status WhatsApp
                    <br><small class="text-warning mt-1 d-block">
                        <i class="bi bi-send me-1"></i>
                    </small>
                `;
    } else if (currentSearchType === 'social') {
        exportInfo.innerHTML = `
                    <i class="bi bi-info-circle me-1"></i>
                    <strong>Dados inclusos:</strong> Nome/Título, Link do Perfil, Descrição, Data de Publicação, Posição nos Resultados
                `;
    } else {
        exportInfo.innerHTML = `
                    <i class="bi bi-info-circle me-1"></i>
                    <strong>Dados inclusos:</strong> Depende do tipo de busca selecionado
                `;
    }
}

// Reset search state
function resetSearch() {
    allResults = [];
    currentPageResults = [];
    filteredResults = [];
    selectedResults.clear();
    currentPage = 1;
    hasMoreResults = false;
    pagesData = {};
    //searchCoordinates = null;
    capturedCoordinates = null;

    // Reset filters
    currentFilters = {
        whatsapp: '',
        rating: ''
    };

    // Clear filter inputs
    const whatsappFilter = document.getElementById('whatsapp-filter');
    const ratingFilter = document.getElementById('rating-filter');

    if (whatsappFilter) whatsappFilter.value = '';
    if (ratingFilter) ratingFilter.value = '';

    // Hide pagination and reset UI
    document.getElementById('pagination-controls').classList.add('d-none');
    loadResults();
    updateCounts();
    updateExportButton();
}

// Main search function
async function searchLeads(pageNum = 1) {
    if (!currentSearchType) {
        showErrorToast('Selecione o tipo de busca primeiro!');
        return;
    }

    if (currentSearchType === 'social' && !selectedPlatform) {
        showErrorToast('Selecione uma plataforma social primeiro!');
        return;
    }

    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.trim();

    if (!searchTerm) {
        showErrorToast('Digite um termo de busca');
        return;
    }

    // Show loading
    const searchBtn = document.getElementById('search-btn-text');
    const spinner = document.querySelector('.loading-spinner');

    spinner.style.display = 'inline-block';
    searchBtn.innerHTML = pageNum === 1 ? 'Buscando...' : `Carregando página ${pageNum}...`;
    searchInProgress = true;

    try {
        let results;

        if (currentSearchType === 'empresas') {
            results = await searchEmpresas(searchTerm, pageNum);
        } else {
            results = await searchSocial(searchTerm, pageNum);
        }

        if (results && results.length > 0) {
            // Store page data
            pagesData[pageNum] = results;
            currentPage = pageNum;
            currentPageResults = results;

            // Update global results
            if (pageNum === 1) {
                allResults = [...results];
            } else {
                allResults = [...allResults, ...results];
            }

            applyFiltersToCurrentPage();
            loadResults();
            updatePaginationControls();
            updateCounts();
            updateExportButton();

            if (currentSearchType === 'empresas') {
                updateMapMarkers();
            }

            document.getElementById('pagination-controls').classList.remove('d-none');
            showSuccessToast(`Encontrados ${results.length} resultados!`);

        } else {
            if (pageNum === 1) {
                showErrorToast('Nenhum resultado encontrado. Tente outros termos de busca.');
                document.getElementById('pagination-controls').classList.add('d-none');
            } else {
                showErrorToast('Não há mais resultados disponíveis.');
            }
        }

    } catch (error) {
        console.error('Erro na busca:', error);
        showErrorToast(`Erro ao buscar: ${error.message}`);

        if (pageNum === 1) {
            document.getElementById('pagination-controls').classList.add('d-none');
        }
    } finally {
        // Hide loading
        spinner.style.display = 'none';
        searchBtn.innerHTML = '<i class="bi bi-search me-2"></i>Buscar';
        searchInProgress = false;
    }
}

// Search empresas function - ALTERADO PARA SERPER MAPS
async function searchEmpresas(searchTerm, pageNum = 1) {
    if (SERPER_CONFIG.apiKeys.length === 0) {
        throw new Error('Configure o Serper Maps API primeiro!');
    }

    const results = await callSerperMapsAPI(searchTerm, pageNum);

    // Extract phone numbers and validate WhatsApp
    const phoneNumbers = extractPhoneNumbers(results.results || []);
    const whatsappValidation = await validateWhatsAppNumbers(phoneNumbers);

    return processEmpresasResults(results.results || [], whatsappValidation);
}

// Search social function  
async function searchSocial(searchTerm, pageNum = 1) {
    if (SERPER_CONFIG.apiKeys.length === 0) {
        throw new Error('Configure o Serper API primeiro!');
    }

    const results = await callSerperAPI(searchTerm, pageNum);
    return processSocialResults(results);
}

async function callSerperMapsAPI(searchTerm, pageNum = 1) {
    if (SERPER_CONFIG.apiKeys.length === 0) {
        throw new Error('Configure o Serper API primeiro!');
    }

    const apiKey = getNextSerperKey(); // Usar rodízio
    const requestBody = {
        q: searchTerm,
        hl: 'pt-br',
        page: pageNum
    };

    // Para páginas > 1, adicionar coordenadas capturadas da primeira página
    if (pageNum > 1 && capturedCoordinates) {
        requestBody.ll = capturedCoordinates;
    }

    const mapsEndpoint = `${SERPER_CONFIG.baseUrl}/maps`;

    console.log(`Buscando página ${pageNum} para: ${searchTerm}`);
    console.log('Request body:', requestBody);

    // Try direct call first
    try {
        const response = await fetch(mapsEndpoint, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Response data:', data);
            return processSerperMapsResponse(data, pageNum);
        } else {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.log('Direct call failed:', error.message);
        console.log('Trying with CORS proxy...');
    }

    // Try with CORS proxy
    const proxy = SERPER_CONFIG.corsProxies[0];

    try {
        console.log('Trying proxy:', proxy);

        const response = await fetch(`${proxy}${encodeURIComponent(mapsEndpoint)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Proxy response status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('Proxy response data:', data);
            return processSerperMapsResponse(data, pageNum);
        } else {
            const errorText = await response.text();
            console.error('Proxy response error:', errorText);
            throw new Error(`Proxy HTTP ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error('Proxy failed:', error.message);
        throw new Error(`Falha na comunicação: ${error.message}`);
    }
}

function processSerperMapsResponse(data, pageNum = 1) {
    console.log('Processing Maps response for page:', pageNum);

    if (!data.places || !Array.isArray(data.places)) {
        console.log('No places found in response');
        return {
            results: [],
            coordinates: null,
            hasMore: false
        };
    }

    // CAPTURAR COORDENADAS DA PRIMEIRA PÁGINA
    if (pageNum === 1) {
        capturedCoordinates = extractCoordinatesFromResponse(data);
        console.log('Captured coordinates for pagination:', capturedCoordinates);
    }

    console.log(`Found ${data.places.length} places`);
    hasMoreResults = data.places.length >= 15 && pageNum < 100;
    console.log('Has more results:', hasMoreResults);

    const transformedResults = data.places.map((place, index) => ({
        id: `${place.placeId || 'no-id'}_${pageNum}_${index}_${Date.now()}`,
        name: place.title || 'Nome não disponível',
        title: place.title || 'Nome não disponível',
        endereco: place.address || 'Endereço não disponível',
        address: place.address || 'Endereço não disponível',
        telefone: place.phoneNumber || 'Telefone não disponível',
        phone: place.phoneNumber || 'Telefone não disponível',
        rating: place.rating || 0,
        reviews: place.ratingCount || 0,
        website: place.website || null,
        types: place.category || 'Categoria não disponível',
        type: place.category || 'Categoria não disponível',
        place_id: place.placeId || null,
        gps_coordinates: place.latitude && place.longitude ? {
            latitude: place.latitude,
            longitude: place.longitude
        } : null,
        pageNum: pageNum
    }));

    console.log(`Transformed ${transformedResults.length} results`);

    return {
        results: transformedResults,
        coordinates: capturedCoordinates,
        hasMore: hasMoreResults
    };
}

function extractCoordinatesFromResponse(data) {
    // Tentar diferentes fontes de coordenadas na resposta

    // 1. Se há searchParameters com coordenadas
    if (data.searchParameters && data.searchParameters.ll) {
        return data.searchParameters.ll;
    }

    // 2. Se há informações de localização nos metadados
    if (data.searchMetadata && data.searchMetadata.ll) {
        return data.searchMetadata.ll;
    }

    // 3. Calcular centro baseado nos primeiros resultados
    if (data.places && data.places.length > 0) {
        const placesWithCoords = data.places.filter(place =>
            place.latitude && place.longitude
        );

        if (placesWithCoords.length > 0) {
            // Calcular centro dos primeiros 5 resultados
            const samplePlaces = placesWithCoords.slice(0, 5);
            const avgLat = samplePlaces.reduce((sum, place) => sum + place.latitude, 0) / samplePlaces.length;
            const avgLng = samplePlaces.reduce((sum, place) => sum + place.longitude, 0) / samplePlaces.length;

            // Formato: @latitude,longitude,zoom
            return `@${avgLat.toFixed(6)},${avgLng.toFixed(6)},12z`;
        }
    }

    // 4. Fallback: Coordenadas do Brasil (centro)
    return '@-14.235,-51.9253,6z';
}

async function callSerperAPI(searchTerm, pageNum = 1) {
    if (SERPER_CONFIG.apiKeys.length === 0) {
        throw new Error('Configure o Serper API primeiro!');
    }

    const apiKey = getNextSerperKey();

    if (!selectedPlatform) {
        throw new Error('Nenhuma plataforma selecionada');
    }

    let searchQuery;

    if (selectedPlatform === 'linkedin') {
        searchQuery = `site:linkedin.com/in/ "${searchTerm}"`;
    } else if (selectedPlatform === 'instagram') {
        searchQuery = `site:instagram.com "${searchTerm}" -inurl:reel -inurl:p/ -inurl:stories`;
    }

    const requestBody = {
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br',
        page: pageNum  // USAR PAGINAÇÃO NATIVA
    };

    const searchEndpoint = `${SERPER_CONFIG.baseUrl}/search`;

    // Try direct call first
    try {
        const response = await fetch(searchEndpoint, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            return processSocialSerperResponse(data, pageNum);
        }
    } catch (error) {
        console.log('Direct call failed, trying with CORS proxy...');
    }

    // Try with CORS proxies
    for (const proxy of SERPER_CONFIG.corsProxies) {
        try {
            let response;

            if (proxy.includes('codetabs')) {
                response = await fetch(`${proxy}${encodeURIComponent(searchEndpoint)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-KEY': apiKey
                    },
                    body: JSON.stringify(requestBody)
                });
            } else if (proxy.includes('allorigins')) {
                response = await fetch(proxy, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        url: searchEndpoint,
                        method: 'POST',
                        headers: {
                            'X-API-KEY': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    })
                });
            } else {
                response = await fetch(proxy + encodeURIComponent(searchEndpoint), {
                    method: 'POST',
                    headers: {
                        'X-API-KEY': apiKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
            }

            if (response.ok) {
                let data;
                const responseData = await response.json();

                if (proxy.includes('allorigins') && responseData.contents) {
                    data = JSON.parse(responseData.contents);
                } else {
                    data = responseData;
                }

                return processSocialSerperResponse(data, pageNum);
            }
        } catch (error) {
            console.log(`Proxy failed: ${proxy}`, error.message);
        }
    }

    throw new Error('Todos os métodos de acesso falharam');
}

function processSocialSerperResponse(data, pageNum = 1) {
    console.log(`[${selectedPlatform.toUpperCase()}] Processing response for page:`, pageNum);

    if (!data.organic || !Array.isArray(data.organic)) {
        console.log(`[${selectedPlatform.toUpperCase()}] No organic results found`);
        return [];
    }

    console.log(`[${selectedPlatform.toUpperCase()}] Found ${data.organic.length} organic results`);
    hasMoreResults = data.organic.length >= 8 && pageNum < 100;
    console.log(`[${selectedPlatform.toUpperCase()}] Has more results:`, hasMoreResults);

    const filtered = data.organic.filter(item => {
        const title = (item.title || '').toLowerCase();
        const snippet = (item.snippet || '').toLowerCase();
        const link = (item.link || '').toLowerCase();

        if (selectedPlatform === 'linkedin') {
            const isJob = link.includes('/jobs/') ||
                title.includes('vaga ') ||
                title.includes('emprego ') ||
                snippet.includes('candidatar');
            const isLinkedInProfile = link.includes('linkedin.com/in/');
            return isLinkedInProfile && !isJob;
        }

        if (selectedPlatform === 'instagram') {
            const isReel = link.includes('/reel/') ||
                link.includes('/stories/') ||
                (link.includes('/p/') && snippet.includes('reel'));
            const isInstagramProfile = link.includes('instagram.com') && !link.includes('instagram.com/p/');
            return isInstagramProfile && !isReel;
        }

        return true;
    });

    console.log(`[${selectedPlatform.toUpperCase()}] Filtered to ${filtered.length} valid results`);

    const results = filtered.map((item, index) => ({
        id: `${selectedPlatform}_${item.link}_${pageNum}_${index}_${Date.now()}`,
        title: item.title || 'Título não disponível',
        name: item.title || 'Título não disponível',
        link: item.link || '#',
        snippet: item.snippet || 'Descrição não disponível',
        position: item.position || ((pageNum - 1) * 10 + index + 1),
        platform: selectedPlatform,
        searchTerm: document.getElementById('search-input').value,
        type: 'social',
        pageNum: pageNum
    }));

    console.log(`[${selectedPlatform.toUpperCase()}] Transformed ${results.length} final results`);
    return results;
}

// Extract phone numbers
function extractPhoneNumbers(results) {
    const phoneNumbers = [];
    const phoneSet = new Set();

    results.forEach(result => {
        const phoneField = result.phone || result.telefone;

        if (!phoneField || phoneField === 'Telefone não disponível') {
            return;
        }

        const cleanPhone = phoneField.replace(/\D/g, '');

        if (cleanPhone.length >= 10) {
            if (!phoneSet.has(cleanPhone)) {
                phoneSet.add(cleanPhone);
                phoneNumbers.push(cleanPhone);
            }
        }
    });

    return phoneNumbers;
}

// Validate WhatsApp numbers
async function validateWhatsAppNumbers(phoneNumbers) {
    if (phoneNumbers.length === 0) {
        return {};
    }

    const hasEvolutionAPI = WHATSAPP_API_CONFIG.baseUrl &&
        WHATSAPP_API_CONFIG.instance &&
        WHATSAPP_API_CONFIG.apiKey;

    if (!hasEvolutionAPI) {
        return {};
    }

    const url = `${WHATSAPP_API_CONFIG.baseUrl}${WHATSAPP_API_CONFIG.endpoint}${WHATSAPP_API_CONFIG.instance}`;

    const requestBody = { numbers: phoneNumbers };

    const headers = {
        'Content-Type': 'application/json',
        [WHATSAPP_API_CONFIG.authHeader]: WHATSAPP_API_CONFIG.apiKey
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`WhatsApp API error: ${response.status}`);
        }

        const responseData = await response.json();
        const validationMap = {};

        if (Array.isArray(responseData)) {
            responseData.forEach(item => {
                if (item.number) {
                    const number = item.number.toString();
                    const hasWhatsApp = item.exists === true;

                    validationMap[number] = {
                        hasWhatsApp: hasWhatsApp,
                        status: hasWhatsApp ? 'verified' : 'no_whatsapp',
                        jid: item.jid || null
                    };
                }
            });
        }

        return validationMap;

    } catch (error) {
        console.error('Erro na validação WhatsApp:', error);
        return {};
    }
}

// Process empresas results
function processEmpresasResults(serpResults, whatsappValidation) {
    const hasWhatsAppValidation = Object.keys(whatsappValidation).length > 0;

    return serpResults.map((result, index) => {
        const originalPhone = result.phone || result.telefone;
        const cleanPhone = originalPhone ? originalPhone.replace(/\D/g, '') : null;

        let hasWhatsApp = null;
        let status = 'not_checked';

        if (hasWhatsAppValidation && cleanPhone && whatsappValidation[cleanPhone]) {
            const whatsappData = whatsappValidation[cleanPhone];
            hasWhatsApp = whatsappData.hasWhatsApp;
            status = whatsappData.status;
        }

        return {
            id: Date.now() + index,
            name: result.title || result.name || 'Nome não disponível',
            title: result.title || result.name || 'Nome não disponível',
            endereco: result.address || result.endereco || 'Endereço não disponível',
            address: result.address || result.endereco || 'Endereço não disponível',
            telefone: originalPhone || 'Telefone não disponível',
            phone: originalPhone || 'Telefone não disponível',
            email: result.email || null,
            rating: result.rating || 0,
            reviews: result.reviews || 0,
            website: result.website || null,
            types: result.type ? (Array.isArray(result.type) ? result.type.join(', ') : result.type) : 'Categoria não disponível',
            type: result.type || 'Categoria não disponível',
            hasWhatsApp: hasWhatsApp,
            status: status,
            category: extractMainCategory(result.type || result.types || ''),
            place_id: result.place_id || null,
            gps_coordinates: result.gps_coordinates || null,
            searchType: 'empresas'
        };
    });
}

// Process social results
function processSocialResults(results) {
    return results.map(result => ({
        ...result,
        searchType: 'social'
    }));
}

// Extract main category from types
function extractMainCategory(types) {
    if (!types) return 'Outros';

    const typesList = types.toLowerCase();

    if (typesList.includes('dental') || typesList.includes('dentist')) return 'Dentista';
    if (typesList.includes('pet')) return 'Pet Shop';
    if (typesList.includes('restaurant')) return 'Restaurante';
    if (typesList.includes('store')) return 'Loja';
    if (typesList.includes('hospital')) return 'Hospital';
    if (typesList.includes('school')) return 'Escola';
    if (typesList.includes('hotel')) return 'Hotel';
    if (typesList.includes('clinic')) return 'Clínica';
    if (typesList.includes('pharmacy')) return 'Farmácia';
    if (typesList.includes('bank')) return 'Banco';

    return 'Outros';
}

// Apply filters to current page data
function applyFiltersToCurrentPage() {
    let filtered = [...currentPageResults];

    // Apply WhatsApp filter (only for empresas)
    if (currentSearchType === 'empresas' && currentFilters.whatsapp !== '') {
        if (currentFilters.whatsapp === 'true') {
            filtered = filtered.filter(p => p.hasWhatsApp === true);
        } else if (currentFilters.whatsapp === 'false') {
            filtered = filtered.filter(p => p.hasWhatsApp === false || p.hasWhatsApp === null);
        }
    }

    // Apply rating filter (only for empresas)
    if (currentSearchType === 'empresas' && currentFilters.rating !== '') {
        filtered = filtered.filter(p => (p.rating || 0) >= parseFloat(currentFilters.rating));
    }

    filteredResults = filtered;
    updateFilterStatus();
}

// Update filter status display
function updateFilterStatus() {
    const filterStatus = document.getElementById('filter-status');
    const filterDescription = document.getElementById('filter-description');

    const activeFilters = [];

    // if (currentFilters.search && currentFilters.search.trim() !== '') {
    //     activeFilters.push(`Busca: "${currentFilters.search}"`);
    // }

    if (currentSearchType === 'empresas') {
        if (currentFilters.whatsapp === 'true') {
            activeFilters.push('Apenas com WhatsApp');
        } else if (currentFilters.whatsapp === 'false') {
            activeFilters.push('Sem WhatsApp');
        }

        if (currentFilters.rating !== '') {
            activeFilters.push(`Rating ${currentFilters.rating}+ estrelas`);
        }
    }

    if (activeFilters.length > 0) {
        filterStatus.classList.remove('d-none');
        filterDescription.textContent = `Filtros ativos: ${activeFilters.join(', ')}`;
    } else {
        filterStatus.classList.add('d-none');
    }
}

// Load results to UI
function loadResults() {
    const container = document.getElementById('results-container');
    const emptyState = document.getElementById('empty-state');

    if (!container || !emptyState) return;

    container.innerHTML = '';

    if (filteredResults.length === 0) {
        container.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }

    container.classList.remove('d-none');
    emptyState.classList.add('d-none');

    filteredResults.forEach(result => {
        const resultElement = createResultElement(result);
        container.appendChild(resultElement);
    });

    updateCounts();
    updateExportButton();
}

// Create result element
function createResultElement(result) {
    const div = document.createElement('div');
    div.className = 'col-12';

    const isSelected = selectedResults.has(result.id);

    if (result.searchType === 'empresas') {
        div.innerHTML = createEmpresaElement(result, isSelected);
    } else {
        div.innerHTML = createSocialElement(result, isSelected);
    }

    return div;
}

// Create empresa element (Leads PRO format)
function createEmpresaElement(result, isSelected) {
    const formattedPhone = formatPhoneNumber(result.telefone);

    return `
                <div class="card prospect-card fade-in ${isSelected ? 'selected' : ''}" onclick="toggleResultSelection(${result.id})">
                    <div class="card-body p-3">
                        <div class="row align-items-start">
                            <div class="col-auto">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" ${isSelected ? 'checked' : ''} 
                                            onclick="event.stopPropagation()" onchange="toggleResultSelection(${result.id})">
                                </div>
                            </div>
                            <div class="col">
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="d-flex align-items-center mb-2">
                                            <h6 class="mb-0 me-2 text-truncate" style="max-width: 300px;" title="${result.name}">${result.name}</h6>
                                            <div class="d-flex align-items-center gap-1 flex-shrink-0">
                                                ${result.hasWhatsApp === true ?
            '<span class="whatsapp-status bg-success text-white">WhatsApp</span>' :
            result.hasWhatsApp === false ?
                '<span class="whatsapp-status bg-danger text-white">Sem WhatsApp</span>' :
                '<span class="whatsapp-status bg-secondary text-white">Não Verificado</span>'
        }
                                            </div>
                                        </div>
                                        
                                        <div class="small text-muted">
                                            <div class="d-flex align-items-start mb-1">
                                                <i class="bi bi-geo-alt me-2 flex-shrink-0 mt-1"></i>
                                                <span class="text-truncate" title="${result.endereco}">${result.endereco}</span>
                                            </div>
                                            <div class="d-flex align-items-center mb-1">
                                                <i class="bi bi-telephone me-2 flex-shrink-0"></i>
                                                <span class="me-2">${formattedPhone}</span>
                                                ${result.hasWhatsApp === true ?
            `<a href="https://wa.me/${result.telefone.replace(/\D/g, '')}" target="_blank" class="text-success">
                                                        <i class="bi bi-whatsapp"></i>
                                                    </a>` : ''
        }
                                            </div>
                                            ${result.website ? `
                                                <div class="d-flex align-items-center mb-1">
                                                    <i class="bi bi-globe me-2 flex-shrink-0"></i>
                                                    <a href="${result.website}" target="_blank" class="text-decoration-none text-truncate" style="max-width: 250px;">
                                                        ${result.website}
                                                    </a>
                                                </div>
                                            ` : ''}
                                            ${result.email ? `
                                                <div class="d-flex align-items-center mb-1">
                                                    <i class="bi bi-envelope me-2 flex-shrink-0"></i>
                                                    <span class="text-truncate" style="max-width: 250px;" title="${result.email}">
                                                        ${result.email}
                                                    </span>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </div>
                                    <div class="col-md-4 text-md-end">
                                        <div class="mb-2">
                                            ${result.rating > 0 ? `
                                                <div class="d-flex align-items-center justify-content-md-end">
                                                    <div class="rating-stars me-1">
                                                        ${generateStars(result.rating)}
                                                    </div>
                                                    <span class="small fw-bold">${result.rating}</span>
                                                    <span class="small text-muted ms-1">(${result.reviews})</span>
                                                </div>
                                            ` : '<span class="small text-muted">Sem avaliações</span>'}
                                        </div>
                                        <div class="d-flex justify-content-md-end">
                                            <span class="badge bg-primary">${result.category || 'Outros'}</span>
                                        </div>
                                        <div class="mt-2">
                                            <small class="text-muted text-truncate d-block" style="max-width: 200px;" title="${result.types}">
                                                <i class="bi bi-tags me-1"></i>${result.types}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
}

// Create social element (Social Prospector format)
function createSocialElement(result, isSelected) {
    const platformIcon = result.platform === 'linkedin' ? 'bi-linkedin' : 'bi-instagram';
    const platformColor = result.platform === 'linkedin' ? 'text-primary' : 'text-danger';

    return `
                <div class="card prospect-card fade-in ${isSelected ? 'selected' : ''}" onclick="toggleResultSelection(${result.id})">
                    <div class="card-body p-3">
                        <div class="row align-items-start">
                            <div class="col-auto">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" ${isSelected ? 'checked' : ''} 
                                            onclick="event.stopPropagation()" onchange="toggleResultSelection(${result.id})">
                                </div>
                            </div>
                            <div class="col">
                                <div class="row">
                                    <div class="col-md-8">
                                        <div class="d-flex align-items-center mb-2">
                                            <i class="bi ${platformIcon} ${platformColor} me-2"></i>
                                            <h6 class="mb-0 me-2 text-truncate" style="max-width: 400px;" title="${result.title}">
                                                ${result.title}
                                            </h6>
                                        </div>
                                        
                                        <div class="small text-muted mb-2">
                                            <p class="mb-1" title="${result.snippet}">
                                                ${result.snippet && result.snippet.length > 150 ? result.snippet.substring(0, 150) + '...' : result.snippet}
                                            </p>
                                        </div>
                                        
                                        <div class="d-flex align-items-center gap-2 flex-wrap">
                                            <a href="${result.link}" target="_blank" class="btn btn-outline-primary btn-sm">
                                                <i class="bi bi-box-arrow-up-right me-1"></i>Visitar Perfil
                                            </a>
                                        </div>
                                    </div>
                                    <div class="col-md-4 text-md-end">
                                        <div class="mb-2">
                                            <span class="badge ${result.platform === 'linkedin' ? 'bg-primary' : 'bg-danger'} mb-2">
                                                ${result.platform.charAt(0).toUpperCase() + result.platform.slice(1)}
                                            </span>
                                        </div>
                                        <div class="small text-muted">
                                            <i class="bi bi-hash me-1"></i>Posição ${result.position}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
}

// Format phone number
function formatPhoneNumber(phone) {
    if (!phone) return 'Não informado';

    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }

    return phone;
}

// Generate star rating
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="bi bi-star-fill"></i>';
    }

    if (hasHalfStar) {
        stars += '<i class="bi bi-star-half"></i>';
        for (let i = fullStars + 1; i < 5; i++) {
            stars += '<i class="bi bi-star"></i>';
        }
    } else {
        for (let i = fullStars; i < 5; i++) {
            stars += '<i class="bi bi-star"></i>';
        }
    }

    return stars;
}

// Toggle result selection
function toggleResultSelection(id) {
    if (selectedResults.has(id)) {
        selectedResults.delete(id);
    } else {
        selectedResults.add(id);
    }

    loadResults();
    updateExportButton();
}

function loadNextPage() {
    if (!hasMoreResults || searchInProgress) {
        console.log('No more results or search in progress');
        return;
    }

    // VALIDAÇÃO ADICIONAL para perfis sociais
    if (currentSearchType === 'social' && !selectedPlatform) {
        showErrorToast('Erro: Nenhuma plataforma social selecionada');
        return;
    }

    const nextPage = currentPage + 1;
    console.log(`Loading next page: ${nextPage}`);
    console.log('Current search type:', currentSearchType);
    console.log('Selected platform:', selectedPlatform);

    if (pagesData[nextPage]) {
        currentPage = nextPage;
        currentPageResults = pagesData[nextPage];
        applyFiltersToCurrentPage();
        loadResults();
        updatePaginationControls();
        showSuccessToast(`Página ${currentPage} carregada (cache)`);
        return;
    }

    searchLeads(nextPage);
}

function loadPreviousPage() {
    if (currentPage <= 1 || searchInProgress) return;

    const previousPage = currentPage - 1;

    if (pagesData[previousPage]) {
        currentPage = previousPage;
        currentPageResults = pagesData[previousPage];
        applyFiltersToCurrentPage();
        loadResults();
        updatePaginationControls();
        showSuccessToast(`Página ${currentPage} carregada`);
    }
}

function updatePaginationControls() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const pageInfo = document.getElementById('page-info');
    const showingRange = document.getElementById('showing-range');
    const totalAvailable = document.getElementById('total-available');

    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }

    if (nextBtn) {
        nextBtn.disabled = !hasMoreResults;
        nextBtn.innerHTML = hasMoreResults ?
            'Próxima <i class="bi bi-chevron-right"></i>' :
            'Fim dos resultados';
    }

    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage}`;
    }

    if (showingRange) {
        showingRange.textContent = `1-${filteredResults.length}`;
    }

    if (totalAvailable) {
        const totalLoaded = allResults.length;
        totalAvailable.textContent = hasMoreResults ? `${totalLoaded}+` : totalLoaded.toString();
    }
}

function applyFilters() {
    const whatsappFilter = document.getElementById('whatsapp-filter');
    const ratingFilter = document.getElementById('rating-filter');

    if (whatsappFilter) currentFilters.whatsapp = whatsappFilter.value;
    if (ratingFilter) currentFilters.rating = ratingFilter.value;

    applyFiltersToCurrentPage();
    loadResults();

    if (currentSearchType === 'empresas') {
        updateMapMarkers();
    }
}

function clearFilters() {
    const whatsappFilter = document.getElementById('whatsapp-filter');
    const ratingFilter = document.getElementById('rating-filter');
    //const searchInput = document.getElementById('search-input');

    if (whatsappFilter) whatsappFilter.value = '';
    if (ratingFilter) ratingFilter.value = '';
    //if (searchInput) searchInput.value = '';

    currentFilters = {
        whatsapp: '',
        rating: ''
        //search: ''
    };

    applyFiltersToCurrentPage();
    loadResults();

    if (currentSearchType === 'empresas') {
        updateMapMarkers();
    }
}

// Selection functions
function selectAll() {
    filteredResults.forEach(result => {
        selectedResults.add(result.id);
    });
    loadResults();
    updateExportButton();
    showSuccessToast(`${filteredResults.length} resultados desta página foram selecionados`);
}

function clearSelection() {
    filteredResults.forEach(result => {
        selectedResults.delete(result.id);
    });
    loadResults();
    updateExportButton();
    showSuccessToast(`Seleção da página atual foi limpa`);
}

function clearAllSelections() {
    const totalBefore = selectedResults.size;
    selectedResults.clear();
    loadResults();
    updateExportButton();
    showSuccessToast(`Todas as seleções foram limpas (${totalBefore} resultados)`);
}

// Update counts
function updateCounts() {
    const selectedCountEl = document.getElementById('selected-count');
    const resultsCountEl = document.getElementById('results-count');

    if (selectedCountEl) selectedCountEl.textContent = selectedResults.size;

    if (resultsCountEl) {
        const pageText = currentPage > 1 ? ` (Página ${currentPage})` : '';
        const filterText = (currentFilters.whatsapp || currentFilters.rating || currentFilters.search) ? ' (filtrado)' : '';
        const typeText = currentSearchType === 'empresas' ? 'empresas' : 'perfis';
        resultsCountEl.textContent = `${filteredResults.length} ${typeText} encontradas${pageText}${filterText}`;
    }

    // Update stats based on search type
    if (currentSearchType === 'empresas') {
        updateEmpresasStats();
    } else if (currentSearchType === 'social') {
        updateSocialStats();
    }
}

function updateEmpresasStats() {
    const whatsappCountEl = document.getElementById('whatsapp-count');
    const noWhatsappCountEl = document.getElementById('no-whatsapp-count');
    const verifiedCountEl = document.getElementById('verified-count');
    const avgRatingEl = document.getElementById('avg-rating');

    const whatsappCount = filteredResults.filter(p => p.hasWhatsApp === true).length;
    const noWhatsappCount = filteredResults.filter(p => p.hasWhatsApp === false).length;
    const notCheckedCount = filteredResults.filter(p => p.hasWhatsApp === null).length;
    const verifiedCount = filteredResults.filter(p => p.status === 'verified').length;

    const ratingsSum = filteredResults.reduce((sum, p) => sum + (p.rating || 0), 0);
    const avgRating = filteredResults.length > 0 ? (ratingsSum / filteredResults.length).toFixed(1) : '0.0';

    if (whatsappCountEl) whatsappCountEl.textContent = whatsappCount;
    if (noWhatsappCountEl) {
        noWhatsappCountEl.textContent = noWhatsappCount + notCheckedCount;
        noWhatsappCountEl.parentElement.querySelector('small').textContent =
            notCheckedCount > 0 ? `Sem/Não Verificado` : 'Sem WhatsApp';
    }
    if (verifiedCountEl) verifiedCountEl.textContent = verifiedCount;
    if (avgRatingEl) avgRatingEl.textContent = avgRating;
}

function updateSocialStats() {
    const platformCountEl = document.getElementById('platform-count');
    const verifiedProfilesCountEl = document.getElementById('verified-profiles-count');
    const totalProfilesCountEl = document.getElementById('total-profiles-count');

    const platformCount = filteredResults.filter(p => p.platform === selectedPlatform).length;
    const verifiedProfiles = filteredResults.filter(p => p.link && p.link !== '#').length;
    const totalProfiles = filteredResults.length;

    if (platformCountEl) platformCountEl.textContent = platformCount;
    if (verifiedProfilesCountEl) verifiedProfilesCountEl.textContent = verifiedProfiles;
    if (totalProfilesCountEl) totalProfilesCountEl.textContent = totalProfiles;
}

// Export functions
function updateExportButton() {
    const exportBtn = document.getElementById('export-btn');
    const exportCount = document.getElementById('export-count');
    const exportAllBtn = document.getElementById('export-all-btn');
    const exportAllCount = document.getElementById('export-all-count');
    const exportDisparadorBtn = document.getElementById('export-disparador-btn');
    const exportDisparadorCount = document.getElementById('export-disparador-count');

    if (exportCount) exportCount.textContent = selectedResults.size;

    if (exportBtn) {
        exportBtn.disabled = selectedResults.size === 0;
    }

    if (exportAllBtn && exportAllCount) {
        exportAllCount.textContent = allResults.length;
        exportAllBtn.disabled = allResults.length === 0;
    }

    // Update Disparador PRO button (only for empresas)
    if (exportDisparadorBtn && exportDisparadorCount) {
        if (currentSearchType === 'empresas') {
            const prospectsWithWhatsApp = allResults.filter(p =>
                p.hasWhatsApp === true &&
                p.telefone &&
                p.telefone !== 'Telefone não disponível'
            );
            exportDisparadorCount.textContent = prospectsWithWhatsApp.length;
            exportDisparadorBtn.disabled = prospectsWithWhatsApp.length === 0;
        } else {
            exportDisparadorBtn.disabled = true;
            exportDisparadorCount.textContent = '0';
        }
    }
}

function exportToExcel() {
    if (selectedResults.size === 0) return;

    const selectedData = allResults.filter(p => selectedResults.has(p.id));

    if (currentSearchType === 'empresas') {
        generateEmpresasExcel(selectedData, 'empresas_selecionadas');
    } else {
        generateSocialExcel(selectedData, 'perfis_selecionados');
    }
}

function exportAll() {
    if (allResults.length === 0) {
        showErrorToast('Nenhum resultado encontrado para exportar. Faça uma busca primeiro!');
        return;
    }

    if (currentSearchType === 'empresas') {
        generateEmpresasExcel(allResults, 'todas_empresas');
    } else {
        generateSocialExcel(allResults, 'todos_perfis');
    }
}

function exportDisparadorPro() {
    if (currentSearchType !== 'empresas') return;

    const prospectsWithWhatsApp = allResults.filter(prospect => {
        const cleanPhone = prospect.telefone ? prospect.telefone.replace(/\D/g, '') : '';
        return prospect.hasWhatsApp === true &&
            cleanPhone &&
            cleanPhone.length >= 10 &&
            prospect.telefone !== 'Telefone não disponível';
    });

    if (prospectsWithWhatsApp.length === 0) {
        showErrorToast('Nenhum prospect com WhatsApp confirmado encontrado!');
        return;
    }

    const disparadorData = prospectsWithWhatsApp.map(prospect => {
        const cleanPhone = prospect.telefone.replace(/\D/g, '');
        let formattedPhone = cleanPhone;
        if (!formattedPhone.startsWith('55')) {
            if (formattedPhone.length === 11 || formattedPhone.length === 10) {
                formattedPhone = '55' + formattedPhone;
            }
        }

        return {
            'nome': prospect.name,
            'telefone': formattedPhone,
            'email': prospect.email || ''
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(disparadorData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Disparador PRO');

    const colWidths = [
        { wch: 30 }, // nome
        { wch: 15 }, // telefone
        { wch: 30 }  // email
    ];
    worksheet['!cols'] = colWidths;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(workbook, `disparador_pro_${timestamp}.xlsx`);

    showSuccessToast(`Disparador PRO exportado! ${prospectsWithWhatsApp.length} prospects com telefone incluídos.`);
}

function generateEmpresasExcel(data, filename) {
    const exportData = data.map(prospect => ({
        'Nome': prospect.name,
        'Endereço': prospect.endereco,
        'Telefone': prospect.telefone,
        'E-mail': prospect.email || 'Não informado',
        'Rating': prospect.rating || 'Não avaliado',
        'Avaliações': prospect.reviews || 0,
        'Website': prospect.website || 'Não informado',
        'WhatsApp': prospect.hasWhatsApp === true ? 'Sim' : prospect.hasWhatsApp === false ? 'Não' : 'Não Verificado',
        'Status': prospect.status === 'verified' ? 'Verificado' :
            prospect.status === 'no_whatsapp' ? 'Sem WhatsApp' : 'Não Verificado',
        'Categoria': prospect.category || 'Outros',
        'Tipos': prospect.types || 'Não informado',
        'Data_Exportacao': new Date().toLocaleDateString('pt-BR'),
        'Hora_Exportacao': new Date().toLocaleTimeString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas');

    // Auto-fit columns
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const colWidths = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
            const address = XLSX.utils.encode_cell({ r: R, c: C });
            if (worksheet[address] && worksheet[address].v) {
                maxWidth = Math.max(maxWidth, worksheet[address].v.toString().length);
            }
        }
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
    }
    worksheet['!cols'] = colWidths;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);

    const withEmail = data.filter(p => p.email && p.email !== 'Não informado').length;
    showSuccessToast(`Excel exportado com sucesso! ${data.length} empresas incluídas (${withEmail} com e-mail).`);
}

function generateSocialExcel(data, filename) {
    const exportData = data.map(prospect => ({
        'Plataforma': prospect.platform.charAt(0).toUpperCase() + prospect.platform.slice(1),
        'Título/Nome': prospect.title,
        'Link do Perfil': prospect.link,
        'Descrição': prospect.snippet,
        'Posição nos Resultados': prospect.position,
        'Termo de Busca': prospect.searchTerm,
        'Data da Exportação': new Date().toLocaleDateString('pt-BR'),
        'Hora da Exportação': new Date().toLocaleTimeString('pt-BR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Perfis Sociais');

    const colWidths = [
        { wch: 12 }, { wch: 40 }, { wch: 60 }, { wch: 50 },
        { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 12 }
    ];
    worksheet['!cols'] = colWidths;

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    XLSX.writeFile(workbook, `${filename}_${timestamp}.xlsx`);

    showSuccessToast(`Excel exportado com sucesso! ${data.length} perfis incluídos.`);
}

// Map functions (only for empresas)
function initializeMap() {
    try {
        miniMap = L.map('minimap').setView([-14.235, -51.9253], 4);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(miniMap);

        const info = L.control({ position: 'bottomleft' });
        info.onAdd = function () {
            const div = L.DomUtil.create('div', 'map-info');
            div.innerHTML = '<small class="text-muted">🔵 Com WhatsApp &nbsp; 🔴 Sem WhatsApp</small>';
            div.style.background = 'rgba(255,255,255,0.8)';
            div.style.padding = '5px';
            div.style.borderRadius = '3px';
            return div;
        };
        info.addTo(miniMap);

        console.log('Mapa inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar mapa:', error);
    }
}

function updateMapMarkers() {
    if (!miniMap || currentSearchType !== 'empresas') return;

    // Clear existing markers
    mapMarkers.forEach(marker => {
        miniMap.removeLayer(marker);
    });
    mapMarkers = [];

    let markersAdded = 0;

    filteredResults.forEach((result, index) => {
        let lat, lng;

        if (result.gps_coordinates && result.gps_coordinates.latitude && result.gps_coordinates.longitude) {
            lat = result.gps_coordinates.latitude;
            lng = result.gps_coordinates.longitude;
        } else {
            const baseCoords = getBaseCoordinatesFromAddress(result.endereco);
            if (baseCoords) {
                lat = baseCoords.lat + (Math.random() - 0.5) * 0.01;
                lng = baseCoords.lng + (Math.random() - 0.5) * 0.01;
            } else {
                lat = -12.971598 + (Math.random() - 0.5) * 0.1;
                lng = -38.501310 + (Math.random() - 0.5) * 0.1;
            }
        }

        if (lat && lng) {
            const markerColor = result.hasWhatsApp === true ? '#28a745' : '#dc3545';
            const markerIcon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            const marker = L.marker([lat, lng], { icon: markerIcon });

            const popupContent = `
                        <div class="prospect-popup">
                            <h6>${result.name}</h6>
                            <p class="mb-1"><i class="bi bi-geo-alt me-1"></i>${result.endereco}</p>
                            <p class="mb-1"><i class="bi bi-telephone me-1"></i>${formatPhoneNumber(result.telefone)}</p>
                            ${result.rating > 0 ? `
                                <p class="mb-1">
                                    <i class="bi bi-star-fill text-warning me-1"></i>
                                    ${result.rating} (${result.reviews} avaliações)
                                </p>
                            ` : ''}
                            <div class="d-flex gap-1 mt-2">
                                <span class="badge ${result.hasWhatsApp === true ? 'bg-success' : 'bg-danger'}">
                                    ${result.hasWhatsApp === true ? 'WhatsApp' : 'Sem WhatsApp'}
                                </span>
                                <span class="badge bg-primary">${result.category || 'Outros'}</span>
                            </div>
                            ${result.hasWhatsApp === true ? `
                                <div class="mt-2">
                                    <a href="https://wa.me/${result.telefone.replace(/\D/g, '')}" target="_blank" class="btn btn-success btn-sm">
                                        <i class="bi bi-whatsapp me-1"></i>Abrir WhatsApp
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    `;

            marker.bindPopup(popupContent);
            marker.addTo(miniMap);
            mapMarkers.push(marker);
            markersAdded++;
        }
    });

    if (mapMarkers.length > 0) {
        setTimeout(() => {
            const group = new L.featureGroup(mapMarkers);
            miniMap.fitBounds(group.getBounds().pad(0.1));
        }, 100);
    }
}

function getBaseCoordinatesFromAddress(address) {
    if (!address) return null;

    const addressLower = address.toLowerCase();

    if (addressLower.includes('salvador') || addressLower.includes('pituba') || addressLower.includes('barra') || addressLower.includes('ondina')) {
        return { lat: -12.971598, lng: -38.501310 };
    }

    if (addressLower.includes('são paulo') || addressLower.includes('sp')) {
        return { lat: -23.550520, lng: -46.633309 };
    }

    if (addressLower.includes('rio de janeiro') || addressLower.includes('copacabana') || addressLower.includes('ipanema')) {
        return { lat: -22.906847, lng: -43.172896 };
    }

    if (addressLower.includes('belo horizonte') || addressLower.includes('mg')) {
        return { lat: -19.919054, lng: -43.945973 };
    }

    if (addressLower.includes('brasília') || addressLower.includes('df')) {
        return { lat: -15.794229, lng: -47.882166 };
    }

    return { lat: -14.235, lng: -51.9253 };
}

function centerMapOnResults() {
    if (!miniMap || mapMarkers.length === 0) return;

    if (mapMarkers.length === 1) {
        miniMap.setView(mapMarkers[0].getLatLng(), 15);
    } else {
        const group = new L.featureGroup(mapMarkers);
        miniMap.fitBounds(group.getBounds().pad(0.1));
    }
}

function toggleMapView() {
    if (!miniMap) return;

    miniMap.eachLayer(function (layer) {
        if (layer instanceof L.TileLayer) {
            miniMap.removeLayer(layer);
        }
    });

    if (currentMapView === 'street') {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 18
        }).addTo(miniMap);
        currentMapView = 'satellite';
        document.getElementById('map-view-icon').className = 'bi bi-map';
    } else {
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(miniMap);
        currentMapView = 'street';
        document.getElementById('map-view-icon').className = 'bi bi-layers';
    }
}

// Utility functions
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        searchLeads();
    }
}

// Toast notifications
function showSuccessToast(message) {
    const toastHtml = `
                <div class="toast-container position-fixed bottom-0 end-0 p-3">
                    <div class="toast show" role="alert">
                        <div class="toast-header">
                            <i class="bi bi-check-circle-fill text-success me-2"></i>
                            <strong class="me-auto">Sucesso!</strong>
                            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                        </div>
                        <div class="toast-body">${message}</div>
                    </div>
                </div>
            `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);

    setTimeout(() => {
        const toastElement = document.querySelector('.toast-container');
        if (toastElement) toastElement.remove();
    }, 5000);
}

function showErrorToast(message) {
    const toastHtml = `
                <div class="toast-container position-fixed bottom-0 end-0 p-3">
                    <div class="toast show" role="alert">
                        <div class="toast-header">
                            <i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>
                            <strong class="me-auto">Erro!</strong>
                            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                        </div>
                        <div class="toast-body">${message}</div>
                    </div>
                </div>
            `;

    document.body.insertAdjacentHTML('beforeend', toastHtml);

    setTimeout(() => {
        const toastElement = document.querySelector('.toast-container');
        if (toastElement) toastElement.remove();
    }, 5000);
}

function showConfigModal() {
    const modal = new bootstrap.Modal(document.getElementById('configModal'));

    // Limpar container
    const container = document.getElementById('serper-keys-container');
    container.innerHTML = '';

    // Carregar keys existentes ou criar input padrão
    if (SERPER_CONFIG.apiKeys.length > 0) {
        SERPER_CONFIG.apiKeys.forEach((key, index) => {
            const keyIndex = index + 1;
            const inputHtml = `
                <div class="serper-key-input mb-2" data-key-index="${keyIndex}">
                    <div class="input-group">
                        <span class="input-group-text">Key ${keyIndex}</span>
                        <input type="password" class="form-control serper-key-field" 
                               id="serper-key-${keyIndex}" placeholder="Sua chave do Serper.dev" 
                               data-key-index="${keyIndex}" value="${key}">
                        ${keyIndex > 1 ? `
                        <button class="btn btn-outline-danger" type="button" 
                                onclick="removeSerperKeyInput(${keyIndex})">
                            <i class="bi bi-trash"></i>
                        </button>
                        ` : ''}
                        <button class="btn btn-outline-secondary" type="button" 
                                onclick="togglePasswordVisibility('serper-key-${keyIndex}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', inputHtml);
        });
    } else {
        // Input padrão
        container.innerHTML = `
            <div class="serper-key-input mb-2" data-key-index="1">
                <div class="input-group">
                    <span class="input-group-text">Key 1</span>
                    <input type="password" class="form-control serper-key-field" 
                           id="serper-key-1" placeholder="Sua chave do Serper.dev" 
                           data-key-index="1">
                    <button class="btn btn-outline-secondary" type="button" 
                            onclick="togglePasswordVisibility('serper-key-1')">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Carregar WhatsApp config
    document.getElementById('whatsapp-base-url').value = WHATSAPP_API_CONFIG.baseUrl || '';
    document.getElementById('whatsapp-instance').value = WHATSAPP_API_CONFIG.instance || '';
    document.getElementById('whatsapp-api-key').value = WHATSAPP_API_CONFIG.apiKey || '';

    modal.show();
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

function saveAllConfigs() {
    const container = document.getElementById('serper-keys-container');
    const keyInputs = container.querySelectorAll('.serper-key-field');

    const apiKeys = Array.from(keyInputs)
        .map(input => input.value.trim())
        .filter(key => key !== '');

    if (apiKeys.length === 0) {
        showErrorToast('Configure pelo menos uma API key do Serper.dev!');
        return;
    }

    const baseUrl = document.getElementById('whatsapp-base-url').value.trim();
    const instance = document.getElementById('whatsapp-instance').value.trim();
    const whatsappApiKey = document.getElementById('whatsapp-api-key').value.trim();

    SERPER_CONFIG.apiKeys = apiKeys;
    SERPER_CONFIG.currentKeyIndex = 0;

    WHATSAPP_API_CONFIG.baseUrl = baseUrl;
    WHATSAPP_API_CONFIG.instance = instance;
    WHATSAPP_API_CONFIG.apiKey = whatsappApiKey;

    localStorage.setItem('leads_infinite_serper_config', JSON.stringify({
        apiKeys: apiKeys
    }));

    localStorage.setItem('leads_infinite_whatsapp_config', JSON.stringify({
        baseUrl: baseUrl,
        instance: instance,
        apiKey: whatsappApiKey
    }));

    const modal = bootstrap.Modal.getInstance(document.getElementById('configModal'));
    modal.hide();

    showSuccessToast(`${apiKeys.length} API key(s) do Serper.dev configurada(s) com sucesso!`);
}

// Test API functions
async function testSerperMapsAPI() {
    const testBtn = event.target;
    const originalText = testBtn.innerHTML;

    try {
        testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Testando...';
        testBtn.disabled = true;

        const serperMapsKey = document.getElementById('serper-maps-key').value.trim();
        if (!serperMapsKey) {
            throw new Error('Por favor, informe a API Key');
        }

        const requestBody = {
            q: 'restaurante São Paulo',
            hl: 'pt-br'
        };

        const response = await fetch(SERPER_MAPS_CONFIG.baseUrl, {
            method: 'POST',
            headers: {
                'X-API-KEY': serperMapsKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            const data = await response.json();
            testBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Serper Maps OK';
            testBtn.className = 'btn btn-success w-100';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('Erro no teste Serper Maps:', error);
        testBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Erro Serper Maps';
        testBtn.className = 'btn btn-danger w-100';
    }

    setTimeout(() => {
        testBtn.innerHTML = originalText;
        testBtn.className = 'btn btn-outline-success w-100';
        testBtn.disabled = false;
    }, 3000);
}

// Atualizar testSerperAPI
async function testSerperAPI() {
    const testBtn = event.target;
    const originalText = testBtn.innerHTML;

    try {
        testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Testando...';
        testBtn.disabled = true;

        // Coletar todas as API keys dos inputs
        const container = document.getElementById('serper-keys-container');
        const keyInputs = container.querySelectorAll('.serper-key-field');

        const apiKeys = Array.from(keyInputs)
            .map(input => input.value.trim())
            .filter(key => key !== '');

        if (apiKeys.length === 0) {
            throw new Error('Por favor, informe pelo menos uma API Key');
        }

        // Testar a primeira key disponível
        const testKey = apiKeys[0];

        // Testar Search endpoint
        const searchRequestBody = {
            q: 'site:linkedin.com test',
            gl: 'br',
            hl: 'pt-br',
            page: 1
        };

        // Testar Maps endpoint
        const mapsRequestBody = {
            q: 'restaurante São Paulo',
            hl: 'pt-br'
        };

        // Testar Search
        const searchResponse = await fetch(`${SERPER_CONFIG.baseUrl}/search`, {
            method: 'POST',
            headers: {
                'X-API-KEY': testKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchRequestBody)
        });

        // Testar Maps
        const mapsResponse = await fetch(`${SERPER_CONFIG.baseUrl}/maps`, {
            method: 'POST',
            headers: {
                'X-API-KEY': testKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mapsRequestBody)
        });

        if (searchResponse.ok && mapsResponse.ok) {
            testBtn.innerHTML = `<i class="bi bi-check-circle me-1"></i>Serper OK (${apiKeys.length} key${apiKeys.length > 1 ? 's' : ''})`;
            testBtn.className = 'btn btn-success w-100';

            // Mostrar toast informativo
            if (apiKeys.length > 1) {
                setTimeout(() => {
                    showSuccessToast(`API testada com sucesso! ${apiKeys.length} keys configuradas para rodízio.`);
                }, 500);
            }
        } else {
            throw new Error(`HTTP ${searchResponse.status} / ${mapsResponse.status}`);
        }

    } catch (error) {
        console.error('Erro no teste Serper.dev:', error);
        testBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Erro Serper.dev';
        testBtn.className = 'btn btn-danger w-100';

        setTimeout(() => {
            showErrorToast(`Erro ao testar API: ${error.message}`);
        }, 500);
    }

    setTimeout(() => {
        testBtn.innerHTML = originalText;
        testBtn.className = 'btn btn-outline-success w-100';
        testBtn.disabled = false;
    }, 3000);
}

async function testAllSerperKeys() {
    const container = document.getElementById('serper-keys-container');
    const keyInputs = container.querySelectorAll('.serper-key-field');

    const apiKeys = Array.from(keyInputs)
        .map((input, index) => ({ key: input.value.trim(), index: index + 1 }))
        .filter(item => item.key !== '');

    if (apiKeys.length === 0) {
        showErrorToast('Por favor, informe pelo menos uma API Key');
        return;
    }

    showSuccessToast(`Testando ${apiKeys.length} API key(s)...`);

    const results = [];

    for (const item of apiKeys) {
        try {
            const response = await fetch(`${SERPER_CONFIG.baseUrl}/maps`, {
                method: 'POST',
                headers: {
                    'X-API-KEY': item.key,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ q: 'test', hl: 'pt-br' })
            });

            if (response.ok) {
                results.push(`✅ Key ${item.index}: OK`);
            } else {
                results.push(`❌ Key ${item.index}: Erro ${response.status}`);
            }
        } catch (error) {
            results.push(`❌ Key ${item.index}: ${error.message}`);
        }
    }

    // Mostrar resultados
    const resultText = results.join('\n');
    console.log('Resultados dos testes:\n', resultText);

    const successCount = results.filter(r => r.includes('✅')).length;
    if (successCount === apiKeys.length) {
        showSuccessToast(`Todas as ${apiKeys.length} keys estão funcionando!`);
    } else {
        showErrorToast(`${successCount}/${apiKeys.length} keys funcionando. Verifique o console.`);
    }
}

async function testWhatsAppAPI() {
    const testBtn = event.target;
    const originalText = testBtn.innerHTML;

    try {
        testBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Testando...';
        testBtn.disabled = true;

        const baseUrl = document.getElementById('whatsapp-base-url').value.trim();
        const instance = document.getElementById('whatsapp-instance').value.trim();
        const apiKey = document.getElementById('whatsapp-api-key').value.trim();

        if (!baseUrl || !instance || !apiKey) {
            throw new Error('Por favor, preencha todos os campos obrigatórios');
        }

        const url = `${baseUrl}/chat/whatsappNumbers/${instance}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey
            },
            body: JSON.stringify({
                numbers: ['5571999999999']
            })
        });

        if (response.ok) {
            testBtn.innerHTML = '<i class="bi bi-check-circle me-1"></i>WhatsApp OK';
            testBtn.className = 'btn btn-success w-100';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }

    } catch (error) {
        console.error('Erro no teste WhatsApp:', error);
        testBtn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Erro WhatsApp';
        testBtn.className = 'btn btn-danger w-100';
    }

    setTimeout(() => {
        testBtn.innerHTML = originalText;
        testBtn.className = 'btn btn-outline-success w-100';
        testBtn.disabled = false;
    }, 3000);
}

function loadAllConfigs() {
    try {
        const savedSerperConfig = localStorage.getItem('leads_infinite_serper_config');
        if (savedSerperConfig) {
            const config = JSON.parse(savedSerperConfig);
            SERPER_CONFIG.apiKeys = config.apiKeys || [];
        }

        const savedWhatsAppConfig = localStorage.getItem('leads_infinite_whatsapp_config');
        if (savedWhatsAppConfig) {
            const config = JSON.parse(savedWhatsAppConfig);
            WHATSAPP_API_CONFIG.baseUrl = config.baseUrl || '';
            WHATSAPP_API_CONFIG.instance = config.instance || '';
            WHATSAPP_API_CONFIG.apiKey = config.apiKey || '';
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
    }
}

function showWelcomeMessage() {
    const container = document.getElementById('results-container');
    const emptyState = document.getElementById('empty-state');

    if (container && emptyState) {
        container.classList.add('d-none');
        emptyState.classList.remove('d-none');

        emptyState.innerHTML = `
                    <div class="text-center py-5">
                        <i class="bi bi-infinity fs-1 text-primary mb-3"></i>
                        <h4 class="text-primary mb-3">Bem-vindo ao Infinite Leads!</h4>
                        <p class="text-muted mb-4">
                            Sistema infinito de prospecção.<br>
                            Busque empresas ou perfis sociais, valide WhatsApp e exporte tudo em Excel.
                        </p>
                        <div class="alert alert-info d-inline-block">
                            <i class="bi bi-gear me-2"></i>
                            <strong>Primeiro passo:</strong> Configure suas APIs clicando no ícone da engrenagem.
                        </div>
                        <div class="mt-4">
                            <button class="btn btn-primary me-2" onclick="showConfigModal()">
                                <i class="bi bi-gear me-2"></i>Configurar APIs
                            </button>
                        </div>
                    </div>
                `;
    }
}

// Initialize
function init() {
    loadThemeFromStorage();
    loadAllConfigs();
    updateSearchInterface();
    resetSearch();
    showWelcomeMessage();
    console.log('Infinite Leads inicializado');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    init();
});
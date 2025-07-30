const BACKEND_URL = 'https://a4686cea7778.ngrok-free.app';

// Состояние приложения
const state = {
    tgWebApp: null,
    currentUser: null,
    lastRequest: null,
    lastResponse: null
};

// Элементы интерфейса
const elements = {
    authStatus: document.getElementById('auth-status'),
    authBtn: document.getElementById('auth-btn'),
    errorSection: document.getElementById('error-section'),
    errorDisplay: document.getElementById('error-display'),
    copyErrorBtn: document.getElementById('copy-error-btn'),
    agreementSection: document.getElementById('agreement-section'),
    signAgreementBtn: document.getElementById('sign-agreement-btn'),
    tokenInfo: document.getElementById('token-info'),
    tokenDisplay: document.getElementById('token-display'),
    validateBtn: document.getElementById('validate-btn'),
    validationResult: document.getElementById('validation-result'),
    agreementVersion: document.getElementById('agreement-version')
};

let tgWebApp = null;
let currentUser = null;

// Улучшенный обработчик ошибок
function showError(error) {
    console.error('Error:', error);
    const errorContainer = document.getElementById('error-section');
    const errorText = document.getElementById('error-display');
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
        errorMessage = `${error.name}: ${error.message}\n\nStack: ${error.stack}`;
    } else if (typeof error === 'object') {
        errorMessage = JSON.stringify(error, null, 2);
    } else {
        errorMessage = String(error);
    }
    
    errorText.value = errorMessage;
    errorContainer.classList.remove('hidden');
    errorContainer.scrollIntoView({ behavior: 'smooth' });
}

// Копирует текст ошибки в буфер обмена
function setupErrorCopyButton() {
    elements.copyErrorBtn.addEventListener('click', () => {
        elements.errorDisplay.select();
        document.execCommand('copy');
        alert('Error copied to clipboard!');
    });
}


// Инициализация Telegram WebApp
function initTelegramWebApp() {
    try {
        if (!window.Telegram?.WebApp) {
            throw new Error('Telegram WebApp SDK not loaded');
        }
        
        const tg = window.Telegram.WebApp;
        tg.expand();
        
        console.log('Telegram WebApp initialized:', {
            platform: tg.platform,
            version: tg.version,
            initData: tg.initData,
            unsafeData: tg.initDataUnsafe
        });
        
        return tg;
    } catch (error) {
        showError(error);
        return null;
    }
}
// Улучшенный запрос с логированием
async function makeAuthenticatedRequest() {
    if (!state.tgWebApp?.initData) {
        throw new Error('Telegram initData not available');
    }
    
    const requestData = {
        init_data: state.tgWebApp.initData,
        debug_info: {
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
        }
    };
    
    state.lastRequest = requestData;
    
    console.log('[DEBUG] Sending to server:', {
        url: `${BACKEND_URL}/api/v1/auth`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Debug-Request': 'true'
        },
        body: requestData
    });
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Debug-Request': 'true'
            },
            body: JSON.stringify(requestData)
        });
        
        const data = await response.json().catch(() => ({}));
        state.lastResponse = { status: response.status, data };
        
        if (!response.ok) {
            console.error('[DEBUG] Server response error:', {
                status: response.status,
                statusText: response.statusText,
                data
            });
            
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error('[DEBUG] Request failed:', error);
        throw error;
    }
}


// Безопасный JSON-запрос
async function makeRequest(url, method, body) {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        showError(error);
        throw error;
    }
}


// Основная функция аутентификации
async function authenticate() {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
        showError('Telegram WebApp not initialized');
        return;
    }
    
    try {
        // 1. Подготовка данных
        const initData = tg.initData;
        if (!initData) {
            throw new Error('Telegram initData is empty');
        }
        
        console.log('Sending initData:', initData);
        
        // 2. Отправка запроса
        const response = await makeRequest(
            `${BACKEND_URL}/api/v1/auth`,
            'POST',
            { init_data: initData }
        );
        
        console.log('Auth response:', response);
        
        // 3. Обработка ответа
        if (response.agreement_needed) {
            document.getElementById('agreement-section').classList.remove('hidden');
            document.getElementById('agreement-version').textContent = '1';
        } else if (response.token) {
            document.getElementById('token-display').value = response.token;
            document.getElementById('token-info').classList.remove('hidden');
        }
    } catch (error) {
        showError(error);
    }
}


// Подписание соглашения
async function signAgreement() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/agreement`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: currentUser.id
            })
        });

        const data = await response.json();
        if (data.token) {
            agreementSection.classList.add('hidden');
            showToken(data.token);
        }
    } catch (error) {
        console.error('Sign agreement error:', error);
        alert('Failed to sign agreement');
    }
}

// Обработчик аутентификации с полной диагностикой
async function handleAuthentication() {
    try {
        document.getElementById('error-section').classList.add('hidden');
        
        const result = await makeAuthenticatedRequest();
        console.log('[DEBUG] Auth result:', result);
        
        if (result.agreement_needed) {
            document.getElementById('agreement-section').classList.remove('hidden');
            document.getElementById('agreement-version').textContent = '1';
        } else if (result.token) {
            showToken(result.token);
        }
    } catch (error) {
        showDetailedError(error);
        
        // Дополнительная диагностика
        const diagnosticInfo = {
            timestamp: new Date().toISOString(),
            error: error.toString(),
            request: state.lastRequest,
            response: state.lastResponse,
            telegramData: state.tgWebApp?.initData,
            localStorage: {
                last_tg_init_data: localStorage.getItem('last_tg_init_data')
            }
        };
        
        console.error('[DIAGNOSTICS] Full error context:', diagnosticInfo);
        document.getElementById('error-display').value = 
            JSON.stringify(diagnosticInfo, null, 2);
    }
}

// Показывает детализированную ошибку
function showDetailedError(error) {
    const errorContainer = document.getElementById('error-section');
    const errorText = document.getElementById('error-display');
    
    let errorMessage = error.message || String(error);
    
    if (error.message.includes('invalid_telegram_data')) {
        errorMessage += '\n\nВозможные причины:\n' +
        '1. Неправильный BotToken на сервере\n' +
        '2. Несоответствие хэша данных\n' +
        '3. Проблемы с временем сервера (проверьте NTP)\n' +
        '4. Измененный initData в процессе передачи';
    }
    
    errorText.value = `ОШИБКА: ${errorMessage}\n\n` +
        `Детали:\n${error.stack || 'Нет дополнительной информации'}`;
    
    errorContainer.classList.remove('hidden');
    errorContainer.scrollIntoView({ behavior: 'smooth' });
}


// Показать JWT токен
function showToken(token) {
    tokenInfo.classList.remove('hidden');
    tokenDisplay.value = token;
}

// Валидация токена
async function validateToken() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/v1/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenDisplay.value}`
            }
        });

        const data = await response.json();
        validationResult.textContent = `Valid: ${data.valid}, User ID: ${data.user_id}`;
    } catch (error) {
        console.error('Validation error:', error);
        validationResult.textContent = 'Validation failed';
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация Telegram
    const tg = initTelegramWebApp();
    
    // Настройка кнопок
    document.getElementById('auth-btn').addEventListener('click', authenticate);
    document.getElementById('copy-error-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('error-display').value)
            .then(() => alert('Error copied to clipboard!'));
    });
    
    // Кнопка соглашения (заглушка)
    document.getElementById('sign-agreement-btn').addEventListener('click', () => {
        alert('Agreement signed!');
    });
});

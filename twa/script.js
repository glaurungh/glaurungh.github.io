const BACKEND_URL = 'https://ad9b38d44491.ngrok-free.app';

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

// Показывает ошибку в интерфейсе
function showError(error) {
    console.error('Error:', error);
    
    let errorText = '';
    if (error instanceof Error) {
        errorText = `${error.name}: ${error.message}\n\n${error.stack}`;
    } else if (typeof error === 'object') {
        errorText = JSON.stringify(error, null, 2);
    } else {
        errorText = String(error);
    }
    
    elements.errorDisplay.value = errorText;
    elements.errorSection.classList.remove('hidden');
    
    // Прокручиваем к блоку с ошибкой
    elements.errorSection.scrollIntoView({ behavior: 'smooth' });
}

// Копирует текст ошибки в буфер обмена
function setupErrorCopyButton() {
    elements.copyErrorBtn.addEventListener('click', () => {
        elements.errorDisplay.select();
        document.execCommand('copy');
        alert('Error copied to clipboard!');
    });
}

// Инициализация Telegram WebApp с обработкой ошибок
function initTelegramWebApp() {
    try {
        if (!window.Telegram?.WebApp) {
            throw new Error('Telegram WebApp SDK not loaded');
        }
        
        tgWebApp = window.Telegram.WebApp;
        tgWebApp.expand();
        
        console.log('Telegram WebApp initialized:', tgWebApp);
        console.log('InitData:', tgWebApp.initData);
        console.log('InitDataUnsafe:', tgWebApp.initDataUnsafe);
        
        if (tgWebApp.initDataUnsafe?.user) {
            currentUser = tgWebApp.initDataUnsafe.user;
            elements.authStatus.textContent = `TG User: ${currentUser.first_name || 'Unknown'} (ID: ${currentUser.id || 'N/A'})`;
        } else {
            console.warn('No user data in initDataUnsafe');
        }
    } catch (error) {
        showError(error);
    }
}

// Улучшенная функция для выполнения запросов
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

// Модифицированная функция аутентификации
async function authenticate() {
    try {
        if (!tgWebApp) {
            throw new Error('Telegram WebApp not initialized');
        }
        
        const initData = tgWebApp.initData;
        if (!initData) {
            throw new Error('No initData available');
        }
        
        console.log('Sending initData to backend:', initData);
        
        const data = await makeRequest(`${BACKEND_URL}/api/v1/auth`, 'POST', { 
            init_data: initData 
        });
        
        console.log('Auth response:', data);
        
        if (data.agreement_needed) {
            elements.agreementSection.classList.remove('hidden');
            elements.agreementVersion.textContent = '1';
        } else if (data.token) {
            showToken(data.token);
        } else {
            throw new Error('Unexpected response from server');
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
function initApp() {
    try {
        initTelegramWebApp();
        setupErrorCopyButton();
        
        elements.authBtn.addEventListener('click', authenticate);
        elements.signAgreementBtn.addEventListener('click', signAgreement);
        elements.validateBtn.addEventListener('click', validateToken);
        
        console.log('App initialized');
    } catch (error) {
        showError(error);
    }
}

// Запускаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', initApp);

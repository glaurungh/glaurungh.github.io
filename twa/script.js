const BACKEND_URL = 'https://ad9b38d44491.ngrok-free.app'; // Замените на ваш URL

// Элементы интерфейса
const authStatus = document.getElementById('auth-status');
const authBtn = document.getElementById('auth-btn');
const agreementSection = document.getElementById('agreement-section');
const signAgreementBtn = document.getElementById('sign-agreement-btn');
const tokenInfo = document.getElementById('token-info');
const tokenDisplay = document.getElementById('token-display');
const validateBtn = document.getElementById('validate-btn');
const validationResult = document.getElementById('validation-result');
const agreementVersion = document.getElementById('agreement-version');

let tgWebApp;
let currentUser = null;

// Инициализация Telegram WebApp
function initTelegramWebApp() {
    tgWebApp = window.Telegram.WebApp;
    tgWebApp.expand();

    if (tgWebApp.initDataUnsafe.user) {
        currentUser = tgWebApp.initDataUnsafe.user;
        authStatus.textContent = `TG User: ${currentUser.first_name} (ID: ${currentUser.id})`;
    }
console.log(window.Telegram.WebApp.initData);

}

// Аутентификация
async function authenticate() {
    if (!tgWebApp) {
        alert('Telegram WebApp not initialized');
        return;
    }

    try {
        const initData = tgWebApp.initData;
        const response = await fetch(`${BACKEND_URL}/api/v1/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                init_data: initData
            })
        });

        const data = await response.json();

        if (data.agreement_needed) {
            agreementSection.classList.remove('hidden');
            agreementVersion.textContent = '1'; // Здесь должна быть актуальная версия
        } else if (data.token) {
            showToken(data.token);
        }
    } catch (error) {
        console.error('Auth error:', error);
        alert('Authentication failed');
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

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initTelegramWebApp();

    authBtn.addEventListener('click', authenticate);
    signAgreementBtn.addEventListener('click', signAgreement);
    validateBtn.addEventListener('click', validateToken);
});

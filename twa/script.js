document.addEventListener('DOMContentLoaded', () => {
    const webApp = window.Telegram.WebApp;
    const initDataField = document.getElementById('initData');
    const serverUrlInput = document.getElementById('serverUrl');
    const sendButton = document.getElementById('sendBtn');
    const responseContainer = document.getElementById('serverResponse');
    
    // Инициализация Telegram Web App
    webApp.ready();
    
    // Получаем initData и отображаем
    const initData = webApp.initData || 'Не удалось получить initData';
    initDataField.value = initData;
    
    // Обработчик отправки данных на сервер
    sendButton.addEventListener('click', async () => {
        const serverUrl = serverUrlInput.value.trim();
        
        if (!serverUrl) {
            responseContainer.textContent = 'Ошибка: Введите URL сервера';
            return;
        }
        
        try {
            responseContainer.textContent = 'Отправка запроса...';
            
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ init_data: initData })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            responseContainer.textContent = JSON.stringify(data, null, 2);
            
        } catch (error) {
            responseContainer.textContent = `Ошибка: ${error.message}`;
        }
    });
});

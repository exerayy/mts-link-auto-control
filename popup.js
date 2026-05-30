document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('historyList');
    const confirmBadge = document.getElementById('confirmBadge'); // Изменено с confirmCount
    const clearBtn = document.getElementById('clearBtn');
    const intervalInput = document.getElementById('intervalInput');
    const saveIntervalBtn = document.getElementById('saveIntervalBtn');
    const modifyBodyToggle = document.getElementById('modifyBodyToggle');
    const bodyParams = document.getElementById('bodyParams');
    const isFocused = document.getElementById('isFocused');
    const isSoundEnabled = document.getElementById('isSoundEnabled');
    const isVideoEnabled = document.getElementById('isVideoEnabled');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const eventNameElement = document.getElementById('eventName');

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateStatus') {
            updateStatusDisplay(request);
        }
    });

    // Функция обновления отображения статуса
    function updateStatusDisplay(data) {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (data.isActive) {
            indicator.className = 'status-indicator active';
            statusText.textContent = `Активен (каждые ${data.interval} сек.)`;
        } else {
            indicator.className = 'status-indicator inactive';
            statusText.textContent = 'Неактивен';
        }

        if (eventNameElement && data.eventName) {
            eventNameElement.textContent = data.eventName;
            eventNameElement.title = data.eventName;
        }
    }

    const updateStatus = () => {
        const indicator = document.getElementById('statusIndicator');
        const statusText = document.getElementById('statusText');

        if (modifyBodyToggle.checked) {
            indicator.classList.remove('inactive');
            statusText.textContent = 'Модификация активна';
        } else {
            indicator.classList.add('inactive');
            statusText.textContent = 'Стандартный режим';
        }
    };

    // Табы
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });

            const targetTab = document.getElementById(tab + 'Tab');
            targetTab.classList.add('active');
            targetTab.style.display = 'block';
        });
    });

    chrome.storage.local.get({
        interval: 30,
        modifyBody: false,
        isFocused: true,
        isSoundEnabled: true,
        isVideoEnabled: true
    }, (data) => {
        intervalInput.value = data.interval;
        modifyBodyToggle.checked = data.modifyBody;
        isFocused.checked = data.isFocused;
        isSoundEnabled.checked = data.isSoundEnabled;
        isVideoEnabled.checked = data.isVideoEnabled;
        bodyParams.style.display = data.modifyBody ? 'block' : 'none';
        updateStatus();
    });

    // Переключение видимости параметров
    modifyBodyToggle.addEventListener('change', () => {
        bodyParams.style.display = modifyBodyToggle.checked ? 'block' : 'none';
        updateStatus();
        saveBodySettings();
    });

    // Сохранение настроек body при изменении любой галочки
    [isFocused, isSoundEnabled, isVideoEnabled].forEach(checkbox => {
        checkbox.addEventListener('change', saveBodySettings);
    });

    function saveBodySettings() {
        chrome.storage.local.set({
            modifyBody: modifyBodyToggle.checked,
            isFocused: isFocused.checked,
            isSoundEnabled: isSoundEnabled.checked,
            isVideoEnabled: isVideoEnabled.checked
        }, () => {
            // Отправляем обновление в content script
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'updateBodySettings',
                        modifyBody: modifyBodyToggle.checked,
                        isFocused: isFocused.checked,
                        isSoundEnabled: isSoundEnabled.checked,
                        isVideoEnabled: isVideoEnabled.checked
                    });
                }
            });
        });
    }

    // Сохраняем интервал
    saveIntervalBtn.addEventListener('click', () => {
        const newInterval = parseInt(intervalInput.value);
        if (newInterval && newInterval >= 1 && newInterval <= 3600) {
            chrome.storage.local.set({ interval: newInterval }, () => {
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'updateInterval',
                            interval: newInterval
                        });
                    }
                });

                const message = document.createElement('div');
                message.className = 'saved-message show';
                message.textContent = '✓ Интервал сохранен';
                saveIntervalBtn.parentElement.appendChild(message);

                setTimeout(() => {
                    message.remove();
                }, 2000);
            });
        }
    });

    // Загружаем и отображаем историю
    const loadHistory = () => {
        chrome.storage.local.get({ confirmations: [] }, (data) => {
            const confirmations = data.confirmations;
            const confirms = confirmations.filter(c => c.type === 'confirm').length;

            // Обновляем счетчик в бейдже
            if (confirmBadge) {
                confirmBadge.textContent = confirms;
            }

            if (confirmations.length === 0) {
                historyList.innerHTML = '<p class="empty-message">Нет записей</p>';
                return;
            }

            const reversed = [...confirmations].reverse();
            historyList.innerHTML = reversed.map(item => `
                <div class="history-item">
                    <span class="history-icon">${item.type === 'confirm' ? '✅' : '🔵'}</span>
                    <span class="history-time">${item.time}</span>
                    <span class="history-type ${item.type === 'confirm' ? 'type-confirm' : 'type-success'}">
                        ${item.type === 'confirm' ? 'Подтверждение' : 'Закрытие'}
                    </span>
                </div>
            `).join('');
        });
    };

    clearBtn.addEventListener('click', () => {
        if (confirm('Очистить всю историю?')) {
            chrome.storage.local.set({ confirmations: [] }, () => {
                loadHistory();
            });
        }
    });

    loadHistory();
    setInterval(loadHistory, 2000);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes('mts-link.ru')) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getStatus' });
        } else {
            updateStatusDisplay({ isActive: false, eventName: 'Нет подключения', interval: 0 });
        }
    });
});
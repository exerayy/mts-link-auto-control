document.addEventListener('DOMContentLoaded', () => {
    const historyList = document.getElementById('historyList');
    const confirmCount = document.getElementById('confirmCount');
    const clearBtn = document.getElementById('clearBtn');
    const intervalInput = document.getElementById('intervalInput');
    const saveIntervalBtn = document.getElementById('saveIntervalBtn');
    const modifyBodyToggle = document.getElementById('modifyBodyToggle');
    const bodyParams = document.getElementById('bodyParams');
    const isFocused = document.getElementById('isFocused');
    const isSoundEnabled = document.getElementById('isSoundEnabled');
    const isVideoEnabled = document.getElementById('isVideoEnabled');

    // Загружаем сохраненные настройки
    chrome.storage.local.get({
        interval: 40,
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
    });

    // Переключение видимости параметров
    modifyBodyToggle.addEventListener('change', () => {
        bodyParams.style.display = modifyBodyToggle.checked ? 'block' : 'none';
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
            confirmCount.textContent = confirms;

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
});
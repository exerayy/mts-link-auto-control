(function() {
    'use strict';

    const MS_IN_SECOND = 1000;
    const DEFAULT_INTERVAL_SEC = 30;

    const getTime = () => {
        const now = new Date();
        return now.toLocaleTimeString('ru-RU', { hour12: false });
    };

    const getDateTime = () => {
        const now = new Date();
        return now.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const saveConfirmation = () => {
        chrome.storage.local.get({ confirmations: [] }, (data) => {
            const confirmations = data.confirmations;
            confirmations.push({
                time: getDateTime(),
                type: 'confirm'
            });
            if (confirmations.length > 100) {
                confirmations.shift();
            }
            chrome.storage.local.set({ confirmations });
        });
    };

    const saveSuccessClose = () => {
        chrome.storage.local.get({ confirmations: [] }, (data) => {
            const confirmations = data.confirmations;
            confirmations.push({
                time: getDateTime(),
                type: 'success'
            });
            if (confirmations.length > 100) {
                confirmations.shift();
            }
            chrome.storage.local.set({ confirmations });
        });
    };

    const checkAndHandle = () => {
        const successModal = document.querySelector(
            '[data-testid="AttentionControlSuccessModal"]'
        );

        console.log(`[${getTime()}] Поиск окна успеха:`, successModal);

        if (successModal) {
            const closeButton = successModal.querySelector('button');
            console.log(`[${getTime()}] Поиск кнопки закрыть:`, closeButton);

            if (closeButton) {
                closeButton.click();
                saveSuccessClose();
                console.log(`[${getTime()}] ✅ Окно успеха закрыто`);
                return;
            }
        }

        const confirmButton = document.querySelector(
            '[data-testid="AttentionControlModal.action.submit.Button"]'
        );
        console.log(`[${getTime()}] Поиск кнопки подтверждения:`, confirmButton);

        if (confirmButton) {
            confirmButton.click();
            saveConfirmation();
            console.log(`[${getTime()}] ✅ Присутствие подтверждено`);
        }
    };

    // Отправка настроек в MAIN world (для interceptor.js)
    const sendSettingsToInterceptor = () => {
        chrome.storage.local.get({
            modifyBody: true,
            isFocused: true,
            isSoundEnabled: true,
            isVideoEnabled: false
        }, (data) => {
            window.postMessage({
                type: 'MTS_LINK_SETTINGS',
                modifyBody: data.modifyBody,
                isFocused: data.isFocused,
                isSoundEnabled: data.isSoundEnabled,
                isVideoEnabled: data.isVideoEnabled
            }, '*');

            console.log(`[${getTime()}] Настройки отправлены в interceptor:`, {
                modifyBody: data.modifyBody,
                isFocused: data.isFocused,
                isSoundEnabled: data.isSoundEnabled,
                isVideoEnabled: data.isVideoEnabled
            });
        });
    };

    let checkInterval = DEFAULT_INTERVAL_SEC * MS_IN_SECOND;
    let intervalId;

    chrome.storage.local.get({ interval: DEFAULT_INTERVAL_SEC }, (data) => {
        checkInterval = data.interval * MS_IN_SECOND;
        startInterval();
    });

    const startInterval = () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(checkAndHandle, checkInterval);
        console.log(`[${getTime()}] Интервал проверки: ${checkInterval / MS_IN_SECOND} сек`);
    };

    // Обработчик сообщений от popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateInterval') {
            checkInterval = request.interval * MS_IN_SECOND;
            startInterval();
            console.log(`[${getTime()}] Интервал обновлен: ${request.interval} сек`);
            sendResponse({ success: true });
        }

        if (request.action === 'updateBodySettings') {
            // Сохраняем настройки в storage
            chrome.storage.local.set({
                modifyBody: request.modifyBody,
                isFocused: request.isFocused,
                isSoundEnabled: request.isSoundEnabled,
                isVideoEnabled: request.isVideoEnabled
            }, () => {
                // Отправляем настройки в MAIN world
                sendSettingsToInterceptor();
                console.log(`[${getTime()}] Настройки body обновлены:`, request);
                sendResponse({ success: true });
            });
            return true;
        }

        if (request.action === 'getStatus') {
            updateStatusInfo();
            sendResponse({ success: true });
        }
    });

    sendSettingsToInterceptor();

    // Мониторинг статуса и названия встречи
    const updateStatusInfo = () => {
        const eventName = document.title || 'Не найдено';

        const isActive = intervalId !== undefined && intervalId !== null;

        chrome.runtime.sendMessage({
            action: 'updateStatus',
            isActive: isActive,
            eventName: eventName,
            interval: checkInterval / MS_IN_SECOND
        }).catch(() => {
        });
    };

    updateStatusInfo();
    setInterval(updateStatusInfo, 2 * MS_IN_SECOND);

    console.log(`[${getTime()}] MTS-Link Auto Control запущен`);
})();
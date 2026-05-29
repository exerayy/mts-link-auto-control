(function() {
    'use strict';

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

    let checkInterval = 40000;
    let intervalId;

    chrome.storage.local.get({ interval: 40 }, (data) => {
        checkInterval = data.interval * 1000;
        startInterval();
    });

    const startInterval = () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(checkAndHandle, checkInterval);
        console.log(`[${getTime()}] Интервал проверки: ${checkInterval / 1000} сек`);
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateInterval') {
            checkInterval = request.interval * 1000;
            startInterval();
            console.log(`[${getTime()}] Интервал обновлен: ${request.interval} сек`);
        }
    });

    console.log(`[${getTime()}] MTS-Link Auto Control запущен`);
})();
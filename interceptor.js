(function() {
    'use strict';

    // Загружаем настройки из storage
    let modifyBody = false;
    let settings = {
        isFocused: true,
        isSoundEnabled: true,
        isVideoEnabled: true
    };

    chrome.storage.local.get({
        modifyBody: false,
        isFocused: true,
        isSoundEnabled: true,
        isVideoEnabled: true
    }, (data) => {
        modifyBody = data.modifyBody;
        settings.isFocused = data.isFocused;
        settings.isSoundEnabled = data.isSoundEnabled;
        settings.isVideoEnabled = data.isVideoEnabled;
    });

    // Слушаем обновления настроек
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateBodySettings') {
            modifyBody = request.modifyBody;
            settings.isFocused = request.isFocused;
            settings.isSoundEnabled = request.isSoundEnabled;
            settings.isVideoEnabled = request.isVideoEnabled;
            console.log('Настройки body обновлены:', { modifyBody, ...settings });
        }
    });

    const origFetch = window.fetch;
    window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;

        if (url && url.includes('setUserInvolvementStatus') && modifyBody) {
            console.log('FETCH setUserInvolvementStatus перехвачен!');
            console.log('Оригинальный body:', init.body);

            const newBody = `isFocused=${settings.isFocused}&isSoundEnabled=${settings.isSoundEnabled}&isVideoEnabled=${settings.isVideoEnabled}`;
            const newInit = { ...init, body: newBody };

            console.log('Новый body:', newInit.body);
            return origFetch.call(this, input, newInit);
        }

        return origFetch.call(this, input, init);
    };
})();
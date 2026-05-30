(function() {
    'use strict';

    let modifyBody = true;
    let settings = {
        isFocused: true,
        isSoundEnabled: true,
        isVideoEnabled: false
    };

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'MTS_LINK_SETTINGS') {
            modifyBody = event.data.modifyBody;
            settings.isFocused = event.data.isFocused;
            settings.isSoundEnabled = event.data.isSoundEnabled;
            settings.isVideoEnabled = event.data.isVideoEnabled;
            console.log('[Interceptor] Настройки получены:', { modifyBody, ...settings });
        }
    });

    const origFetch = window.fetch;
    window.fetch = function(input, init = {}) {
        const url = typeof input === 'string' ? input : input.url;

        if (url && url.includes('setUserInvolvementStatus') && modifyBody) {
            console.log('[Interceptor] FETCH setUserInvolvementStatus перехвачен!');
            console.log('[Interceptor] URL:', url);
            console.log('[Interceptor] Оригинальный body:', init.body);

            const newBody = `isFocused=${settings.isFocused}&isSoundEnabled=${settings.isSoundEnabled}&isVideoEnabled=${settings.isVideoEnabled}`;
            const newInit = { ...init, body: newBody };

            console.log('[Interceptor] Новый body:', newInit.body);
            return origFetch.call(this, input, newInit);
        }

        return origFetch.call(this, input, init);
    };

    console.log('[Interceptor] Fetch-перехватчик установлен');
})();
(function() {
    function ensureUi() {
        if (document.getElementById('uiLoadingOverlay')) return;

        document.body.insertAdjacentHTML('beforeend', `
            <div id="uiLoadingOverlay" class="ui-loading-overlay hidden" aria-live="polite" aria-busy="true">
                <div class="ui-loading-card">
                    <span class="ui-spinner" aria-hidden="true"></span>
                    <span id="uiLoadingText">Saving changes...</span>
                </div>
            </div>
            <div id="uiToast" class="ui-toast" role="status" aria-live="polite"></div>
            <div id="uiConfirmOverlay" class="ui-confirm-overlay hidden">
                <div class="ui-confirm-card" role="dialog" aria-modal="true" aria-labelledby="uiConfirmTitle">
                    <h2 id="uiConfirmTitle">Please confirm</h2>
                    <p id="uiConfirmMessage"></p>
                    <div class="ui-confirm-actions">
                        <button type="button" id="uiConfirmCancel" class="ui-button-secondary">Cancel</button>
                        <button type="button" id="uiConfirmAccept" class="ui-button-primary">Confirm</button>
                    </div>
                </div>
            </div>
        `);
    }

    function showLoading(message) {
        ensureUi();
        document.getElementById('uiLoadingText').textContent = message || 'Saving changes...';
        document.getElementById('uiLoadingOverlay').classList.remove('hidden');
    }

    function hideLoading() {
        const overlay = document.getElementById('uiLoadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function showToast(message, type) {
        ensureUi();
        const toast = document.getElementById('uiToast');
        toast.textContent = message;
        toast.className = `ui-toast ui-toast-${type || 'success'} visible`;
        window.clearTimeout(showToast.timeout);
        showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 3600);
    }


    function renderInlineLoading(message) {
        return `
            <div class="ui-inline-loading">
                <span class="ui-spinner" aria-hidden="true"></span>
                <span>${message || 'Loading...'}</span>
            </div>
        `;
    }

    function confirmAction(message, title) {
        ensureUi();
        return new Promise(resolve => {
            const overlay = document.getElementById('uiConfirmOverlay');
            document.getElementById('uiConfirmTitle').textContent = title || 'Please confirm';
            document.getElementById('uiConfirmMessage').textContent = message;
            overlay.classList.remove('hidden');

            const finish = value => {
                overlay.classList.add('hidden');
                resolve(value);
            };
            document.getElementById('uiConfirmCancel').onclick = () => finish(false);
            document.getElementById('uiConfirmAccept').onclick = () => finish(true);
        });
    }

    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showToast = showToast;
    window.confirmAction = confirmAction;
    window.renderInlineLoading = renderInlineLoading;
})();
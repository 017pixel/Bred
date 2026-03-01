let toastContainer = null;

function ensureContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = ensureContainer();
    
    const icons = {
        success: 'check_circle',
        error: 'error',
        info: 'info'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <span class="material-symbols-outlined">${icons[type] || icons.info}</span>
        </div>
        <span class="toast-message">${escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, duration);
    
    return toast;
}

export function showSuccess(message) {
    return showToast(message, 'success');
}

export function showError(message) {
    return showToast(message, 'error', 4000);
}

export function showInfo(message) {
    return showToast(message, 'info');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function showApiError(error, providerName) {
    let message = error.message;
    
    if (message.includes('401') || message.includes('Unauthorized')) {
        message = `Ungültiger API-Key für ${providerName}. Bitte überprüfe deine Eingabe.`;
    } else if (message.includes('429') || message.includes('Rate limit')) {
        message = `Zu viele Anfragen an ${providerName}. Bitte warte einen Moment.`;
    } else if (message.includes('500') || message.includes('Internal')) {
        message = `${providerName} Server-Fehler. Bitte versuche es später erneut.`;
    } else if (message.includes('Network') || message.includes('fetch')) {
        message = `Netzwerkfehler. Bitte überprüfe deine Internetverbindung.`;
    }
    
    return showError(message);
}

export function setupKeyboardNavigation(container, items, onSelect, onClose) {
    let focusedIndex = -1;
    
    function updateFocus() {
        items.forEach((item, index) => {
            if (index === focusedIndex) {
                item.classList.add('focused');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('focused');
            }
        });
    }
    
    function handleKeydown(e) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                focusedIndex = focusedIndex < items.length - 1 ? focusedIndex + 1 : 0;
                updateFocus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                focusedIndex = focusedIndex > 0 ? focusedIndex - 1 : items.length - 1;
                updateFocus();
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < items.length) {
                    const item = items[focusedIndex];
                    const value = item.dataset.provider || item.dataset.model;
                    if (value) onSelect(value);
                }
                break;
            case 'Escape':
                e.preventDefault();
                if (onClose) onClose();
                break;
        }
    }
    
    items.forEach((item, index) => {
        item.setAttribute('tabindex', '0');
        item.addEventListener('focus', () => {
            focusedIndex = index;
            updateFocus();
        });
        item.addEventListener('mouseenter', () => {
            focusedIndex = index;
            updateFocus();
        });
    });
    
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
        document.removeEventListener('keydown', handleKeydown);
        items.forEach(item => item.classList.remove('focused'));
    };
}

import { state } from './state.js';
import { PROVIDERS, getModelsForProvider } from './providers.js';
import { setupKeyboardNavigation } from './toast.js';

let currentBottomSheet = null;
let onCloseCallback = null;

export function showBottomSheet(options) {
    const { title, content, onClose, searchable = false, searchPlaceholder = 'Suchen...' } = options;

    if (currentBottomSheet) {
        closeBottomSheet();
    }

    onCloseCallback = onClose;

    const overlay = document.createElement('div');
    overlay.className = 'bottom-sheet-overlay';
    overlay.id = 'bottomSheetOverlay';

    overlay.innerHTML = `
        <div class="bottom-sheet">
            <div class="bottom-sheet-handle"></div>
            <div class="bottom-sheet-header">
                <h3 class="bottom-sheet-title">${title}</h3>
                <button class="bottom-sheet-close" id="bottomSheetClose">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            ${searchable ? `
                <div class="bottom-sheet-search">
                    <div class="bottom-sheet-search-wrapper">
                        <span class="material-symbols-outlined">search</span>
                        <input type="text" class="bottom-sheet-search-input" placeholder="${searchPlaceholder}" id="bottomSheetSearch">
                    </div>
                </div>
            ` : ''}
            <div class="bottom-sheet-content" id="bottomSheetContent">
                ${content}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeBottomSheet();
        }
    });

    overlay.querySelector('#bottomSheetClose').addEventListener('click', closeBottomSheet);

    return {
        overlay,
        content: overlay.querySelector('#bottomSheetContent'),
        search: searchable ? overlay.querySelector('#bottomSheetSearch') : null,
        close: closeBottomSheet
    };
}

export function closeBottomSheet() {
    const overlay = document.getElementById('bottomSheetOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();
        }, 300);
    }
    currentBottomSheet = null;
    if (onCloseCallback) {
        onCloseCallback();
        onCloseCallback = null;
    }
}

export function showProviderSelect(currentProvider, onSelect) {
    const providers = Object.values(PROVIDERS);

    const content = providers.map(p => `
        <div class="select-item ${p.id === currentProvider ? 'selected' : ''}" data-provider="${p.id}">
            <div class="select-item-icon" style="background: ${p.color}15;">
                <span class="material-symbols-outlined" style="color: ${p.color};">${p.icon}</span>
            </div>
            <div class="select-item-content">
                <div class="select-item-title">${p.name}</div>
                <div class="select-item-subtitle">${state.providerKeys[p.id] ? 'API-Key gesetzt' : 'Kein API-Key'}</div>
            </div>
            ${p.id === currentProvider ? '<span class="material-symbols-outlined select-item-check">check</span>' : ''}
        </div>
    `).join('');

    const sheet = showBottomSheet({
        title: 'Anbieter auswählen',
        content: content
    });

    const items = sheet.content.querySelectorAll('.select-item');
    
    items.forEach(item => {
        item.addEventListener('click', () => {
            const providerId = item.dataset.provider;
            onSelect(providerId);
            closeBottomSheet();
        });
    });

    setupKeyboardNavigation(sheet.overlay, Array.from(items), (providerId) => {
        onSelect(providerId);
        closeBottomSheet();
    }, closeBottomSheet);

    return sheet;
}

export function showModelSelect(providerId, currentModel, onSelect) {
    const provider = PROVIDERS[providerId];
    if (!provider) return null;

    const models = getModelsForProvider(providerId);

    let content = '';

    if (providerId === 'openrouter') {
        const categories = {};
        models.forEach(m => {
            if (!categories[m.category]) {
                categories[m.category] = [];
            }
            categories[m.category].push(m);
        });

        Object.entries(categories).forEach(([category, categoryModels]) => {
            content += `<div class="category-header">${category}</div>`;
            categoryModels.forEach(m => {
                content += `
                    <div class="select-item ${m.id === currentModel ? 'selected' : ''}" data-model="${m.id}">
                        <div class="select-item-content">
                            <div class="select-item-title">${m.name}</div>
                            <div class="select-item-subtitle">${m.id}</div>
                        </div>
                        ${m.id === currentModel ? '<span class="material-symbols-outlined select-item-check">check</span>' : ''}
                    </div>
                `;
            });
        });
    } else {
        content = models.map(m => `
            <div class="select-item ${m.id === currentModel ? 'selected' : ''}" data-model="${m.id}">
                <div class="select-item-content">
                    <div class="select-item-title">${m.name}</div>
                    <div class="select-item-subtitle">${m.category}${m.preview ? ' (Vorschau)' : ''}</div>
                </div>
                ${m.preview ? '<span class="select-item-badge">Vorschau</span>' : ''}
                ${m.id === currentModel ? '<span class="material-symbols-outlined select-item-check">check</span>' : ''}
            </div>
        `).join('');
    }

    const sheet = showBottomSheet({
        title: 'Modell auswählen',
        content: content,
        searchable: providerId === 'openrouter',
        searchPlaceholder: 'Modell suchen...'
    });

    if (sheet.search) {
        sheet.search.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            sheet.content.querySelectorAll('.select-item').forEach(item => {
                const title = item.querySelector('.select-item-title').textContent.toLowerCase();
                const subtitle = item.querySelector('.select-item-subtitle').textContent.toLowerCase();
                const matches = title.includes(query) || subtitle.includes(query);
                item.style.display = matches ? '' : 'none';
            });

            sheet.content.querySelectorAll('.category-header').forEach(header => {
                const nextItems = [];
                let next = header.nextElementSibling;
                while (next && !next.classList.contains('category-header')) {
                    if (next.classList.contains('select-item')) {
                        nextItems.push(next);
                    }
                    next = next.nextElementSibling;
                }
                const hasVisible = nextItems.some(item => item.style.display !== 'none');
                header.style.display = hasVisible ? '' : 'none';
            });
        });
    }

    const items = sheet.content.querySelectorAll('.select-item');
    
    items.forEach(item => {
        item.addEventListener('click', () => {
            const modelId = item.dataset.model;
            onSelect(modelId);
            closeBottomSheet();
        });
    });

    setupKeyboardNavigation(sheet.overlay, Array.from(items), (modelId) => {
        onSelect(modelId);
        closeBottomSheet();
    }, closeBottomSheet);

    return sheet;
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

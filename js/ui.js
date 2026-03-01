import { state } from './state.js';
import { PROVIDERS } from './providers.js';

export function addMessage(text, sender, imageData = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    if (imageData) {
        const img = document.createElement('img');
        img.src = imageData;
        img.className = 'message-image';
        messageDiv.appendChild(img);
    }

    if (text) {
        const p = document.createElement('p');
        if (sender === 'bot') {
            p.innerHTML = formatMessage(text);
        } else {
            p.textContent = text;
        }
        messageDiv.appendChild(p);
    }

    const chatArea = document.getElementById('chatArea');
    chatArea.appendChild(messageDiv);
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

export function addLoadingMessage() {
    const chatArea = document.getElementById('chatArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message loading-message';
    messageDiv.innerHTML = `
        <div class="loading-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatArea.appendChild(messageDiv);
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

export function addStreamingMessage() {
    const chatArea = document.getElementById('chatArea');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message streaming-message';
    messageDiv.innerHTML = '<p></p>';
    chatArea.appendChild(messageDiv);
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return messageDiv;
}

export function updateStreamingMessage(messageDiv, text) {
    const p = messageDiv.querySelector('p');
    if (p) {
        p.innerHTML = formatMessage(text);
    }
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

export function finalizeStreamingMessage(messageDiv, fullText) {
    const p = messageDiv.querySelector('p');
    if (p) {
        p.innerHTML = formatMessage(fullText);
    }
    messageDiv.classList.remove('streaming-message');
}

function formatMessage(text) {
    let formatted = escapeHtml(text);
    
    formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        const langDisplay = lang || 'code';
        return `<div class="code-block-wrapper"><div class="code-header"><span class="code-lang">${langDisplay}</span><button class="copy-code-btn" onclick="copyCode(this)"><span class="material-symbols-outlined">content_copy</span></button></div><pre class="code-block"><code>${code.trim()}</code></pre></div>`;
    });
    
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    formatted = formatted.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    formatted = formatted.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '<hr class="divider">');
    
    formatted = formatTables(formatted);
    
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    formatted = formatted.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
    
    formatted = formatted.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    formatted = formatted.replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="numbered">$1</li>');
    
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    formatted = formatted.replace(/<br><hr class="divider"><br>/g, '<hr class="divider">');
    formatted = formatted.replace(/<p><hr class="divider"><\/p>/g, '<hr class="divider">');
    formatted = formatted.replace(/<br><(h[1-3])>/g, '<$1>');
    formatted = formatted.replace(/<\/(h[1-3])><br>/g, '</$1>');
    formatted = formatted.replace(/<p><(h[1-3])>/g, '<$1>');
    formatted = formatted.replace(/<\/(h[1-3])><\/p>/g, '</$1>');
    
    return `<p>${formatted}</p>`;
}

function formatTables(text) {
    const tableRegex = /^\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/gm;
    
    return text.replace(tableRegex, (match, headerRow, bodyRows) => {
        const headers = headerRow.split('|').map(h => h.trim()).filter(h => h);
        const rows = bodyRows.trim().split('\n').map(row => {
            return row.split('|').map(cell => cell.trim()).filter(cell => cell);
        });
        
        let table = '<div class="table-wrapper"><table class="message-table"><thead><tr>';
        headers.forEach(h => {
            table += `<th>${h}</th>`;
        });
        table += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            table += '<tr>';
            row.forEach((cell, i) => {
                const tag = i < headers.length ? 'td' : 'td';
                table += `<${tag}>${cell}</${tag}>`;
            });
            table += '</tr>';
        });
        
        table += '</tbody></table></div>';
        return table;
    });
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.copyCode = function(btn) {
    const wrapper = btn.closest('.code-block-wrapper');
    const code = wrapper?.querySelector('code');
    if (code) {
        navigator.clipboard.writeText(code.textContent).then(() => {
            btn.classList.add('copied');
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = 'check';
            setTimeout(() => {
                btn.classList.remove('copied');
                if (icon) icon.textContent = 'content_copy';
            }, 2000);
        });
    }
};

export function updateWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    const welcomeTitle = document.getElementById('welcomeTitle');
    const chatMessages = document.getElementById('chatMessages');
    
    if (!welcomeScreen || !welcomeTitle) return;
    
    const isNewChat = !state.conversationHistory || state.conversationHistory.length === 0;
    welcomeScreen.classList.toggle('hidden', !isNewChat);
    
    if (chatMessages) {
        chatMessages.classList.toggle('has-welcome', isNewChat);
        chatMessages.classList.toggle('no-scroll', isNewChat);
    }

    if (isNewChat) {
        let name = '';
        if (!state.isIncognito && state.personalization.name) {
            name = state.personalization.name;
        }

        const userGreeting = welcomeTitle.querySelector('.user-greeting');
        const subGreeting = welcomeTitle.querySelector('.sub-greeting');

        if (userGreeting) {
            if (name) {
                userGreeting.textContent = `Hallo, ${escapeHtml(name)}`;
            } else {
                userGreeting.textContent = 'Hallo,';
            }
        }
        
        if (subGreeting) {
            subGreeting.textContent = 'Wie kann ich dir heute helfen?';
        }
    }
}

export function updateIncognitoUI() {
    const incognitoToggle = document.getElementById('incognitoToggle');
    const incognitoIcon = document.getElementById('incognitoIcon');
    const incognitoText = document.getElementById('incognitoText');
    const personalizationFields = document.getElementById('personalizationFields');
    
    if (incognitoToggle) {
        incognitoToggle.checked = !state.isIncognito;
    }

    if (state.isIncognito) {
        if (incognitoIcon) incognitoIcon.textContent = 'visibility_off';
        if (incognitoText) incognitoText.textContent = 'Incognito';
        if (personalizationFields) personalizationFields.classList.add('disabled');
        
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) sectionHeader.classList.add('incognito-active');
    } else {
        if (incognitoIcon) incognitoIcon.textContent = 'visibility';
        if (incognitoText) incognitoText.textContent = 'Aktiv';
        if (personalizationFields) personalizationFields.classList.remove('disabled');
        
        const sectionHeader = document.querySelector('.section-header');
        if (sectionHeader) sectionHeader.classList.remove('incognito-active');
    }
}

export function clearChatArea() {
    const chatArea = document.getElementById('chatArea');
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatArea) chatArea.innerHTML = '';
    if (chatMessages) chatMessages.scrollTo({ top: 0, behavior: 'smooth' });
}

export function updateChatList(loadChatCallback, deleteChatCallback) {
    const chatList = document.getElementById('chatList');
    if (!chatList) return;

    const chatIds = Object.keys(state.allChats).sort((a, b) => {
        return (state.allChats[b].updatedAt || 0) - (state.allChats[a].updatedAt || 0);
    });

    if (chatIds.length === 0) {
        chatList.innerHTML = `
            <div class="chat-list-empty">
                <span class="material-symbols-outlined">chat_bubble_outline</span>
                <p>Noch keine BREAD Chats</p>
            </div>
        `;
        return;
    }

    chatList.innerHTML = chatIds.map(id => {
        const chat = state.allChats[id];
        const isActive = id === state.currentChatId;
        const title = getChatTitle(chat);
        const preview = getChatPreview(chat);
        const date = formatDate(chat.updatedAt || chat.createdAt || Date.now());

        return `
            <div class="chat-item ${isActive ? 'active' : ''}" data-chat-id="${id}">
                <div class="chat-item-icon">
                    <span class="material-symbols-outlined">chat</span>
                </div>
                <div class="chat-item-content">
                    <div class="chat-item-title">${escapeHtml(title)}</div>
                    <div class="chat-item-preview">${escapeHtml(preview)}</div>
                </div>
                <span class="chat-item-date">${date}</span>
                <button class="chat-item-delete" data-delete-id="${id}" title="Löschen">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        `;
    }).join('');

    chatList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.chat-item-delete')) return;

            const chatId = item.getAttribute('data-chat-id');
            loadChatCallback(chatId);
        });
    });

    chatList.querySelectorAll('.chat-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const chatId = btn.getAttribute('data-delete-id');
            deleteChatCallback(chatId);
        });
    });
}

function getChatTitle(chat) {
    if (chat.history && chat.history.length > 0) {
        const firstMessage = chat.history[0];
        const text = firstMessage.content || (firstMessage.parts && firstMessage.parts[0] && firstMessage.parts[0].text) || 'BREAD Chat';
        return text.substring(0, 40) + (text.length > 40 ? '...' : '');
    }
    return 'BREAD Chat';
}

function getChatPreview(chat) {
    if (chat.history && chat.history.length > 1) {
        const lastMessage = chat.history[chat.history.length - 1];
        const text = lastMessage.content || (lastMessage.parts && lastMessage.parts[0] && lastMessage.parts[0].text) || 'Keine Nachrichten';
        return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    }
    return 'Keine Nachrichten';
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Gerade eben';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' Min.';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' Std.';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' Tage';

    return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
}

export function updateProviderUI() {
    const provider = PROVIDERS[state.activeProvider];
    if (!provider) return;

    const providerNameEl = document.getElementById('selectedProviderName');
    const providerIconEl = document.getElementById('selectedProviderIcon');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyLink = document.getElementById('apiKeyLink');
    const modelNameEl = document.getElementById('selectedModelName');

    if (providerNameEl) providerNameEl.textContent = provider.name;
    if (providerIconEl) {
        providerIconEl.textContent = provider.icon;
        providerIconEl.style.color = provider.color;
    }
    if (apiKeyInput) apiKeyInput.value = state.providerKeys[state.activeProvider] || '';
    if (apiKeyLink) apiKeyLink.href = provider.keyUrl;
    if (modelNameEl) {
        const models = provider.models || [];
        const model = models.find(m => m.id === state.selectedModel);
        modelNameEl.textContent = model?.name || state.selectedModel || 'Modell auswählen...';
    }
}

export function updateBannerVisibility() {
    const banner = document.getElementById('apiBanner');
    const bannerText = document.getElementById('bannerText');
    
    if (banner) {
        const hasKey = state.hasAnyKey();
        banner.classList.toggle('hidden', hasKey);
        
        if (!hasKey && bannerText) {
            bannerText.textContent = 'Bitte API-Key eingeben';
        }
    }
}

export function updateBannerForProvider() {
    const banner = document.getElementById('apiBanner');
    const bannerText = document.getElementById('bannerText');
    
    if (banner && !state.hasAnyKey()) {
        if (bannerText) {
            bannerText.textContent = `${PROVIDERS[state.activeProvider]?.name || 'Provider'} API-Key erforderlich`;
        }
    }
}

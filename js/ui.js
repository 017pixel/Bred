/**
 * UI Functions
 */
import { DOM } from './config.js';
import { state } from './state.js';

// ========================================
// Message Rendering
// ========================================

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

    DOM.chatArea.appendChild(messageDiv);
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    return messageDiv;
}

export function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message loading-message';
    messageDiv.innerHTML = `
        <div class="loading-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    DOM.chatArea.appendChild(messageDiv);
    DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
    return messageDiv;
}

function formatMessage(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// UI Updates
// ========================================

export function updateWelcomeScreen() {
    const isNewChat = state.conversationHistory.length === 0;
    DOM.welcomeScreen.classList.toggle('hidden', !isNewChat);

    if (isNewChat) {
        let name = '';
        if (!state.isIncognito && state.personalization.name) {
            name = state.personalization.name;
        }

        const userGreeting = DOM.welcomeTitle.querySelector('.user-greeting');
        const subGreeting = DOM.welcomeTitle.querySelector('.sub-greeting');

        if (name) {
            userGreeting.textContent = `Hallo, ${escapeHtml(name)}`;
        } else {
            userGreeting.textContent = 'Hallo,';
        }
        subGreeting.textContent = 'Wie kann ich dir heute helfen?';
    }
}

export function updateBannerVisibility() {
    DOM.apiBanner.classList.toggle('hidden', !!state.apiKey);
}

export function updateIncognitoUI() {
    DOM.incognitoToggle.checked = !state.isIncognito;

    if (state.isIncognito) {
        DOM.incognitoIcon.textContent = 'visibility_off';
        DOM.incognitoText.textContent = 'Incognito';
        DOM.personalizationFields.classList.add('disabled');
        document.querySelector('.section-header').classList.add('incognito-active');
    } else {
        DOM.incognitoIcon.textContent = 'visibility';
        DOM.incognitoText.textContent = 'Aktiv';
        DOM.personalizationFields.classList.remove('disabled');
        document.querySelector('.section-header').classList.remove('incognito-active');
    }
}

export function clearChatArea() {
    DOM.chatArea.innerHTML = '';
    DOM.chatMessages.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// Chat List Rendering
// ========================================

export function updateChatList(loadChatCallback, deleteChatCallback) {
    const chatIds = Object.keys(state.allChats).sort((a, b) => {
        return (state.allChats[b].updatedAt || 0) - (state.allChats[a].updatedAt || 0);
    });

    if (chatIds.length === 0) {
        DOM.chatList.innerHTML = `
            <div class="chat-list-empty">
                <span class="material-symbols-outlined">chat_bubble_outline</span>
                <p>Noch keine Bred Chats</p>
            </div>
        `;
        return;
    }

    DOM.chatList.innerHTML = chatIds.map(id => {
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

    // Add event listeners
    DOM.chatList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Prevent click if delete button was clicked
            if (e.target.closest('.chat-item-delete')) return;

            const chatId = item.getAttribute('data-chat-id');
            loadChatCallback(chatId);
        });
    });

    DOM.chatList.querySelectorAll('.chat-item-delete').forEach(btn => {
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
        const text = firstMessage.content || (firstMessage.parts && firstMessage.parts[0] && firstMessage.parts[0].text) || 'Bred Chat';
        return text.substring(0, 40) + (text.length > 40 ? '...' : '');
    }
    return 'Bred Chat';
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

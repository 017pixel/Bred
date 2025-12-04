/**
 * Main Application Entry Point
 */
import { DOM } from './config.js';
import { state } from './state.js';
import { sendToGemini } from './api.js';
import * as UI from './ui.js';

// ========================================
// Initialization
// ========================================

function init() {
    setupEventListeners();

    // Load current chat or create new one
    if (state.currentChatId && state.allChats[state.currentChatId]) {
        loadChat(state.currentChatId);
    }

    UI.updateBannerVisibility();
    UI.updateIncognitoUI();
    UI.updateWelcomeScreen();
    DOM.messageInput.focus();
}

function setupEventListeners() {
    // New Chat
    DOM.newChatButton.addEventListener('click', handleNewChat);

    // Message handling
    DOM.sendButton.addEventListener('click', handleSendMessage);
    DOM.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    // Settings modal
    DOM.settingsButton.addEventListener('click', openSettings);
    DOM.openSettingsBtn.addEventListener('click', openSettings);
    DOM.closeModalBtn.addEventListener('click', closeSettings);
    DOM.cancelButton.addEventListener('click', closeSettings);
    DOM.saveSettingsBtn.addEventListener('click', saveSettings);

    // Account modal
    DOM.accountButton.addEventListener('click', openAccount);
    DOM.closeAccountModal.addEventListener('click', closeAccount);
    DOM.cancelAccountButton.addEventListener('click', closeAccount);
    DOM.saveAccountSettings.addEventListener('click', saveAccount);

    // History modal
    DOM.historyButton.addEventListener('click', openHistory);
    DOM.closeHistoryModal.addEventListener('click', closeHistory);

    // Toggle password visibility
    DOM.toggleVisibility.addEventListener('click', () => {
        const isPassword = DOM.apiKeyInput.type === 'password';
        DOM.apiKeyInput.type = isPassword ? 'text' : 'password';
        DOM.toggleVisibility.querySelector('.material-symbols-outlined').textContent =
            isPassword ? 'visibility_off' : 'visibility';
    });

    // Incognito Toggle
    DOM.incognitoToggle.addEventListener('change', handleIncognitoToggle);

    // Suggestion Cards
    DOM.suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            DOM.messageInput.value = prompt;
            DOM.messageInput.focus();
        });
    });

    // Close modals on overlay click
    DOM.settingsModal.addEventListener('click', (e) => {
        if (e.target === DOM.settingsModal) closeSettings();
    });
    DOM.accountModal.addEventListener('click', (e) => {
        if (e.target === DOM.accountModal) closeAccount();
    });
    DOM.historyModal.addEventListener('click', (e) => {
        if (e.target === DOM.historyModal) closeHistory();
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (DOM.settingsModal.classList.contains('active')) closeSettings();
            if (DOM.accountModal.classList.contains('active')) closeAccount();
            if (DOM.historyModal.classList.contains('active')) closeHistory();
        }
    });
}

// ========================================
// Event Handlers
// ========================================

async function handleSendMessage() {
    const message = DOM.messageInput.value.trim();
    if (message === '') return;

    // Create new chat if none exists
    if (!state.currentChatId) {
        state.createNewChat();
    }

    const isFirstMessage = state.conversationHistory.length === 0;

    UI.addMessage(message, 'user');
    DOM.messageInput.value = '';

    // Smooth scroll to chat area after first message
    if (isFirstMessage) {
        DOM.chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (!state.apiKey) {
        UI.addMessage('Bitte gib zuerst deinen API-Key ein.', 'bot');
        openSettings();
        return;
    }

    const loadingMessage = UI.addLoadingMessage();

    try {
        const response = await sendToGemini(message);
        loadingMessage.remove();
        UI.addMessage(response, 'bot');
        state.saveCurrentChat();
    } catch (error) {
        loadingMessage.remove();
        UI.addMessage(`Fehler: ${error.message}`, 'bot');
    }
}

function handleNewChat() {
    state.createNewChat();
    UI.clearChatArea();
    UI.updateWelcomeScreen();
    DOM.messageInput.focus();
}

function handleIncognitoToggle() {
    state.setIncognito(!DOM.incognitoToggle.checked);
    UI.updateIncognitoUI();
    UI.updateWelcomeScreen();
}

// ========================================
// Modal Functions
// ========================================

// Settings
function openSettings() {
    DOM.apiKeyInput.value = state.apiKey;
    DOM.settingsModal.classList.add('active');
}

function closeSettings() {
    DOM.settingsModal.classList.remove('active');
}

function saveSettings() {
    state.setApiKey(DOM.apiKeyInput.value.trim());
    UI.updateBannerVisibility();
    closeSettings();
}

// Account
function openAccount() {
    const p = state.personalization;
    DOM.userNameInput.value = p.name;
    DOM.userHobbiesInput.value = p.hobbies;
    DOM.userInstructionsInput.value = p.instructions;
    DOM.userAboutInput.value = p.about;

    UI.updateIncognitoUI();
    DOM.accountModal.classList.add('active');
}

function closeAccount() {
    DOM.accountModal.classList.remove('active');
}

function saveAccount() {
    state.savePersonalization({
        name: DOM.userNameInput.value.trim(),
        hobbies: DOM.userHobbiesInput.value.trim(),
        instructions: DOM.userInstructionsInput.value.trim(),
        about: DOM.userAboutInput.value.trim()
    });
    state.setIncognito(!DOM.incognitoToggle.checked);
    UI.updateWelcomeScreen();
    closeAccount();
}

// History
function openHistory() {
    UI.updateChatList(loadChat, deleteChat);
    DOM.historyModal.classList.add('active');
}

function closeHistory() {
    DOM.historyModal.classList.remove('active');
}

function loadChat(chatId) {
    if (state.loadChat(chatId)) {
        UI.clearChatArea();

        state.conversationHistory.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            UI.addMessage(msg.parts[0].text, sender);
        });

        if (state.conversationHistory.length > 0) {
            setTimeout(() => {
                DOM.chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        closeHistory();
    }
}

function deleteChat(chatId) {
    const isCurrent = state.deleteChat(chatId);
    if (isCurrent) {
        UI.clearChatArea();
        UI.updateWelcomeScreen();
    }
    UI.updateChatList(loadChat, deleteChat);
}

// Start App
document.addEventListener('DOMContentLoaded', init);

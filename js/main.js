/**
 * Main Application Entry Point
 */
import { DOM } from './config.js';
import { state } from './state.js';
import { sendToGroq, generateSummary } from './api.js';
import * as UI from './ui.js';

// ========================================
// Initialization
// ========================================

async function init() {
    setupEventListeners();

    // Initialize state (load from IndexedDB)
    await state.init();

    // Load current chat or create new one
    if (state.currentChatId && state.allChats[state.currentChatId]) {
        // Just render, don't trigger summarizeCurrentChat on boot
        UI.clearChatArea();
        state.conversationHistory.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            const text = msg.content || (msg.parts && msg.parts[0] && msg.parts[0].text) || '';
            UI.addMessage(text, sender);
        });

        if (state.conversationHistory.length > 0) {
            setTimeout(() => {
                DOM.chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    UI.updateBannerVisibility();
    UI.updateIncognitoUI();
    UI.updateWelcomeScreen();
    DOM.messageInput.focus();
}

function setupEventListeners() {
    const premiumInput = document.getElementById('messageInput');

    // New Chat
    DOM.newChatButton.addEventListener('click', handleNewChat);

    // Message handling
    DOM.sendButton.addEventListener('click', handleSendMessage);
    premiumInput.addEventListener('keypress', (e) => {
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

    // Suggestion Cards (Pills)
    document.querySelectorAll('.suggestion-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const prompt = pill.getAttribute('data-prompt');
            premiumInput.value = prompt;
            premiumInput.focus();
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
        await state.createNewChat();
    }

    const isFirstMessage = state.conversationHistory.length === 0;

    UI.addMessage(message, 'user');
    DOM.messageInput.value = '';

    // Smooth scroll to chat area after first message
    if (isFirstMessage) {
        DOM.chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (!state.apiKey) {
        UI.addMessage('Bitte gib zuerst deinen Groq API-Key ein.', 'bot');
        openSettings();
        return;
    }

    const loadingMessage = UI.addLoadingMessage();

    try {
        const response = await sendToGroq(message);
        loadingMessage.remove();
        UI.addMessage(response, 'bot');
        await state.saveCurrentChat();
    } catch (error) {
        loadingMessage.remove();
        UI.addMessage(`Fehler: ${error.message}`, 'bot');
    }
}

async function handleNewChat() {
    await summarizeCurrentChat();
    await state.createNewChat();
    UI.clearChatArea();
    UI.updateWelcomeScreen();
    DOM.messageInput.focus();
}

async function handleIncognitoToggle() {
    await state.setIncognito(!DOM.incognitoToggle.checked);
    UI.updateIncognitoUI();
    UI.updateWelcomeScreen();
}

// ========================================
// Modal Functions
// ========================================

// Settings
function openSettings() {
    DOM.apiKeyInput.value = state.apiKey;
    DOM.modelSelect.value = state.selectedModel;
    DOM.memoryToggle.checked = state.isMemoryEnabled;
    DOM.settingsModal.classList.add('active');
}

function closeSettings() {
    DOM.settingsModal.classList.remove('active');
}

async function saveSettings() {
    await state.setApiKey(DOM.apiKeyInput.value.trim());
    await state.setModel(DOM.modelSelect.value);
    await state.setMemoryEnabled(DOM.memoryToggle.checked);
    UI.updateBannerVisibility();
    closeSettings();
}

async function summarizeCurrentChat() {
    if (state.isMemoryEnabled &&
        state.conversationHistory.length >= 2 &&
        state.currentChatId &&
        !state.allChats[state.currentChatId]?.wasSummarized) {

        console.log('Generating summary for memory...');
        const summary = await generateSummary(state.conversationHistory);
        if (summary) {
            console.log('Summary generated:', summary);
            await state.appendMemory(summary);
            await state.markAsSummarized(state.currentChatId);
        }
    }
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

async function saveAccount() {
    await state.savePersonalization({
        name: DOM.userNameInput.value.trim(),
        hobbies: DOM.userHobbiesInput.value.trim(),
        instructions: DOM.userInstructionsInput.value.trim(),
        about: DOM.userAboutInput.value.trim()
    });
    await state.setIncognito(!DOM.incognitoToggle.checked);
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

async function loadChat(chatId) {
    await summarizeCurrentChat();
    if (await state.loadChat(chatId)) {
        UI.clearChatArea();

        state.conversationHistory.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            const text = msg.content || (msg.parts && msg.parts[0] && msg.parts[0].text) || '';
            UI.addMessage(text, sender);
        });

        if (state.conversationHistory.length > 0) {
            setTimeout(() => {
                DOM.chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        closeHistory();
    }
}

async function deleteChat(chatId) {
    const isCurrent = await state.deleteChat(chatId);
    if (isCurrent) {
        UI.clearChatArea();
        UI.updateWelcomeScreen();
    }
    UI.updateChatList(loadChat, deleteChat);
}

// Start App
document.addEventListener('DOMContentLoaded', init);

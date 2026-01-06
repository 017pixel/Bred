/**
 * Simple Chatbot - Minimal Gemini Integration
 * With Personalization, Incognito Mode & Chat Management
 */

// ========================================
// Configuration - Change model here
// ========================================

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Storage Keys
const STORAGE_KEY = 'gemini_api_key';
const PERSONALIZATION_KEY = 'chatbot_personalization';
const INCOGNITO_KEY = 'chatbot_incognito';
const CHATS_KEY = 'chatbot_chats';
const CURRENT_CHAT_KEY = 'chatbot_current_chat';

// ========================================
// DOM Elements
// ========================================

const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeModalBtn = document.getElementById('closeModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleVisibility = document.getElementById('toggleVisibility');
const saveSettingsBtn = document.getElementById('saveSettings');
const cancelButton = document.getElementById('cancelButton');
const apiBanner = document.getElementById('apiBanner');
const openSettingsBtn = document.getElementById('openSettingsBtn');

// New Chat Button
const newChatButton = document.getElementById('newChatButton');

// Account Modal Elements
const accountButton = document.getElementById('accountButton');
const accountModal = document.getElementById('accountModal');
const closeAccountModal = document.getElementById('closeAccountModal');
const cancelAccountButton = document.getElementById('cancelAccountButton');
const saveAccountSettings = document.getElementById('saveAccountSettings');

// History Modal Elements
const historyButton = document.getElementById('historyButton');
const historyModal = document.getElementById('historyModal');
const closeHistoryModal = document.getElementById('closeHistoryModal');
const chatList = document.getElementById('chatList');

// Personalization Elements
const incognitoToggle = document.getElementById('incognitoToggle');
const incognitoIcon = document.getElementById('incognitoIcon');
const incognitoText = document.getElementById('incognitoText');
const personalizationFields = document.getElementById('personalizationFields');
const userNameInput = document.getElementById('userName');
const userHobbiesInput = document.getElementById('userHobbies');
const userInstructionsInput = document.getElementById('userInstructions');
const userAboutInput = document.getElementById('userAbout');

// Welcome Screen Elements
const welcomeScreen = document.getElementById('welcomeScreen');
const welcomeTitle = document.getElementById('welcomeTitle');
const suggestionCards = document.querySelectorAll('.suggestion-card');

// Chat Area (where messages appear)
const chatArea = document.getElementById('chatArea');

// ========================================
// State
// ========================================

let apiKey = localStorage.getItem(STORAGE_KEY) || '';
let conversationHistory = [];

// Chat Management State
let allChats = loadChats();
let currentChatId = localStorage.getItem(CURRENT_CHAT_KEY) || null;

// Personalization State
let personalization = loadPersonalization();
let isIncognito = localStorage.getItem(INCOGNITO_KEY) === 'true';

// ========================================
// Initialization
// ========================================

function init() {
    // New Chat button
    newChatButton.addEventListener('click', createNewChat);

    // Message handling
    sendButton.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });

    // Settings modal
    settingsButton.addEventListener('click', openSettings);
    openSettingsBtn.addEventListener('click', openSettings);
    closeModalBtn.addEventListener('click', closeSettings);
    cancelButton.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);

    // Account modal
    accountButton.addEventListener('click', openAccount);
    closeAccountModal.addEventListener('click', closeAccount);
    cancelAccountButton.addEventListener('click', closeAccount);
    saveAccountSettings.addEventListener('click', saveAccount);

    // History modal
    historyButton.addEventListener('click', openHistory);
    closeHistoryModal.addEventListener('click', closeHistory);

    // Toggle password visibility
    toggleVisibility.addEventListener('click', () => {
        const isPassword = apiKeyInput.type === 'password';
        apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleVisibility.querySelector('.material-symbols-outlined').textContent =
            isPassword ? 'visibility_off' : 'visibility';
    });

    // Incognito Toggle
    incognitoToggle.addEventListener('change', handleIncognitoToggle);

    // Suggestion Cards
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.getAttribute('data-prompt');
            messageInput.value = prompt;
            messageInput.focus();
        });
    });

    // Close modals on overlay click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
    accountModal.addEventListener('click', (e) => {
        if (e.target === accountModal) closeAccount();
    });
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) closeHistory();
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (settingsModal.classList.contains('active')) closeSettings();
            if (accountModal.classList.contains('active')) closeAccount();
            if (historyModal.classList.contains('active')) closeHistory();
        }
    });

    // Load current chat or create new one
    if (currentChatId && allChats[currentChatId]) {
        loadChat(currentChatId);
    }

    updateBannerVisibility();
    updateIncognitoUI();
    updateWelcomeScreen();
    messageInput.focus();
}

// ========================================
// Chat Management Functions
// ========================================

function loadChats() {
    try {
        const stored = localStorage.getItem(CHATS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

function saveChats() {
    localStorage.setItem(CHATS_KEY, JSON.stringify(allChats));
}

function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getChatTitle(chat) {
    if (chat.history.length > 0) {
        const firstMessage = chat.history[0].parts[0].text;
        return firstMessage.substring(0, 40) + (firstMessage.length > 40 ? '...' : '');
    }
    return 'Neuer Chat';
}

function getChatPreview(chat) {
    if (chat.history.length > 1) {
        const lastMessage = chat.history[chat.history.length - 1].parts[0].text;
        return lastMessage.substring(0, 50) + (lastMessage.length > 50 ? '...' : '');
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

function createNewChat() {
    // Save current chat first
    if (currentChatId && conversationHistory.length > 0) {
        allChats[currentChatId] = {
            id: currentChatId,
            history: conversationHistory,
            updatedAt: Date.now()
        };
        saveChats();
    }

    // Create new chat
    const newId = generateChatId();
    currentChatId = newId;
    conversationHistory = [];

    allChats[newId] = {
        id: newId,
        history: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    localStorage.setItem(CURRENT_CHAT_KEY, newId);
    saveChats();

    // Clear UI
    chatArea.innerHTML = '';
    chatMessages.scrollTo({ top: 0, behavior: 'smooth' });
    updateWelcomeScreen();
    messageInput.focus();
}

function loadChat(chatId) {
    // Save current chat first
    if (currentChatId && conversationHistory.length > 0) {
        allChats[currentChatId] = {
            ...allChats[currentChatId],
            history: conversationHistory,
            updatedAt: Date.now()
        };
        saveChats();
    }

    // Load the selected chat
    const chat = allChats[chatId];
    if (!chat) return;

    currentChatId = chatId;
    conversationHistory = chat.history || [];
    localStorage.setItem(CURRENT_CHAT_KEY, chatId);

    // Render messages
    chatArea.innerHTML = '';
    conversationHistory.forEach(msg => {
        const sender = msg.role === 'user' ? 'user' : 'bot';
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        if (sender === 'bot') {
            messageDiv.innerHTML = `<p>${formatMessage(msg.parts[0].text)}</p>`;
        } else {
            messageDiv.textContent = msg.parts[0].text;
        }

        chatArea.appendChild(messageDiv);
    });

    // Scroll to chat if there are messages
    if (conversationHistory.length > 0) {
        setTimeout(() => {
            chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    closeHistory();
}

function deleteChat(chatId, event) {
    event.stopPropagation();

    delete allChats[chatId];
    saveChats();

    // If deleting current chat, create a new one
    if (chatId === currentChatId) {
        createNewChat();
    }

    updateChatList();
}

function saveCurrentChat() {
    if (currentChatId) {
        allChats[currentChatId] = {
            ...allChats[currentChatId],
            history: conversationHistory,
            updatedAt: Date.now()
        };
        saveChats();
    }
}

// ========================================
// Personalization Functions
// ========================================

function loadPersonalization() {
    try {
        const stored = localStorage.getItem(PERSONALIZATION_KEY);
        return stored ? JSON.parse(stored) : {
            name: '',
            hobbies: '',
            instructions: '',
            about: ''
        };
    } catch {
        return { name: '', hobbies: '', instructions: '', about: '' };
    }
}

function savePersonalization() {
    personalization = {
        name: userNameInput.value.trim(),
        hobbies: userHobbiesInput.value.trim(),
        instructions: userInstructionsInput.value.trim(),
        about: userAboutInput.value.trim()
    };
    localStorage.setItem(PERSONALIZATION_KEY, JSON.stringify(personalization));
}

function populatePersonalizationFields() {
    userNameInput.value = personalization.name;
    userHobbiesInput.value = personalization.hobbies;
    userInstructionsInput.value = personalization.instructions;
    userAboutInput.value = personalization.about;
}

function handleIncognitoToggle() {
    isIncognito = !incognitoToggle.checked;
    updateIncognitoUI();
    updateWelcomeScreen();
}

function updateIncognitoUI() {
    incognitoToggle.checked = !isIncognito;

    if (isIncognito) {
        incognitoIcon.textContent = 'visibility_off';
        incognitoText.textContent = 'Incognito';
        personalizationFields.classList.add('disabled');
        document.querySelector('.section-header').classList.add('incognito-active');
    } else {
        incognitoIcon.textContent = 'visibility';
        incognitoText.textContent = 'Aktiv';
        personalizationFields.classList.remove('disabled');
        document.querySelector('.section-header').classList.remove('incognito-active');
    }
}

function buildSystemPrompt() {
    if (isIncognito) {
        return null;
    }

    const parts = [];

    if (personalization.name) {
        parts.push(`Der Name des Benutzers ist ${personalization.name}.`);
    }

    if (personalization.hobbies) {
        parts.push(`Hobbys und Interessen des Benutzers: ${personalization.hobbies}`);
    }

    if (personalization.about) {
        parts.push(`Weitere Informationen über den Benutzer: ${personalization.about}`);
    }

    if (personalization.instructions) {
        parts.push(`Spezielle Anweisungen: ${personalization.instructions}`);
    }

    if (parts.length === 0) {
        return null;
    }

    return parts.join('\n');
}

// ========================================
// Welcome Screen Functions
// ========================================

function updateWelcomeScreen() {
    welcomeScreen.classList.remove('hidden');

    let name = '';
    if (!isIncognito && personalization.name) {
        name = personalization.name;
    }

    if (name) {
        welcomeTitle.innerHTML = `Hallo ${escapeHtml(name)},<br>bist du bereit,<br>alles zu erreichen?`;
    } else {
        welcomeTitle.innerHTML = 'Hallo,<br>bist du bereit,<br>alles zu erreichen?';
    }
}

// ========================================
// Settings Modal
// ========================================

function openSettings() {
    apiKeyInput.value = apiKey;
    settingsModal.classList.add('active');
}

function closeSettings() {
    settingsModal.classList.remove('active');
}

function saveSettings() {
    apiKey = apiKeyInput.value.trim();
    localStorage.setItem(STORAGE_KEY, apiKey);
    updateBannerVisibility();
    closeSettings();
}

// ========================================
// Account Modal
// ========================================

function openAccount() {
    populatePersonalizationFields();
    updateIncognitoUI();
    accountModal.classList.add('active');
}

function closeAccount() {
    accountModal.classList.remove('active');
}

function saveAccount() {
    savePersonalization();
    localStorage.setItem(INCOGNITO_KEY, isIncognito.toString());
    updateWelcomeScreen();
    closeAccount();
}

// ========================================
// History Modal
// ========================================

function openHistory() {
    updateChatList();
    historyModal.classList.add('active');
}

function closeHistory() {
    historyModal.classList.remove('active');
}

function updateChatList() {
    const chatIds = Object.keys(allChats).sort((a, b) => {
        return (allChats[b].updatedAt || 0) - (allChats[a].updatedAt || 0);
    });

    if (chatIds.length === 0) {
        chatList.innerHTML = `
            <div class="chat-list-empty">
                <span class="material-symbols-outlined">chat_bubble_outline</span>
                <p>Noch keine Chats</p>
            </div>
        `;
        return;
    }

    chatList.innerHTML = chatIds.map(id => {
        const chat = allChats[id];
        const isActive = id === currentChatId;
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
    chatList.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.getAttribute('data-chat-id');
            loadChat(chatId);
        });
    });

    chatList.querySelectorAll('.chat-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const chatId = btn.getAttribute('data-delete-id');
            deleteChat(chatId, e);
        });
    });
}

function updateBannerVisibility() {
    apiBanner.classList.toggle('hidden', !!apiKey);
}

// ========================================
// Message Handling
// ========================================

async function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;

    // Create new chat if none exists
    if (!currentChatId) {
        const newId = generateChatId();
        currentChatId = newId;
        allChats[newId] = {
            id: newId,
            history: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        localStorage.setItem(CURRENT_CHAT_KEY, newId);
    }

    const isFirstMessage = conversationHistory.length === 0;

    addMessage(message, 'user');
    messageInput.value = '';

    // Smooth scroll to chat area after first message
    if (isFirstMessage) {
        chatArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (!apiKey) {
        addMessage('Bitte gib zuerst deinen API-Key ein.', 'bot');
        openSettings();
        return;
    }

    const loadingMessage = addLoadingMessage();

    try {
        const response = await sendToGemini(message);
        loadingMessage.remove();
        addMessage(response, 'bot');
        saveCurrentChat();
    } catch (error) {
        loadingMessage.remove();
        addMessage(`Fehler: ${error.message}`, 'bot');
    }
}

// ========================================
// Gemini API
// ========================================

async function sendToGemini(userMessage) {
    conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    const requestBody = {
        contents: conversationHistory,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    };

    const systemPrompt = buildSystemPrompt();
    if (systemPrompt) {
        requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API-Fehler');
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Keine Antwort erhalten');
    }

    const botResponse = data.candidates[0].content.parts[0].text;

    conversationHistory.push({
        role: 'model',
        parts: [{ text: botResponse }]
    });

    return botResponse;
}

// ========================================
// UI Functions
// ========================================

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    if (sender === 'bot') {
        messageDiv.innerHTML = `<p>${formatMessage(text)}</p>`;
    } else {
        messageDiv.textContent = text;
    }

    chatArea.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function addLoadingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message loading-message';
    messageDiv.innerHTML = `
        <div class="loading-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatArea.appendChild(messageDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageDiv;
}

function formatMessage(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Init
// ========================================

document.addEventListener('DOMContentLoaded', init);

/**
 * Configuration & Constants
 */

export const CONFIG = {
    GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
    DEFAULT_MODEL: 'llama-3.3-70b-versatile',

    // Storage Keys
    STORAGE_KEY: 'groq_api_key',
    MODEL_KEY: 'groq_model',
    MEMORY_KEY: 'chatbot_memory',
    MEMORY_ENABLED_KEY: 'chatbot_memory_enabled',
    PERSONALIZATION_KEY: 'chatbot_personalization',
    INCOGNITO_KEY: 'chatbot_incognito',
    CHATS_KEY: 'chatbot_chats',
    CURRENT_CHAT_KEY: 'chatbot_current_chat',

    SUMMARY_MODEL: 'openai/gpt-oss-20b'
};

export const DOM = {
    sendButton: document.getElementById('sendButton'),
    voiceInputBtn: document.getElementById('voiceInputBtn'),
    attachImageBtn: document.getElementById('attachImageBtn'),
    imageAttachment: document.getElementById('imageAttachment'),
    imagePreviewContainer: document.getElementById('imagePreviewContainer'),
    // Main Areas
    suggestionCards: document.body.querySelectorAll('.suggestion-pill'),
    chatMessages: document.getElementById('chatMessages'),
    chatArea: document.getElementById('chatArea'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    welcomeTitle: document.getElementById('welcomeTitle'),

    // Input
    messageInput: document.getElementById('messageInput'),
    sendButton: document.getElementById('sendButton'),

    // Navigation Buttons
    newChatButton: document.getElementById('newChatButton'),
    historyButton: document.getElementById('historyButton'),
    settingsButton: document.getElementById('settingsButton'),
    accountButton: document.getElementById('accountButton'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeModalBtn: document.getElementById('closeModal'),
    apiKeyInput: document.getElementById('groqApiKeyInput'),
    modelSelect: document.getElementById('modelSelect'),
    memoryToggle: document.getElementById('memoryToggle'),
    toggleVisibility: document.getElementById('toggleGroqVisibility'),
    saveSettingsBtn: document.getElementById('saveSettings'),
    cancelButton: document.getElementById('cancelButton'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    apiBanner: document.getElementById('apiBanner'),

    // Account Modal
    accountModal: document.getElementById('accountModal'),
    closeAccountModal: document.getElementById('closeAccountModal'),
    cancelAccountButton: document.getElementById('cancelAccountButton'),
    saveAccountSettings: document.getElementById('saveAccountSettings'),

    // History Modal
    historyModal: document.getElementById('historyModal'),
    closeHistoryModal: document.getElementById('closeHistoryModal'),
    chatList: document.getElementById('chatList'),

    // Personalization
    incognitoToggle: document.getElementById('incognitoToggle'),
    incognitoIcon: document.getElementById('incognitoIcon'),
    incognitoText: document.getElementById('incognitoText'),
    personalizationFields: document.getElementById('personalizationFields'),
    userNameInput: document.getElementById('userName'),
    userHobbiesInput: document.getElementById('userHobbies'),
    userInstructionsInput: document.getElementById('userInstructions'),
    userAboutInput: document.getElementById('userAbout'),

    // Suggestions
    suggestionCards: document.querySelectorAll('.suggestion-card')
};

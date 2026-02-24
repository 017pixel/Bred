import { PROVIDERS, getDefaultModel } from './providers.js';

export const CONFIG = {
    DEFAULT_PROVIDER: 'groq',
    SUMMARY_MODEL: 'llama-3.1-8b-instant',
    SUMMARY_PROVIDER: 'groq',

    STORAGE_KEYS: {
        PROVIDER_KEYS: 'bred_provider_keys',
        ACTIVE_PROVIDER: 'bred_active_provider',
        MODELS: 'bred_models',
        MEMORY: 'bred_memory',
        MEMORY_ENABLED: 'bred_memory_enabled',
        PERSONALIZATION: 'bred_personalization',
        INCOGNITO: 'bred_incognito',
        CHATS: 'bred_chats',
        CURRENT_CHAT: 'bred_current_chat'
    },

    get API_URLS() {
        const urls = {};
        Object.keys(PROVIDERS).forEach(id => {
            urls[id] = PROVIDERS[id].url;
        });
        return urls;
    }
};

export function initDOM() {
    return {
        sendButton: document.getElementById('sendButton'),
        messageInput: document.getElementById('messageInput'),
        chatMessages: document.getElementById('chatMessages'),
        chatArea: document.getElementById('chatArea'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        welcomeTitle: document.getElementById('welcomeTitle'),
        
        newChatButton: document.getElementById('newChatButton'),
        historyButton: document.getElementById('historyButton'),
        settingsButton: document.getElementById('settingsButton'),
        accountButton: document.getElementById('accountButton'),
        
        settingsModal: document.getElementById('settingsModal'),
        closeModalBtn: document.getElementById('closeModal'),
        saveSettingsBtn: document.getElementById('saveSettings'),
        cancelButton: document.getElementById('cancelButton'),
        openSettingsBtn: document.getElementById('openSettingsBtn'),
        apiBanner: document.getElementById('apiBanner'),
        
        accountModal: document.getElementById('accountModal'),
        closeAccountModal: document.getElementById('closeAccountModal'),
        cancelAccountButton: document.getElementById('cancelAccountButton'),
        saveAccountSettings: document.getElementById('saveAccountSettings'),
        
        historyModal: document.getElementById('historyModal'),
        closeHistoryModal: document.getElementById('closeHistoryModal'),
        chatList: document.getElementById('chatList'),
        
        incognitoToggle: document.getElementById('incognitoToggle'),
        incognitoIcon: document.getElementById('incognitoIcon'),
        incognitoText: document.getElementById('incognitoText'),
        personalizationFields: document.getElementById('personalizationFields'),
        userNameInput: document.getElementById('userName'),
        userHobbiesInput: document.getElementById('userHobbies'),
        userInstructionsInput: document.getElementById('userInstructions'),
        userAboutInput: document.getElementById('userAbout'),
        
        memoryToggle: document.getElementById('memoryToggle')
    };
}

export let DOM = null;

export function setDOM(domInstance) {
    DOM = domInstance;
}

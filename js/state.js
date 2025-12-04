/**
 * State Management
 */
import { CONFIG } from './config.js';

class StateManager {
    constructor() {
        this.apiKey = localStorage.getItem(CONFIG.STORAGE_KEY) || '';
        this.conversationHistory = [];
        this.allChats = this.loadChats();
        this.currentChatId = localStorage.getItem(CONFIG.CURRENT_CHAT_KEY) || null;
        this.personalization = this.loadPersonalization();
        this.isIncognito = localStorage.getItem(CONFIG.INCOGNITO_KEY) === 'true';
    }

    loadChats() {
        try {
            const stored = localStorage.getItem(CONFIG.CHATS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    }

    saveChats() {
        localStorage.setItem(CONFIG.CHATS_KEY, JSON.stringify(this.allChats));
    }

    loadPersonalization() {
        try {
            const stored = localStorage.getItem(CONFIG.PERSONALIZATION_KEY);
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

    savePersonalization(data) {
        this.personalization = data;
        localStorage.setItem(CONFIG.PERSONALIZATION_KEY, JSON.stringify(this.personalization));
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem(CONFIG.STORAGE_KEY, key);
    }

    setIncognito(value) {
        this.isIncognito = value;
        localStorage.setItem(CONFIG.INCOGNITO_KEY, value.toString());
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    createNewChat() {
        // Save current chat first if it exists and has content
        if (this.currentChatId && this.conversationHistory.length > 0) {
            this.saveCurrentChat();
        }

        const newId = this.generateChatId();
        this.currentChatId = newId;
        this.conversationHistory = [];

        this.allChats[newId] = {
            id: newId,
            history: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        localStorage.setItem(CONFIG.CURRENT_CHAT_KEY, newId);
        this.saveChats();
        return newId;
    }

    saveCurrentChat() {
        if (this.currentChatId) {
            this.allChats[this.currentChatId] = {
                ...this.allChats[this.currentChatId],
                history: this.conversationHistory,
                updatedAt: Date.now()
            };
            this.saveChats();
        }
    }

    deleteChat(chatId) {
        delete this.allChats[chatId];
        this.saveChats();

        if (chatId === this.currentChatId) {
            this.createNewChat();
            return true; // Indicates current chat was deleted
        }
        return false;
    }

    loadChat(chatId) {
        if (this.currentChatId && this.conversationHistory.length > 0) {
            this.saveCurrentChat();
        }

        const chat = this.allChats[chatId];
        if (!chat) return false;

        this.currentChatId = chatId;
        this.conversationHistory = chat.history || [];
        localStorage.setItem(CONFIG.CURRENT_CHAT_KEY, chatId);
        return true;
    }
}

export const state = new StateManager();

import { CONFIG } from './config.js';
import { db } from './db.js';

class StateManager {
    constructor() {
        this.apiKey = '';
        this.selectedModel = CONFIG.DEFAULT_MODEL;
        this.conversationHistory = [];
        this.allChats = {};
        this.currentChatId = null;
        this.personalization = {
            name: '',
            hobbies: '',
            instructions: '',
            about: ''
        };
        this.isIncognito = false;
        this.isMemoryEnabled = false;
        this.memory = '';
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        // Try to migrate from localStorage if IndexedDB is empty
        await this.migrateFromLocalStorage();

        // Load settings
        this.apiKey = await db.getSetting(CONFIG.STORAGE_KEY) || '';
        this.selectedModel = await db.getSetting(CONFIG.MODEL_KEY) || CONFIG.DEFAULT_MODEL;
        this.isIncognito = await db.getSetting(CONFIG.INCOGNITO_KEY) === true;
        this.isMemoryEnabled = await db.getSetting(CONFIG.MEMORY_ENABLED_KEY) === true;
        this.memory = await db.getSetting(CONFIG.MEMORY_KEY) || '';
        this.personalization = await db.getSetting(CONFIG.PERSONALIZATION_KEY) || this.personalization;

        // Load chats
        this.allChats = await db.getAllChats();
        this.currentChatId = await db.getSetting(CONFIG.CURRENT_CHAT_KEY) || null;

        if (this.currentChatId && this.allChats[this.currentChatId]) {
            this.conversationHistory = this.allChats[this.currentChatId].history || [];
        }

        this.isInitialized = true;
    }

    async migrateFromLocalStorage() {
        const hasLocalStorage = !!localStorage.getItem(CONFIG.STORAGE_KEY) || !!localStorage.getItem(CONFIG.CHATS_KEY);
        const hasIndexedDB = (await db.getAllChats() && Object.keys(await db.getAllChats()).length > 0) || !!(await db.getSetting(CONFIG.STORAGE_KEY));

        if (hasLocalStorage && !hasIndexedDB) {
            console.log('Migrating data from localStorage to IndexedDB...');

            // Migrate settings
            await db.setSetting(CONFIG.STORAGE_KEY, localStorage.getItem(CONFIG.STORAGE_KEY));
            await db.setSetting(CONFIG.MODEL_KEY, localStorage.getItem(CONFIG.MODEL_KEY));
            await db.setSetting(CONFIG.INCOGNITO_KEY, localStorage.getItem(CONFIG.INCOGNITO_KEY) === 'true');
            await db.setSetting(CONFIG.CURRENT_CHAT_KEY, localStorage.getItem(CONFIG.CURRENT_CHAT_KEY));

            try {
                const p = localStorage.getItem(CONFIG.PERSONALIZATION_KEY);
                if (p) await db.setSetting(CONFIG.PERSONALIZATION_KEY, JSON.parse(p));
            } catch (e) { }

            // Migrate chats
            try {
                const chatsStr = localStorage.getItem(CONFIG.CHATS_KEY);
                if (chatsStr) {
                    const chats = JSON.parse(chatsStr);
                    for (const id in chats) {
                        await db.saveChat(chats[id]);
                    }
                }
            } catch (e) { }

            // Clean up? Maybe leave it for now to be safe.
        }
    }

    async savePersonalization(data) {
        this.personalization = data;
        await db.setSetting(CONFIG.PERSONALIZATION_KEY, data);
    }

    async setApiKey(key) {
        this.apiKey = key;
        await db.setSetting(CONFIG.STORAGE_KEY, key);
    }

    async setModel(model) {
        this.selectedModel = model;
        await db.setSetting(CONFIG.MODEL_KEY, model);
    }

    async setIncognito(value) {
        this.isIncognito = value;
        await db.setSetting(CONFIG.INCOGNITO_KEY, value);
    }

    async setMemoryEnabled(value) {
        this.isMemoryEnabled = value;
        await db.setSetting(CONFIG.MEMORY_ENABLED_KEY, value);
    }

    async appendMemory(newMemory) {
        if (!newMemory) return;
        this.memory = this.memory ? this.memory + '\n' + newMemory : newMemory;
        // Keep memory concise? Maybe just append for now.
        await db.setSetting(CONFIG.MEMORY_KEY, this.memory);
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async createNewChat() {
        if (this.currentChatId && this.conversationHistory.length > 0) {
            await this.saveCurrentChat();
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

        await db.setSetting(CONFIG.CURRENT_CHAT_KEY, newId);
        await db.saveChat(this.allChats[newId]);
        return newId;
    }

    async saveCurrentChat() {
        if (this.currentChatId) {
            this.allChats[this.currentChatId] = {
                ...this.allChats[this.currentChatId],
                history: this.conversationHistory,
                updatedAt: Date.now(),
                wasSummarized: this.allChats[this.currentChatId]?.wasSummarized || false
            };
            await db.saveChat(this.allChats[this.currentChatId]);
        }
    }

    async markAsSummarized(chatId) {
        if (this.allChats[chatId]) {
            this.allChats[chatId].wasSummarized = true;
            await db.saveChat(this.allChats[chatId]);
        }
    }

    async deleteChat(chatId) {
        delete this.allChats[chatId];
        await db.deleteChat(chatId);

        if (chatId === this.currentChatId) {
            await this.createNewChat();
            return true;
        }
        return false;
    }

    async loadChat(chatId) {
        if (this.currentChatId && this.conversationHistory.length > 0) {
            await this.saveCurrentChat();
        }

        const chat = this.allChats[chatId];
        if (!chat) return false;

        this.currentChatId = chatId;
        this.conversationHistory = chat.history || [];
        await db.setSetting(CONFIG.CURRENT_CHAT_KEY, chatId);
        return true;
    }
}

export const state = new StateManager();

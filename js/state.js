import { CONFIG } from './config.js';
import { db } from './db.js';
import { PROVIDERS, getDefaultModel } from './providers.js';

class StateManager {
    constructor() {
        this.providerKeys = {
            groq: '',
            cerebras: '',
            nvidia: '',
            openrouter: ''
        };
        this.activeProvider = 'groq';
        this.selectedModels = {
            groq: 'llama-3.3-70b-versatile',
            cerebras: 'gpt-oss-120b',
            nvidia: 'meta/llama-3.3-70b-instruct',
            openrouter: 'meta-llama/llama-3.3-70b-instruct'
        };
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

        await this.migrateFromLocalStorage();

        this.providerKeys = await db.getSetting(CONFIG.STORAGE_KEYS.PROVIDER_KEYS) || this.providerKeys;
        this.activeProvider = await db.getSetting(CONFIG.STORAGE_KEYS.ACTIVE_PROVIDER) || 'groq';
        this.selectedModels = await db.getSetting(CONFIG.STORAGE_KEYS.MODELS) || this.selectedModels;
        this.isIncognito = await db.getSetting(CONFIG.STORAGE_KEYS.INCOGNITO) === true;
        this.isMemoryEnabled = await db.getSetting(CONFIG.STORAGE_KEYS.MEMORY_ENABLED) === true;
        this.memory = await db.getSetting(CONFIG.STORAGE_KEYS.MEMORY) || '';
        this.personalization = await db.getSetting(CONFIG.STORAGE_KEYS.PERSONALIZATION) || this.personalization;

        this.allChats = await db.getAllChats();
        this.currentChatId = await db.getSetting(CONFIG.STORAGE_KEYS.CURRENT_CHAT) || null;

        if (this.currentChatId && this.allChats[this.currentChatId]) {
            this.conversationHistory = this.allChats[this.currentChatId].history || [];
        }

        this.isInitialized = true;
    }

    async migrateFromLocalStorage() {
        const oldKey = localStorage.getItem('groq_api_key');
        const hasNewFormat = await db.getSetting(CONFIG.STORAGE_KEYS.PROVIDER_KEYS);
        
        if (oldKey && !hasNewFormat) {
            console.log('Migrating from old format...');
            this.providerKeys.groq = oldKey;
            await db.setSetting(CONFIG.STORAGE_KEYS.PROVIDER_KEYS, this.providerKeys);
            
            const oldModel = localStorage.getItem('groq_model');
            if (oldModel) {
                this.selectedModels.groq = oldModel;
                await db.setSetting(CONFIG.STORAGE_KEYS.MODELS, this.selectedModels);
            }
        }

        const hasLocalStorage = !!localStorage.getItem('groq_api_key') || !!localStorage.getItem('chatbot_chats');
        const hasIndexedDB = (await db.getAllChats() && Object.keys(await db.getAllChats()).length > 0);

        if (hasLocalStorage && !hasIndexedDB) {
            console.log('Migrating data from localStorage to IndexedDB...');

            await db.setSetting(CONFIG.STORAGE_KEYS.ACTIVE_PROVIDER, localStorage.getItem('bred_active_provider') || 'groq');
            await db.setSetting(CONFIG.STORAGE_KEYS.INCOGNITO, localStorage.getItem('chatbot_incognito') === 'true');
            await db.setSetting(CONFIG.STORAGE_KEYS.CURRENT_CHAT, localStorage.getItem('chatbot_current_chat'));
            await db.setSetting(CONFIG.STORAGE_KEYS.MEMORY_ENABLED, localStorage.getItem('chatbot_memory_enabled') === 'true');
            await db.setSetting(CONFIG.STORAGE_KEYS.MEMORY, localStorage.getItem('chatbot_memory') || '');

            try {
                const p = localStorage.getItem('chatbot_personalization');
                if (p) await db.setSetting(CONFIG.STORAGE_KEYS.PERSONALIZATION, JSON.parse(p));
            } catch (e) {}

            try {
                const chatsStr = localStorage.getItem('chatbot_chats');
                if (chatsStr) {
                    const chats = JSON.parse(chatsStr);
                    for (const id in chats) {
                        await db.saveChat(chats[id]);
                    }
                }
            } catch (e) {}
        }
    }

    get apiKey() {
        return this.providerKeys[this.activeProvider] || '';
    }

    get selectedModel() {
        return this.selectedModels[this.activeProvider] || getDefaultModel(this.activeProvider);
    }

    get apiUrl() {
        return PROVIDERS[this.activeProvider]?.url || '';
    }

    hasAnyKey() {
        return Object.values(this.providerKeys).some(key => key && key.trim() !== '');
    }

    async setProviderKey(provider, key) {
        this.providerKeys[provider] = key;
        await db.setSetting(CONFIG.STORAGE_KEYS.PROVIDER_KEYS, this.providerKeys);
    }

    async setActiveProvider(provider) {
        this.activeProvider = provider;
        await db.setSetting(CONFIG.STORAGE_KEYS.ACTIVE_PROVIDER, provider);
    }

    async setModel(provider, model) {
        this.selectedModels[provider] = model;
        await db.setSetting(CONFIG.STORAGE_KEYS.MODELS, this.selectedModels);
    }

    async savePersonalization(data) {
        this.personalization = data;
        await db.setSetting(CONFIG.STORAGE_KEYS.PERSONALIZATION, data);
    }

    async setIncognito(value) {
        this.isIncognito = value;
        await db.setSetting(CONFIG.STORAGE_KEYS.INCOGNITO, value);
    }

    async setMemoryEnabled(value) {
        this.isMemoryEnabled = value;
        await db.setSetting(CONFIG.STORAGE_KEYS.MEMORY_ENABLED, value);
    }

    async appendMemory(newMemory) {
        if (!newMemory) return;
        this.memory = this.memory ? this.memory + '\n' + newMemory : newMemory;
        await db.setSetting(CONFIG.STORAGE_KEYS.MEMORY, this.memory);
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

        await db.setSetting(CONFIG.STORAGE_KEYS.CURRENT_CHAT, newId);
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
        await db.setSetting(CONFIG.STORAGE_KEYS.CURRENT_CHAT, chatId);
        return true;
    }
}

export const state = new StateManager();

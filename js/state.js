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
        this.skills = {};
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

        this.skills = await db.getAllSkills();
        await this.loadBuiltInSkills();

        this.isInitialized = true;
    }

    async loadBuiltInSkills() {
        const builtInSkills = [
            {
                id: 'web-search',
                name: 'Web Suche',
                description: 'Im Internet nach aktuellen Informationen suchen mit DuckDuckGo',
                triggers: ['suche', 'im internet', 'aktuell', 'web search', 'online', 'recherchiere', 'was ist', 'wer ist', 'wie'],
                prompt: 'VERWENDE DIESE METHODE FÜR WEB-SUCHEN:\n\nUm eine Web-Suche durchzuführen, scrape die HTML-Version von DuckDuckGo:\nURL: https://duckduckgo.com/html/?q={search_terms}\n\nErsetze {search_terms} mit deiner URL-kodierten Suchanfrage.\nBeispiel: Suche nach "Python Tutorials" → https://duckduckgo.com/html/?q=Python+Tutorials\n\nAnalysiere die Ergebnisse und präsentiere dem Benutzer die wichtigsten Informationen mit Quellenangaben.',
                builtIn: true
            }
        ];

        for (const skill of builtInSkills) {
            if (!this.skills[skill.id]) {
                await db.saveSkill(skill);
                this.skills[skill.id] = skill;
            }
        }
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

    generateSkillId() {
        return 'skill_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async saveSkill(skillData) {
        const skill = {
            id: skillData.id || this.generateSkillId(),
            name: skillData.name,
            description: skillData.description,
            triggers: skillData.triggers || [],
            prompt: skillData.prompt || '',
            builtIn: false,
            createdAt: skillData.createdAt || Date.now()
        };
        await db.saveSkill(skill);
        this.skills[skill.id] = skill;
        return skill;
    }

    async deleteSkill(skillId) {
        const skill = this.skills[skillId];
        if (skill?.builtIn) return false;
        
        delete this.skills[skillId];
        await db.deleteSkill(skillId);
        return true;
    }

    getActiveSkills() {
        return Object.values(this.skills);
    }

    getSkillsPrompt() {
        const activeSkills = this.getActiveSkills();
        if (activeSkills.length === 0) return '';
        
        let prompt = '\n\n## Verfügbare Skills\n';
        
        for (const skill of activeSkills) {
            prompt += `\n### ${skill.name}\n`;
            prompt += `${skill.description}\n`;
            if (skill.triggers && skill.triggers.length > 0) {
                prompt += `Trigger: ${skill.triggers.join(', ')}\n`;
            }
            if (skill.prompt) {
                prompt += `${skill.prompt}\n`;
            }
        }
        
        prompt += '\nNutze diese Skills wenn der Benutzer danach fragt oder die Trigger-Wörter verwendet.';
        
        return prompt;
    }
}

export const state = new StateManager();

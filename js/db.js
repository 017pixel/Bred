/**
 * IndexedDB Database Handler
 */

const DB_NAME = 'GroqChatbotDB';
const DB_VERSION = 1;
const STORE_CHATS = 'chats';
const STORE_SETTINGS = 'settings';

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_CHATS)) {
                    db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                    db.createObjectStore(STORE_SETTINGS);
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                reject('IndexedDB error: ' + event.target.errorCode);
            };
        });
    }

    async setSetting(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_SETTINGS], 'readonly');
            const store = transaction.objectStore(STORE_SETTINGS);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllChats() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_CHATS], 'readonly');
            const store = transaction.objectStore(STORE_CHATS);
            const request = store.getAll();
            request.onsuccess = () => {
                const chats = {};
                request.result.forEach(chat => {
                    chats[chat.id] = chat;
                });
                resolve(chats);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async saveChat(chat) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_CHATS], 'readwrite');
            const store = transaction.objectStore(STORE_CHATS);
            const request = store.put(chat);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async deleteChat(chatId) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_CHATS], 'readwrite');
            const store = transaction.objectStore(STORE_CHATS);
            const request = store.delete(chatId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new Database();

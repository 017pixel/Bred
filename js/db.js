/**
 * IndexedDB Database Handler
 * 
 * IMPORTANT: When modifying this file, always follow these rules:
 * 1. Increment DB_VERSION when adding/removing/changing object stores
 * 2. Handle both upgrade AND existing database scenarios
 * 3. Never assume stores exist - always check before using
 * 4. Wrap all operations in try-catch for graceful error handling
 */

const DB_NAME = 'BreadAIDB';
const DB_VERSION = 2;
const DB_VERSION_KEY = 'bread_db_version';

const STORE_CHATS = 'chats';
const STORE_SETTINGS = 'settings';
const STORE_SKILLS = 'skills';

class Database {
    constructor() {
        this.db = null;
        this._initPromise = null;
    }

    async init() {
        if (this.db) return this.db;
        if (this._initPromise) return this._initPromise;

        this._initPromise = this._doInit();
        return this._initPromise;
    }

    async _checkVersionAndReset() {
        const storedVersion = localStorage.getItem(DB_VERSION_KEY);
        
        if (!storedVersion || parseInt(storedVersion) < DB_VERSION) {
            console.log('Database version changed or first run. Resetting...');
            await this.resetDatabase();
            localStorage.setItem(DB_VERSION_KEY, DB_VERSION.toString());
            return true;
        }
        return false;
    }

    async _doInit() {
        await this._checkVersionAndReset();
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('IndexedDB open error:', event.target.error);
                reject(new Error('IndexedDB error: ' + event.target.error));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB connected:', DB_NAME, 'v' + DB_VERSION);
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('IndexedDB upgrading from v' + event.oldVersion + ' to v' + DB_VERSION);

                if (!db.objectStoreNames.contains(STORE_CHATS)) {
                    db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
                    console.log('Created store:', STORE_CHATS);
                }

                if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
                    db.createObjectStore(STORE_SETTINGS);
                    console.log('Created store:', STORE_SETTINGS);
                }

                if (!db.objectStoreNames.contains(STORE_SKILLS)) {
                    db.createObjectStore(STORE_SKILLS, { keyPath: 'id' });
                    console.log('Created store:', STORE_SKILLS);
                }
            };
        });
    }

    async _ensureStore(storeName) {
        await this.init();
        
        if (!this.db.objectStoreNames.contains(storeName)) {
            console.warn('Store', storeName, 'does not exist. Recreating database...');
            await this.resetDatabase();
            await this.init();
        }
        
        return storeName;
    }

    async resetDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase(DB_NAME);
            
            request.onsuccess = () => {
                console.log('IndexedDB deleted:', DB_NAME);
                this.db = null;
                this._initPromise = null;
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB delete error:', event.target.error);
                reject(new Error('Failed to delete database: ' + event.target.error));
            };
            
            request.onblocked = () => {
                console.warn('IndexedDB delete blocked - connections still open');
            };
        });
    }

    async setSetting(key, value) {
        try {
            await this._ensureStore(STORE_SETTINGS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_SETTINGS], 'readwrite');
                const store = transaction.objectStore(STORE_SETTINGS);
                const request = store.put(value, key);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('setSetting error:', error);
            throw error;
        }
    }

    async getSetting(key) {
        try {
            await this._ensureStore(STORE_SETTINGS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_SETTINGS], 'readonly');
                const store = transaction.objectStore(STORE_SETTINGS);
                const request = store.get(key);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('getSetting error:', error);
            return undefined;
        }
    }

    async getAllChats() {
        try {
            await this._ensureStore(STORE_CHATS);
            
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
        } catch (error) {
            console.error('getAllChats error:', error);
            return {};
        }
    }

    async saveChat(chat) {
        try {
            await this._ensureStore(STORE_CHATS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_CHATS], 'readwrite');
                const store = transaction.objectStore(STORE_CHATS);
                const request = store.put(chat);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('saveChat error:', error);
            throw error;
        }
    }

    async deleteChat(chatId) {
        try {
            await this._ensureStore(STORE_CHATS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_CHATS], 'readwrite');
                const store = transaction.objectStore(STORE_CHATS);
                const request = store.delete(chatId);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('deleteChat error:', error);
            throw error;
        }
    }

    async getAllSkills() {
        try {
            await this._ensureStore(STORE_SKILLS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_SKILLS], 'readonly');
                const store = transaction.objectStore(STORE_SKILLS);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const skills = {};
                    request.result.forEach(skill => {
                        skills[skill.id] = skill;
                    });
                    resolve(skills);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('getAllSkills error:', error);
            return {};
        }
    }

    async saveSkill(skill) {
        try {
            await this._ensureStore(STORE_SKILLS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_SKILLS], 'readwrite');
                const store = transaction.objectStore(STORE_SKILLS);
                const request = store.put(skill);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('saveSkill error:', error);
            throw error;
        }
    }

    async deleteSkill(skillId) {
        try {
            await this._ensureStore(STORE_SKILLS);
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([STORE_SKILLS], 'readwrite');
                const store = transaction.objectStore(STORE_SKILLS);
                const request = store.delete(skillId);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('deleteSkill error:', error);
            throw error;
        }
    }
}

export const db = new Database();

if (typeof window !== 'undefined') {
    window.db = db;
}

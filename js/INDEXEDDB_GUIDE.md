# IndexedDB Guide for AI Agents

This document explains how the local browser storage works in BREAD AI and what rules must be followed to prevent.

---

## Overview errors

BREAD AI uses IndexedDB for persistent local storage in the browser. This is a NoSQL database that lives in the user's browser and persists across sessions.

### Database Name
```
BreadAIDB
```

### Current Version
```
2
```

---

## Object Stores

The database has 3 object stores:

### 1. `chats`
- **Purpose**: Stores all chat conversations
- **KeyPath**: `id` (unique chat ID)
- **Contains**: Chat history, timestamps, metadata
- **Access**: Via `db.getAllChats()`, `db.saveChat()`, `db.deleteChat()`

### 2. `settings`
- **Purpose**: Stores user settings (API keys, preferences)
- **KeyPath**: None (uses key parameter)
- **Contains**: Provider keys, models, memory, personalization
- **Access**: Via `db.setSetting(key, value)`, `db.getSetting(key)`

### 3. `skills`
- **Purpose**: Stores custom and built-in skills
- **KeyPath**: `id` (unique skill ID)
- **Contains**: Skill name, description, triggers, prompts
- **Access**: Via `db.getAllSkills()`, `db.saveSkill()`, `db.deleteSkill()`

---

## Critical Rules for Developers

### Rule 1: Always Increment DB_VERSION

When you modify the database schema (add/remove/change object stores), you MUST increment `DB_VERSION`:

```javascript
// BEFORE (version 2)
const DB_VERSION = 2;

// AFTER (version 3)
const DB_VERSION = 3;
```

**Why?** IndexedDB only runs the `onupgradeneeded` event when the version number is higher than what's stored in the browser. Without incrementing the version, new stores won't be created.

New stores are created in `onupgradeneeded` without deleting existing data. The upgrade path is additive:

```javascript
request.onupgradeneeded = (event) => {
    const db = event.target.result;

    if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
    }

    // ... additional stores
};
```

**Important:** Never reset the database on version changes. User chats and settings must survive upgrades.

### Rule 2: Check Before Using Stores

Never assume a store exists. The `db.js` file includes `_ensureStore()` which automatically checks and recreates the database if needed. Always use the wrapper methods:

```javascript
// WRONG - may fail if store doesn't exist
const store = this.db.transaction(['skills'], 'readonly');

// CORRECT - ensures store exists first
await this._ensureStore(STORE_SKILLS);
const store = this.db.transaction([STORE_SKILLS], 'readonly');
```

### Rule 3: Always Handle Errors

IndexedDB operations can fail for many reasons:
- Private browsing mode (some browsers)
- Storage quota exceeded
- Corrupted database

Always wrap operations in try-catch:

```javascript
async getAllSkills() {
    try {
        await this._ensureStore(STORE_SKILLS);
        // ... operation
    } catch (error) {
        console.error('getAllSkills error:', error);
        return {}; // Return safe default
    }
}
```

### Rule 4: Use the Reset Function Only for Debugging

If users experience issues, you can programmatically reset the database:

```javascript
import { db } from './db.js';

// Reset all data
await db.resetDatabase();
```

Or instruct users to:
1. Open DevTools (F12)
2. Go to Application > Storage > IndexedDB
3. Right-click "BreadAIDB" and delete
4. Refresh the page

---

## Version History

| Version | Changes |
|---------|---------|
| 1 | Initial version with chats, settings, skills stores |
| 2 | Bug fixes, error handling, renamed DB to BreadAIDB, additive upgrade without data loss |

---

## Common Errors and Solutions

### Error: "IDBDatabase.transaction: 'skills' is not a known object store name"

**Cause**: The database was created with an older version that didn't include the 'skills' store.

**Solution**:
1. Increment `DB_VERSION` so `onupgradeneeded` creates the missing store
2. If issue persists, manually clear IndexedDB in DevTools

### Error: "The operation failed for an unknown reason"

**Cause**: Often happens in private browsing or when storage is full.

**Solution**: Use try-catch and provide fallback behavior.

### Error: Service Worker serves old JavaScript

**Cause**: Old version is cached.

**Solution**: Increment cache name in `sw.js` (e.g., `bread-ai-v13` to `bread-ai-v14`)

---

## Service Worker Cache

The service worker caches all application files. When deploying updates:

1. Change `CACHE_NAME` in `sw.js`
2. Users will get old cached version until:
   - They close and reopen the tab
   - They do a hard refresh (Ctrl+Shift+R)
   - The service worker updates automatically

---

## Testing Checklist

After any IndexedDB changes:

- [ ] Test in normal browser mode
- [ ] Test in incognito/private mode
- [ ] Test after manually clearing IndexedDB
- [ ] Test after hard refresh
- [ ] Verify all three stores exist in DevTools Application panel
- [ ] Test that skills, chats, and settings persist after refresh

---

## File Locations

- Database code: `js/db.js`
- State management: `js/state.js`
- Service worker: `sw.js`
- This guide: `js/INDEXEDDB_GUIDE.md`

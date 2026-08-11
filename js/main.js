import { state } from './state.js';
import { streamToAI, generateSummary } from './api.js';
import * as UI from './ui.js';
import { showProviderSelect, showModelSelect, closeBottomSheet } from './bottomsheet.js';
import { PROVIDERS } from './providers.js';
import { showSuccess, showError, showApiError } from './toast.js';

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/legacy/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.2.67/legacy/build/pdf.worker.min.mjs';

let attachedFiles = [];
let isSending = false;
let editingSkillId = null;
let slashDropdownVisible = false;

async function init() {
    await state.init();
    registerServiceWorker();
    setupEventListeners();

    if (state.currentChatId && state.allChats[state.currentChatId]) {
        UI.clearChatArea();
        state.conversationHistory.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            const text = msg.content || (msg.parts && msg.parts[0] && msg.parts[0].text) || '';
            UI.addMessage(text, sender);
        });

        if (state.conversationHistory.length > 0) {
            setTimeout(() => {
                const chatArea = document.getElementById('chatArea');
                chatArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }

    UI.updateBannerVisibility();
    UI.updateIncognitoUI();
    UI.updateWelcomeScreen();
    UI.updateProviderUI();
    ensureScrollState();

    const messageInput = document.getElementById('messageInput');
    messageInput?.focus();
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.error('SW registration failed:', err);
        });
    });
}

function setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const newChatButton = document.getElementById('newChatButton');
    const historyButton = document.getElementById('historyButton');
    const settingsButton = document.getElementById('settingsButton');
    const skillsButton = document.getElementById('skillsButton');
    const accountButton = document.getElementById('accountButton');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileInput = document.getElementById('fileInput');
    const apiKeyForm = document.getElementById('apiKeyForm');

    newChatButton?.addEventListener('click', handleNewChat);
    sendButton?.addEventListener('click', handleSendMessage);

    apiKeyForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        autoSaveSettings();
    });

    if (messageInput) {
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        messageInput.addEventListener('input', () => {
            autoResizeTextarea(messageInput);
        });
    }

    attachFileBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fileInput?.click();
    });

    fileInput?.addEventListener('change', handleFileSelect);

    settingsButton?.addEventListener('click', openSettings);
    openSettingsBtn?.addEventListener('click', openSettings);
    skillsButton?.addEventListener('click', openSkills);
    accountButton?.addEventListener('click', openAccount);
    historyButton?.addEventListener('click', openHistory);

    setupSettingsListeners();
    setupAccountListeners();
    setupHistoryListeners();
    setupSkillsListeners();
    setupSlashCommands();
    setupModalClosers();
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function ensureScrollState() {
    const chatMessages = document.getElementById('chatMessages');
    const chatArea = document.getElementById('chatArea');
    if (!chatMessages) return;

    const hasStateMessages = state.conversationHistory && state.conversationHistory.length > 0;
    const hasDOMMessages = chatArea && chatArea.children.length > 0;
    const hasMessages = hasStateMessages || hasDOMMessages;

    chatMessages.classList.toggle('has-welcome', !hasMessages);
    chatMessages.classList.toggle('no-scroll', !hasMessages);

    if (hasMessages) {
        chatMessages.style.overflowY = 'auto';
    } else {
        chatMessages.style.overflowY = 'hidden';
    }
}

// ========================================
// File Attachments
// ========================================

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    const attachedFilesEl = document.getElementById('attachedFiles');

    files.forEach(file => {
        readAttachment(file).then(attachment => {
            attachedFiles.push(attachment);
            renderAttachmentChip(attachment);
        }).catch(err => {
            showError(err.message);
        });
    });

    if (attachedFiles.length > 0) {
        attachedFilesEl?.classList.add('has-files');
    }

    e.target.value = '';
}

async function readAttachment(file) {
    if (file.size > MAX_ATTACHMENT_SIZE) {
        throw new Error(`${file.name} ist zu groß (max. 10MB)`);
    }

    if (file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataURL(file);
        return { type: 'image', file, name: file.name, dataUrl };
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const content = await extractPdfText(file);
        return { type: 'text', file, name: file.name, content };
    }

    if (file.type.startsWith('text/') || /\.(txt|md|json|csv)$/i.test(file.name)) {
        const content = await file.text();
        return { type: 'text', file, name: file.name, content };
    }

    throw new Error(`${file.name}: Dateityp wird nicht unterstützt`);
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`${file.name} konnte nicht gelesen werden`));
        reader.readAsDataURL(file);
    });
}

async function extractPdfText(file) {
    try {
        const pdfjsLib = await import(PDFJS_CDN);
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

        let text = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }

        const trimmed = text.trim();
        if (!trimmed) {
            throw new Error('Kein Text gefunden');
        }
        return trimmed;
    } catch (err) {
        console.warn('PDF extraction failed:', err);
        if (err?.message === 'Kein Text gefunden') {
            throw new Error(`${file.name}: Kein Text in der PDF gefunden`);
        }
        throw new Error(`${file.name}: PDF konnte nicht gelesen werden`);
    }
}

function renderAttachmentChip(attachment) {
    const attachedFilesEl = document.getElementById('attachedFiles');

    const fileEl = document.createElement('div');
    fileEl.className = 'attached-file';
    fileEl.dataset.fileName = attachment.name;
    fileEl.innerHTML = `
        <span class="material-symbols-outlined" style="font-size: 16px; color: var(--accent-primary);">${getFileIcon(attachment)}</span>
        <span class="attached-file-name">${escapeHtml(attachment.name)}</span>
        <button class="attached-file-remove" title="Entfernen" aria-label="Datei entfernen">
            <span class="material-symbols-outlined">close</span>
        </button>
    `;

    fileEl.querySelector('.attached-file-remove').addEventListener('click', () => {
        attachedFiles = attachedFiles.filter(f => f !== attachment);
        fileEl.remove();
        if (attachedFiles.length === 0) {
            attachedFilesEl?.classList.remove('has-files');
        }
    });

    attachedFilesEl?.appendChild(fileEl);
    attachedFilesEl?.classList.add('has-files');
}

function getFileIcon(attachment) {
    if (attachment.type === 'image') return 'image';
    if (attachment.file.type === 'application/pdf') return 'picture_as_pdf';
    return 'description';
}

// ========================================
// Settings Modal
// ========================================

function setupSettingsListeners() {
    const closeModalBtn = document.getElementById('closeModal');
    const cancelButton = document.getElementById('cancelButton');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const providerSelectBtn = document.getElementById('providerSelectBtn');
    const modelSelectBtn = document.getElementById('modelSelectBtn');
    const toggleVisibility = document.getElementById('toggleApiKeyVisibility');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const memoryToggle = document.getElementById('memoryToggle');

    closeModalBtn?.addEventListener('click', closeSettings);
    cancelButton?.addEventListener('click', closeSettings);
    saveSettingsBtn?.addEventListener('click', () => closeSettings());

    providerSelectBtn?.addEventListener('click', () => {
        showProviderSelect(state.activeProvider, async (providerId) => {
            await state.setActiveProvider(providerId);
            UI.updateProviderUI();
            autoSaveSettings();
        });
    });

    modelSelectBtn?.addEventListener('click', () => {
        showModelSelect(state.activeProvider, state.selectedModel, async (modelId) => {
            await state.setModel(state.activeProvider, modelId);
            UI.updateProviderUI();
            autoSaveSettings();
        });
    });

    toggleVisibility?.addEventListener('click', () => {
        const isPassword = apiKeyInput?.type === 'password';
        if (apiKeyInput) apiKeyInput.type = isPassword ? 'text' : 'password';
        const icon = toggleVisibility.querySelector('.material-symbols-outlined');
        if (icon) icon.textContent = isPassword ? 'visibility_off' : 'visibility';
        toggleVisibility.setAttribute('aria-label', isPassword ? 'API-Key verbergen' : 'API-Key anzeigen');
    });

    apiKeyInput?.addEventListener('input', debounce(autoSaveSettings, 500));

    memoryToggle?.addEventListener('change', async () => {
        await state.setMemoryEnabled(memoryToggle.checked);
        showSuccess('Gedächtnis ' + (memoryToggle.checked ? 'aktiviert' : 'deaktiviert'));
    });
}

function setupAccountListeners() {
    const closeAccountModal = document.getElementById('closeAccountModal');
    const cancelAccountButton = document.getElementById('cancelAccountButton');
    const saveAccountSettings = document.getElementById('saveAccountSettings');
    const incognitoToggle = document.getElementById('incognitoToggle');
    const userNameInput = document.getElementById('userName');
    const userHobbiesInput = document.getElementById('userHobbies');
    const userInstructionsInput = document.getElementById('userInstructions');
    const userAboutInput = document.getElementById('userAbout');

    closeAccountModal?.addEventListener('click', closeAccount);
    cancelAccountButton?.addEventListener('click', closeAccount);
    saveAccountSettings?.addEventListener('click', () => closeAccount());

    incognitoToggle?.addEventListener('change', async () => {
        await state.setIncognito(!incognitoToggle.checked);
        UI.updateIncognitoUI();
        UI.updateWelcomeScreen();
        autoSaveAccount();
    });

    userNameInput?.addEventListener('input', debounce(autoSaveAccount, 500));
    userHobbiesInput?.addEventListener('input', debounce(autoSaveAccount, 500));
    userInstructionsInput?.addEventListener('input', debounce(autoSaveAccount, 500));
    userAboutInput?.addEventListener('input', debounce(autoSaveAccount, 500));
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function autoSaveSettings() {
    const apiKeyInput = document.getElementById('apiKeyInput');
    const memoryToggle = document.getElementById('memoryToggle');

    const apiKey = apiKeyInput?.value.trim() || '';
    await state.setProviderKey(state.activeProvider, apiKey);

    if (memoryToggle) {
        await state.setMemoryEnabled(memoryToggle.checked);
    }

    UI.updateBannerVisibility();
}

async function autoSaveAccount() {
    const userNameInput = document.getElementById('userName');
    const userHobbiesInput = document.getElementById('userHobbies');
    const userInstructionsInput = document.getElementById('userInstructions');
    const userAboutInput = document.getElementById('userAbout');
    const incognitoToggle = document.getElementById('incognitoToggle');

    await state.savePersonalization({
        name: userNameInput?.value.trim() || '',
        hobbies: userHobbiesInput?.value.trim() || '',
        instructions: userInstructionsInput?.value.trim() || '',
        about: userAboutInput?.value.trim() || ''
    });

    if (incognitoToggle) {
        await state.setIncognito(!incognitoToggle.checked);
    }

    UI.updateWelcomeScreen();
}

// ========================================
// Skills Modal
// ========================================

function setupSkillsListeners() {
    const closeSkillsModal = document.getElementById('closeSkillsModal');
    const addSkillBtn = document.getElementById('addSkillBtn');
    const closeSkillEditor = document.getElementById('closeSkillEditor');
    const cancelSkillEdit = document.getElementById('cancelSkillEdit');
    const saveSkill = document.getElementById('saveSkill');

    closeSkillsModal?.addEventListener('click', closeSkills);
    addSkillBtn?.addEventListener('click', () => openSkillEditor());
    closeSkillEditor?.addEventListener('click', closeSkillEditorModal);
    cancelSkillEdit?.addEventListener('click', closeSkillEditorModal);
    saveSkill?.addEventListener('click', saveSkillData);
}

function updateSkillsList() {
    const skillsList = document.getElementById('skillsList');
    if (!skillsList) return;

    const skills = state.getActiveSkills();

    if (skills.length === 0) {
        skillsList.innerHTML = `
            <div class="skills-empty">
                <span class="material-symbols-outlined">auto_awesome</span>
                <p>Noch keine Skills vorhanden</p>
            </div>
        `;
        return;
    }

    skillsList.innerHTML = skills.map(skill => `
        <div class="skill-item" data-skill-id="${skill.id}">
            <div class="skill-item-icon ${skill.builtIn ? 'built-in' : ''}">
                <span class="material-symbols-outlined">${skill.builtIn ? 'enhanced_encryption' : 'psychology'}</span>
            </div>
            <div class="skill-item-content">
                <div class="skill-item-name">${escapeHtml(skill.name)}</div>
                <div class="skill-item-description">${escapeHtml(skill.description || 'Keine Beschreibung')}</div>
            </div>
            ${skill.builtIn ? '<span class="skill-item-badge">Integriert</span>' : `
            <div class="skill-item-actions">
                <button class="edit-skill" title="Bearbeiten" aria-label="Skill bearbeiten">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="delete-skill" title="Löschen" aria-label="Skill löschen">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>`}
        </div>
    `).join('');

    skillsList.querySelectorAll('.skill-item').forEach(item => {
        const skillId = item.getAttribute('data-skill-id');
        const skill = skills.find(s => s.id === skillId);

        if (skill && !skill.builtIn) {
            item.querySelector('.edit-skill')?.addEventListener('click', (e) => {
                e.stopPropagation();
                openSkillEditor(skill);
            });

            item.querySelector('.delete-skill')?.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSkill(skillId);
            });
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function openSkillEditor(skill = null) {
    editingSkillId = skill?.id || null;
    const editor = document.getElementById('skillEditor');
    const title = document.getElementById('skillEditorTitle');
    const nameInput = document.getElementById('skillName');
    const descInput = document.getElementById('skillDescription');
    const triggerInput = document.getElementById('skillTrigger');
    const promptInput = document.getElementById('skillPrompt');

    if (title) title.textContent = skill ? 'Skill bearbeiten' : 'Neuer Skill';
    if (nameInput) nameInput.value = skill?.name || '';
    if (descInput) descInput.value = skill?.description || '';
    if (triggerInput) triggerInput.value = skill?.triggers?.join(', ') || '';
    if (promptInput) promptInput.value = skill?.prompt || '';

    if (editor) editor.style.display = 'block';
}

function closeSkillEditorModal() {
    const editor = document.getElementById('skillEditor');
    if (editor) editor.style.display = 'none';
    editingSkillId = null;
}

async function saveSkillData() {
    const nameInput = document.getElementById('skillName');
    const descInput = document.getElementById('skillDescription');
    const triggerInput = document.getElementById('skillTrigger');
    const promptInput = document.getElementById('skillPrompt');

    const name = nameInput?.value.trim();
    if (!name) {
        showError('Bitte gib einen Skill-Namen ein');
        return;
    }

    const triggers = triggerInput?.value.split(',').map(t => t.trim()).filter(t => t) || [];

    await state.saveSkill({
        id: editingSkillId,
        name,
        description: descInput?.value.trim() || '',
        triggers,
        prompt: promptInput?.value.trim() || ''
    });

    closeSkillEditorModal();
    updateSkillsList();
    showSuccess('Skill gespeichert');
}

async function deleteSkill(skillId) {
    const success = await state.deleteSkill(skillId);
    if (success) {
        updateSkillsList();
        showSuccess('Skill gelöscht');
    } else {
        showError('Integrierte Skills können nicht gelöscht werden');
    }
}

// ========================================
// Modals
// ========================================

function openSettings() {
    const settingsModal = document.getElementById('settingsModal');
    const memoryToggle = document.getElementById('memoryToggle');

    UI.updateProviderUI();
    UI.updateBannerVisibility();

    if (memoryToggle) memoryToggle.checked = state.isMemoryEnabled;

    settingsModal?.classList.add('active');
}

function closeSettings() {
    const settingsModal = document.getElementById('settingsModal');
    settingsModal?.classList.remove('active');
    showSuccess('Einstellungen gespeichert');
}

function openAccount() {
    const accountModal = document.getElementById('accountModal');
    const userNameInput = document.getElementById('userName');
    const userHobbiesInput = document.getElementById('userHobbies');
    const userInstructionsInput = document.getElementById('userInstructions');
    const userAboutInput = document.getElementById('userAbout');

    const p = state.personalization;
    if (userNameInput) userNameInput.value = p.name;
    if (userHobbiesInput) userHobbiesInput.value = p.hobbies;
    if (userInstructionsInput) userInstructionsInput.value = p.instructions;
    if (userAboutInput) userAboutInput.value = p.about;

    UI.updateIncognitoUI();
    accountModal?.classList.add('active');
}

function closeAccount() {
    const accountModal = document.getElementById('accountModal');
    accountModal?.classList.remove('active');
    showSuccess('Profil gespeichert');
}

function openSkills() {
    updateSkillsList();
    const skillsModal = document.getElementById('skillsModal');
    skillsModal?.classList.add('active');
}

function closeSkills() {
    const skillsModal = document.getElementById('skillsModal');
    skillsModal?.classList.remove('active');
}

function setupHistoryListeners() {
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    closeHistoryModal?.addEventListener('click', closeHistory);
}

function openHistory() {
    UI.updateChatList(loadChat, deleteChat);
    const historyModal = document.getElementById('historyModal');
    historyModal?.classList.add('active');
}

function closeHistory() {
    const historyModal = document.getElementById('historyModal');
    historyModal?.classList.remove('active');
}

function setupModalClosers() {
    const settingsModal = document.getElementById('settingsModal');
    const accountModal = document.getElementById('accountModal');
    const historyModal = document.getElementById('historyModal');
    const skillsModal = document.getElementById('skillsModal');

    settingsModal?.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });
    accountModal?.addEventListener('click', (e) => {
        if (e.target === accountModal) closeAccount();
    });
    historyModal?.addEventListener('click', (e) => {
        if (e.target === historyModal) closeHistory();
    });
    skillsModal?.addEventListener('click', (e) => {
        if (e.target === skillsModal) closeSkills();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;

        if (slashDropdownVisible) {
            hideSlashDropdown();
            return;
        }
        closeBottomSheet();
        if (settingsModal?.classList.contains('active')) closeSettings();
        if (accountModal?.classList.contains('active')) closeAccount();
        if (historyModal?.classList.contains('active')) closeHistory();
        if (skillsModal?.classList.contains('active')) closeSkills();
    });
}

async function loadChat(chatId) {
    await summarizeCurrentChat();
    if (await state.loadChat(chatId)) {
        UI.clearChatArea();

        state.conversationHistory.forEach(msg => {
            const sender = msg.role === 'user' ? 'user' : 'bot';
            const text = msg.content || (msg.parts && msg.parts[0] && msg.parts[0].text) || '';
            UI.addMessage(text, sender);
        });

        if (state.conversationHistory.length > 0) {
            setTimeout(() => {
                const chatArea = document.getElementById('chatArea');
                chatArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        closeHistory();
        ensureScrollState();
    }
}

async function deleteChat(chatId) {
    const isCurrent = await state.deleteChat(chatId);
    if (isCurrent) {
        UI.clearChatArea();
        UI.updateWelcomeScreen();
    }
    UI.updateChatList(loadChat, deleteChat);
}

async function handleNewChat() {
    await summarizeCurrentChat();
    await state.createNewChat();
    UI.clearChatArea();
    UI.updateWelcomeScreen();
    ensureScrollState();
    const messageInput = document.getElementById('messageInput');
    messageInput?.focus();
}

async function summarizeCurrentChat() {
    if (state.isMemoryEnabled &&
        state.conversationHistory.length >= 2 &&
        state.currentChatId &&
        !state.allChats[state.currentChatId]?.wasSummarized) {

        const summary = await generateSummary(state.conversationHistory);
        if (summary) {
            await state.appendMemory(summary);
            await state.markAsSummarized(state.currentChatId);
        }
    }
}

// ========================================
// Skill Execution Engine
// ========================================

function parseSkillInvocation(response) {
    if (!response) return null;

    const skillRegex = /\[SKILL:([^:\]]+)(?::([^\]]+))?\]/;
    const match = response.match(skillRegex);

    if (match) {
        return {
            skillId: match[1].trim(),
            params: match[2] ? match[2].trim() : ''
        };
    }

    return null;
}

async function executeSkill(skillId, params) {
    if (skillId === 'web-search') {
        return await executeWebSearchSkill(params);
    }

    const skill = state.getSkillById(skillId);
    if (skill && skill.prompt) {
        return {
            type: 'prompt-inject',
            context: `[Skill "${skill.name}" aktiviert]\n\n${skill.prompt}\n\nBenutzeranfrage: ${params}`
        };
    }

    return null;
}

async function executeWebSearchSkill(query) {
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    const ddgUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(CORS_PROXY + encodeURIComponent(ddgUrl));
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const results = [];
        doc.querySelectorAll('.result').forEach((result, index) => {
            if (index >= 5) return;
            const titleEl = result.querySelector('.result__a');
            const urlEl = result.querySelector('.result__url');
            const snippetEl = result.querySelector('.result__snippet');
            if (titleEl) {
                results.push({
                    title: titleEl.textContent.trim(),
                    url: urlEl ? urlEl.textContent.trim() : titleEl.href,
                    snippet: snippetEl ? snippetEl.textContent.trim() : ''
                });
            }
        });

        if (results.length > 0) {
            const resultText = results.map((r, i) => `${i+1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n');
            return {
                type: 'search-results',
                context: `Web-Suchergebnisse für "${query}":\n\n${resultText}`,
                results: results
            };
        }

        return await executeWebSearchFallback(query);
    } catch (error) {
        try {
            return await executeWebSearchFallback(query);
        } catch (fallbackError) {
            return { type: 'search-results', context: 'Web-Suche fehlgeschlagen: ' + error.message, results: [] };
        }
    }
}

async function executeWebSearchFallback(query) {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
    const data = await response.json();

    const results = [];

    if (data.Abstract) {
        results.push({
            title: data.Heading || query,
            url: data.AbstractURL || '',
            snippet: data.Abstract
        });
    }

    if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 4)) {
            if (topic.Text) {
                results.push({
                    title: topic.Text.split(' - ')[0] || '',
                    url: topic.FirstURL || '',
                    snippet: topic.Text
                });
            }
        }
    }

    if (results.length === 0) {
        return { type: 'search-results', context: `Keine detaillierten Ergebnisse für "${query}" gefunden. Bitte versuche eine spezifischere Suche.`, results: [] };
    }

    const resultText = results.map((r, i) => `${i+1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n');
    return {
        type: 'search-results',
        context: `Web-Suchergebnisse für "${query}":\n\n${resultText}`,
        results: results
    };
}

// ========================================
// Slash Command System
// ========================================

function setupSlashCommands() {
    const messageInput = document.getElementById('messageInput');
    const slashHint = document.getElementById('slashHint');
    if (!messageInput) return;

    messageInput.addEventListener('input', () => {
        const value = messageInput.value;
        const cursorPos = messageInput.selectionStart;

        const textBeforeCursor = value.substring(0, cursorPos);
        const slashMatch = textBeforeCursor.match(/\/(\S*)$/);

        if (slashHint) {
            if (textBeforeCursor.trim() === '/') {
                slashHint.classList.remove('hidden');
            } else if (!textBeforeCursor.includes('/')) {
                slashHint.classList.add('hidden');
            }
        }

        if (slashMatch && slashMatch[0].length <= 30) {
            const filter = slashMatch[1].toLowerCase();
            showSlashDropdown(filter);
        } else {
            hideSlashDropdown();
        }
    });

    messageInput.addEventListener('blur', () => {
        setTimeout(() => {
            hideSlashDropdown();
            const slashHint = document.getElementById('slashHint');
            if (slashHint && !messageInput.value.includes('/')) {
                slashHint.classList.add('hidden');
            }
        }, 200);
    });
}

function showSlashDropdown(filter) {
    const dropdown = document.getElementById('slashCommandDropdown');
    if (!dropdown) return;

    const allSkills = state.getActiveSkills();
    const filtered = allSkills.filter(skill => {
        const name = skill.name.toLowerCase();
        const id = skill.id.toLowerCase();
        const desc = (skill.description || '').toLowerCase();
        return name.includes(filter) || id.includes(filter) || desc.includes(filter);
    });

    if (filtered.length === 0) {
        hideSlashDropdown();
        return;
    }

    dropdown.innerHTML = filtered.map(skill => `
        <div class="slash-command-item" data-skill-id="${skill.id}" data-skill-name="${escapeHtml(skill.name)}">
            <div class="slash-command-icon ${skill.builtIn ? 'built-in' : ''}">
                <span class="material-symbols-outlined">${skill.builtIn ? 'enhanced_encryption' : 'psychology'}</span>
            </div>
            <div class="slash-command-info">
                <span class="slash-command-name">/${escapeHtml(skill.name)}</span>
                <span class="slash-command-desc">${escapeHtml(skill.description || '')}</span>
            </div>
            ${skill.builtIn ? '<span class="slash-command-badge">Integriert</span>' : ''}
        </div>
    `).join('');

    dropdown.classList.add('visible');
    slashDropdownVisible = true;

    dropdown.querySelectorAll('.slash-command-item').forEach(item => {
        item.addEventListener('click', () => {
            const skillName = item.getAttribute('data-skill-name');
            const messageInput = document.getElementById('messageInput');
            if (messageInput) {
                messageInput.value = `/${skillName} `;
                messageInput.focus();
                autoResizeTextarea(messageInput);
            }
            hideSlashDropdown();
        });
    });
}

function hideSlashDropdown() {
    const dropdown = document.getElementById('slashCommandDropdown');
    if (dropdown) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
    }
    slashDropdownVisible = false;
}

function extractSlashCommand(message) {
    const match = message.match(/^\/(\S+)\s+([\s\S]*)$/);
    if (match) {
        const commandName = match[1];
        const restOfMessage = match[2].trim();
        const skill = state.getSkillBySlashCommand(commandName);
        if (skill) {
            return { skill, message: restOfMessage };
        }
    }
    return null;
}

// ========================================
// Main Send Message Handler
// ========================================

async function handleSendMessage() {
    if (isSending) return;

    const messageInput = document.getElementById('messageInput');
    const message = messageInput?.value.trim();

    if (!message && attachedFiles.length === 0) return;

    hideSlashDropdown();

    if (!state.currentChatId) {
        await state.createNewChat();
    }

    const isFirstMessage = state.conversationHistory.length === 0;

    const slashCmd = extractSlashCommand(message);
    let displayMessage = message;

    if (!displayMessage && attachedFiles.length > 0) {
        displayMessage = attachedFiles.map(a => a.name).join(', ');
    }

    const images = attachedFiles.filter(a => a.type === 'image').map(a => a.dataUrl);
    UI.addMessage(displayMessage, 'user', images.length > 0 ? images : null);

    if (messageInput) {
        messageInput.value = '';
        autoResizeTextarea(messageInput);
    }

    const attachmentsSnapshot = [...attachedFiles];
    attachedFiles = [];
    const attachedFilesEl = document.getElementById('attachedFiles');
    if (attachedFilesEl) {
        attachedFilesEl.innerHTML = '';
        attachedFilesEl.classList.remove('has-files');
    }

    if (isFirstMessage) {
        const chatArea = document.getElementById('chatArea');
        chatArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        UI.updateWelcomeScreen();
        ensureScrollState();
    }

    if (!state.apiKey) {
        UI.addMessage('Bitte gib zuerst einen API-Key ein.', 'bot');
        openSettings();
        return;
    }

    isSending = true;
    const sendButton = document.getElementById('sendButton');
    if (sendButton) sendButton.disabled = true;

    const provider = PROVIDERS[state.activeProvider];
    const streamingMsg = UI.addStreamingMessage();
    let fullText = '';

    try {
        const userQuery = slashCmd ? slashCmd.message : message;

        if (slashCmd) {
            streamingMsg.remove();
            await runSkillExecution(slashCmd.skill.id, userQuery, userQuery, true);
            return;
        }

        const response = await streamToAI(userQuery, attachmentsSnapshot, (chunk) => {
            fullText += chunk;
            UI.updateStreamingMessage(streamingMsg, fullText);
        });

        const skillInvocation = parseSkillInvocation(response);
        if (skillInvocation) {
            streamingMsg.remove();
            // Skill-Tag-Antwort nicht in der Chat-History speichern
            state.conversationHistory.pop();
            await runSkillExecution(skillInvocation.skillId, skillInvocation.params, userQuery);
        } else {
            UI.finalizeStreamingMessage(streamingMsg, response);
            await state.saveCurrentChat();
        }
    } catch (error) {
        streamingMsg.remove();
        UI.addMessage(`Fehler: ${error.message}`, 'bot');
        showApiError(error, provider?.name || 'Provider');
    } finally {
        isSending = false;
        if (sendButton) sendButton.disabled = false;
        ensureScrollState();
    }
}

async function runSkillExecution(skillId, params, userQuery, isForced = false) {
    const skill = state.getSkillById(skillId);
    const skillName = skill ? skill.name : skillId;

    const skillIndicator = document.createElement('div');
    skillIndicator.className = 'message bot-message skill-indicator';
    skillIndicator.innerHTML = `
        <div class="skill-usage-badge">
            <span class="material-symbols-outlined">auto_awesome</span>
            <span>${escapeHtml(skillName)} wird verwendet...</span>
        </div>
    `;
    const chatArea = document.getElementById('chatArea');
    chatArea.appendChild(skillIndicator);

    const chatMessages = document.getElementById('chatMessages');
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const result = await executeSkill(skillId, params);
    skillIndicator.remove();

    if (!result) {
        UI.addMessage('Skill konnte nicht ausgeführt werden.', 'bot');
        await state.saveCurrentChat();
        return;
    }

    let followUp;
    if (result.type === 'search-results') {
        followUp = isForced
            ? `Der Benutzer hat explizit eine Web-Suche angefordert für: "${userQuery}"\n\nHier sind die Suchergebnisse:\n\n${result.context}\n\nBeantworte die Frage des Benutzers basierend auf diesen Ergebnissen. Verwende KEINEN [SKILL:...] Tag.`
            : `Hier sind die Ergebnisse der Web-Suche:\n\n${result.context}\n\nBeantworte jetzt die ursprüngliche Frage des Benutzers basierend auf diesen Suchergebnissen. Verwende KEINEN [SKILL:...] Tag mehr.`;
    } else if (result.type === 'prompt-inject') {
        followUp = result.context + '\n\nVerwende KEINEN [SKILL:...] Tag mehr.';
    }

    const streamingMsg = UI.addStreamingMessage();
    let fullText = '';

    try {
        const finalResponse = await streamToAI(followUp, [], (chunk) => {
            fullText += chunk;
            UI.updateStreamingMessage(streamingMsg, fullText);
        }, false);
        UI.finalizeStreamingMessage(streamingMsg, finalResponse);
        await state.saveCurrentChat();
    } catch (error) {
        streamingMsg.remove();
        UI.addMessage(`Fehler bei der Verarbeitung: ${error.message}`, 'bot');
        showApiError(error, 'Skill-Ausführung');
    }
}

document.addEventListener('DOMContentLoaded', init);

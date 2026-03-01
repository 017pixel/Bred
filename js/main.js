import { state } from './state.js';
import { sendToAI, generateSummary } from './api.js';
import * as UI from './ui.js';
import { showProviderSelect, showModelSelect, closeBottomSheet, updateBannerVisibility } from './bottomsheet.js';
import { PROVIDERS } from './providers.js';
import { showSuccess, showError, showApiError, showInfo } from './toast.js';

let currentProviderId = 'groq';
let attachedFiles = [];

async function init() {
    setupEventListeners();

    await state.init();

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

    updateBannerVisibility();
    UI.updateIncognitoUI();
    UI.updateWelcomeScreen();
    UI.updateProviderUI();
    ensureScrollState();
    
    const messageInput = document.getElementById('messageInput');
    messageInput?.focus();
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

    newChatButton?.addEventListener('click', handleNewChat);

    sendButton?.addEventListener('click', handleSendMessage);
    
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

    attachFileBtn?.addEventListener('click', () => {
        fileInput?.click();
    });

    fileInput?.addEventListener('change', handleFileSelect);

    const webSearchBtn = document.getElementById('webSearchBtn');
    webSearchBtn?.addEventListener('click', handleWebSearch);

    settingsButton?.addEventListener('click', openSettings);
    openSettingsBtn?.addEventListener('click', openSettings);
    skillsButton?.addEventListener('click', openSkills);
    accountButton?.addEventListener('click', openAccount);
    historyButton?.addEventListener('click', openHistory);

    setupSettingsListeners();
    setupAccountListeners();
    setupHistoryListeners();
    setupSkillsListeners();
    setupModalClosers();
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
}

function ensureScrollState() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const hasMessages = state.conversationHistory && state.conversationHistory.length > 0;
    chatMessages.classList.toggle('has-welcome', !hasMessages);
    chatMessages.classList.toggle('no-scroll', !hasMessages);
    
    if (hasMessages) {
        chatMessages.style.overflowY = 'auto';
    } else {
        chatMessages.style.overflowY = 'hidden';
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    const attachedFilesEl = document.getElementById('attachedFiles');
    
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            showError(`${file.name} ist zu groß (max. 10MB)`);
            return;
        }
        
        attachedFiles.push(file);
        
        const fileEl = document.createElement('div');
        fileEl.className = 'attached-file';
        fileEl.dataset.fileName = file.name;
        fileEl.innerHTML = `
            <span class="material-symbols-outlined" style="font-size: 16px; color: var(--accent-primary);">${getFileIcon(file.type)}</span>
            <span class="attached-file-name">${file.name}</span>
            <button class="attached-file-remove" title="Entfernen">
                <span class="material-symbols-outlined">close</span>
            </button>
        `;
        
        fileEl.querySelector('.attached-file-remove').addEventListener('click', () => {
            attachedFiles = attachedFiles.filter(f => f.name !== file.name);
            fileEl.remove();
            if (attachedFiles.length === 0) {
                attachedFilesEl?.classList.remove('has-files');
            }
        });
        
        attachedFilesEl?.appendChild(fileEl);
    });
    
    if (attachedFiles.length > 0) {
        attachedFilesEl?.classList.add('has-files');
    }
    
    e.target.value = '';
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('csv')) return 'description';
    return 'insert_drive_file';
}

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
            currentProviderId = providerId;
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
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
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

    updateBannerVisibility();
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

function setupHistoryListeners() {
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    closeHistoryModal?.addEventListener('click', closeHistory);
}

let editingSkillId = null;

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
                <button class="edit-skill" title="Bearbeiten">
                    <span class="material-symbols-outlined">edit</span>
                </button>
                <button class="delete-skill" title="Löschen">
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

function openSkills() {
    updateSkillsList();
    const skillsModal = document.getElementById('skillsModal');
    if (skillsModal) skillsModal.classList.add('active');
}

function closeSkills() {
    const skillsModal = document.getElementById('skillsModal');
    skillsModal?.classList.remove('active');
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
        if (e.key === 'Escape') {
            closeBottomSheet();
            if (settingsModal?.classList.contains('active')) closeSettings();
            if (accountModal?.classList.contains('active')) closeAccount();
            if (historyModal?.classList.contains('active')) closeHistory();
            if (skillsModal?.classList.contains('active')) closeSkills();
        }
    });
}

async function handleWebSearch() {
    const messageInput = document.getElementById('messageInput');
    const query = messageInput?.value.trim();
    
    if (!query) {
        showError('Bitte gib einen Suchbegriff ein');
        return;
    }

    const webSearchBtn = document.getElementById('webSearchBtn');
    webSearchBtn.disabled = true;
    webSearchBtn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span>';

    const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    try {
        const response = await fetch(searchUrl);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const results = [];
        const resultLinks = doc.querySelectorAll('.result__body, .result__snippet');
        
        doc.querySelectorAll('.result').forEach((result, index) => {
            if (index >= 5) return;
            
            const titleEl = result.querySelector('.result__a');
            const urlEl = result.querySelector('.result__url');
            const snippetEl = result.querySelector('.result__snippet');
            
            if (titleEl) {
                results.push({
                    title: titleEl.textContent,
                    url: urlEl ? urlEl.textContent.trim() : titleEl.href,
                    snippet: snippetEl ? snippetEl.textContent : ''
                });
            }
        });

        if (results.length === 0) {
            UI.addMessage(`Keine Ergebnisse für "${query}" gefunden.`, 'bot');
        } else {
            let responseText = `🔍 **Suchergebnisse für "${query}"**\n\n`;
            results.forEach((r, i) => {
                responseText += `${i + 1}. **${r.title}**\n`;
                responseText += `   ${r.url}\n`;
                if (r.snippet) {
                    responseText += `   ${r.snippet.substring(0, 150)}...\n`;
                }
                responseText += '\n';
            });
            responseText += 'Du kannst mir jetzt eine Frage zu diesen Ergebnissen stellen.';
            
            UI.addMessage(responseText, 'bot');
        }
        
    } catch (error) {
        showError('Suche fehlgeschlagen: ' + error.message);
        UI.addMessage('Die Web-Suche ist fehlgeschlagen. Bitte versuche es später erneut.', 'bot');
    }
    
    webSearchBtn.disabled = false;
    webSearchBtn.innerHTML = '<span class="material-symbols-outlined">search</span>';
}

async function handleSendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput?.value.trim();
    if (!message || message === '') return;

    if (!state.currentChatId) {
        await state.createNewChat();
    }

    const isFirstMessage = state.conversationHistory.length === 0;

    UI.addMessage(message, 'user');
    if (messageInput) {
        messageInput.value = '';
        autoResizeTextarea(messageInput);
    }
    
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

    const loadingMessage = UI.addLoadingMessage();
    const provider = PROVIDERS[state.activeProvider];

    try {
        const response = await sendToAI(message);
        loadingMessage.remove();
        UI.addMessage(response, 'bot');
        await state.saveCurrentChat();
    } catch (error) {
        loadingMessage.remove();
        UI.addMessage(`Fehler: ${error.message}`, 'bot');
        showApiError(error, provider?.name || 'Provider');
    }
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

        console.log('Generating summary for memory...');
        const summary = await generateSummary(state.conversationHistory);
        if (summary) {
            console.log('Summary generated:', summary);
            await state.appendMemory(summary);
            await state.markAsSummarized(state.currentChatId);
        }
    }
}

function openSettings() {
    const settingsModal = document.getElementById('settingsModal');
    const memoryToggle = document.getElementById('memoryToggle');
    
    currentProviderId = state.activeProvider;
    UI.updateProviderUI();
    UI.updateBannerForProvider();
    
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

function openHistory() {
    UI.updateChatList(loadChat, deleteChat);
    const historyModal = document.getElementById('historyModal');
    historyModal?.classList.add('active');
}

function closeHistory() {
    const historyModal = document.getElementById('historyModal');
    historyModal?.classList.remove('active');
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

document.addEventListener('DOMContentLoaded', init);

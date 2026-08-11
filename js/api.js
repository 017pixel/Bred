import { state } from './state.js';
import { PROVIDERS } from './providers.js';

const MAX_HISTORY_MESSAGES = 20;

function buildRequestMessages(userMessage, attachments = []) {
    const messages = [];

    const systemPrompt = buildSystemPrompt();
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    // Die User-Nachricht wird bewusst außerhalb der History angehängt,
    // damit Skill-Follow-up-Aufrufe (pushUser=false) die History nicht verändern.
    const history = state.conversationHistory.slice(-(MAX_HISTORY_MESSAGES - 1));
    messages.push(...history);
    messages.push({ role: 'user', content: buildUserContent(userMessage, attachments) });

    return messages;
}

function buildUserContent(userMessage, attachments) {
    const textFiles = attachments.filter(a => a.type === 'text');
    const images = attachments.filter(a => a.type === 'image');

    if (images.length > 0) {
        const parts = [];
        if (userMessage) {
            parts.push({ type: 'text', text: userMessage });
        }
        if (textFiles.length > 0) {
            parts.push({ type: 'text', text: formatTextFiles(textFiles) });
        }
        images.forEach(img => {
            parts.push({ type: 'image_url', image_url: { url: img.dataUrl } });
        });
        return parts;
    }

    let text = userMessage || '';
    if (textFiles.length > 0) {
        const fileBlock = formatTextFiles(textFiles);
        text = text ? `${text}\n\n${fileBlock}` : fileBlock;
    }
    return text;
}

function formatTextFiles(textFiles) {
    return textFiles
        .map(file => `[Datei: ${file.name}]\n${file.content}`)
        .join('\n\n');
}

function buildRequestBody(messages, stream) {
    const requestBody = {
        model: state.selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048
    };

    if (stream) {
        requestBody.stream = true;
    }

    return requestBody;
}

function getProviderHeaders(provider) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
    };

    if (provider.headers) {
        Object.assign(headers, provider.headers);
    }

    if (provider.id === 'openrouter') {
        headers['HTTP-Referer'] = window.location.origin;
    }

    return headers;
}

function getProvider() {
    const provider = PROVIDERS[state.activeProvider];
    if (!provider) {
        throw new Error('Provider nicht gefunden');
    }
    if (!state.apiKey) {
        throw new Error('Bitte gib zuerst einen API-Key ein.');
    }
    return provider;
}

async function parseErrorResponse(response, provider) {
    try {
        const errorData = await response.json();
        return errorData.error?.message || `${provider.name} API-Fehler (${response.status})`;
    } catch (e) {
        return `${provider.name} API-Fehler (${response.status})`;
    }
}

export async function sendToAI(userMessage, attachments = [], pushUser = true) {
    const provider = getProvider();

    if (pushUser) {
        state.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
    }

    const messages = buildRequestMessages(userMessage, attachments);

    const response = await fetch(provider.url, {
        method: 'POST',
        headers: getProviderHeaders(provider),
        body: JSON.stringify(buildRequestBody(messages, false))
    });

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response, provider));
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Keine Antwort erhalten');
    }

    const botResponse = data.choices[0].message.content;

    state.conversationHistory.push({
        role: 'assistant',
        content: botResponse
    });

    return botResponse;
}

export async function streamToAI(userMessage, attachments = [], onChunk, pushUser = true) {
    const provider = getProvider();

    if (pushUser) {
        state.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
    }

    const messages = buildRequestMessages(userMessage, attachments);

    const response = await fetch(provider.url, {
        method: 'POST',
        headers: getProviderHeaders(provider),
        body: JSON.stringify(buildRequestBody(messages, true))
    });

    if (!response.ok) {
        throw new Error(await parseErrorResponse(response, provider));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                    fullContent += content;
                    onChunk(content);
                }
            } catch (e) {
                // Unvollständige oder unerwartete SSE-Zeile ignorieren
            }
        }
    }

    state.conversationHistory.push({
        role: 'assistant',
        content: fullContent
    });

    return fullContent;
}

export async function generateSummary(conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return null;

    const summaryPrompt = {
        role: 'system',
        content: 'Fasse diesen Chatverlauf in maximal 2-3 Sätzen zusammen. Konzentriere dich auf wichtige Informationen über den Benutzer oder behandelte Themen, die für zukünftige Gespräche relevant sein könnten. Antworte NUR mit der Zusammenfassung.'
    };

    const provider = PROVIDERS['groq'];
    const apiKey = state.providerKeys['groq'];

    if (!apiKey) return null;

    try {
        const response = await fetch(provider.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [summaryPrompt, ...conversationHistory],
                temperature: 0.5,
                max_tokens: 200
            })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.choices[0]?.message?.content || null;
    } catch (e) {
        console.error('Summary generation failed', e);
        return null;
    }
}

function buildSystemPrompt() {
    if (state.isIncognito) {
        return null;
    }

    const parts = ["Du bist BREAD, ein hilfreicher und intelligenter KI-Assistent. Halte deine Antworten kurz und prägnant, es sei denn, der Benutzer fragt ausdrücklich nach Details.\n\n"];

    parts.push("## Antwort-Formatierung\n");
    parts.push("Verwende Markdown für deine Antworten:\n");
    parts.push("- **Fett** für wichtige Begriffe\n");
    parts.push("- *Kursiv* für Hervorhebung\n");
    parts.push("- `Code` für inline Code\n");
    parts.push("- ``` für Code-Blöcke (mit Sprache angeben, z.B. ```python)\n");
    parts.push("- ### für Überschriften\n");
    parts.push("--- für Trennlinien\n");
    parts.push("- Tabellen im Format:\n");
    parts.push("  | Spalte 1 | Spalte 2 |\n");
    parts.push("  |----------|----------|\n");
    parts.push("  | Inhalt   | Inhalt   |\n");
    parts.push("- > für Zitate\n");
    parts.push("- - oder 1. für Listen\n\n");

    const p = state.personalization;

    if (p.name) parts.push(`Der Name des Benutzers ist ${p.name}.`);
    if (p.hobbies) parts.push(`Hobbys und Interessen des Benutzers: ${p.hobbies}`);
    if (p.about) parts.push(`Weitere Informationen über den Benutzer: ${p.about}`);
    if (p.instructions) parts.push(`Spezielle Anweisungen: ${p.instructions}`);

    if (state.isMemoryEnabled && state.memory) {
        parts.push(`Hintergrundwissen aus vergangenen Chats:\n${state.memory}`);
    }

    const skillsPrompt = state.getSkillsPrompt();
    if (skillsPrompt) {
        parts.push(skillsPrompt);
    }

    return parts.join('\n');
}

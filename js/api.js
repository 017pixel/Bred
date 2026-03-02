import { state } from './state.js';
import { PROVIDERS } from './providers.js';

export async function sendToAI(userMessage) {
    state.conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    const messages = [];
    const systemPrompt = buildSystemPrompt();
    if (systemPrompt) {
        messages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    const historyContext = state.conversationHistory.slice(-20);
    messages.push(...historyContext);

    const provider = PROVIDERS[state.activeProvider];
    if (!provider) {
        throw new Error('Provider nicht gefunden');
    }

    const requestBody = {
        model: state.selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
    };

    if (provider.headers) {
        Object.assign(headers, provider.headers);
    }

    const response = await fetch(provider.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `${provider.name} API-Fehler (${response.status})`);
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

export async function generateSummary(conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return null;

    const summaryPrompt = {
        role: 'system',
        content: 'Fasse diesen Chatverlauf in maximal 2-3 Sätzen zusammen. Konzentriere dich auf wichtige Informationen über den Benutzer oder behandelte Themen, die für zukünftige Gespräche relevant sein könnten. Antworte NUR mit der Zusammenfassung.'
    };

    const messages = [summaryPrompt, ...conversationHistory];

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
                messages: messages,
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
        console.log('Skills-Prompt wird hinzugefügt, Länge:', skillsPrompt.length);
        parts.push(skillsPrompt);
    }

    const fullPrompt = parts.join('\n');
    console.log('System-Prompt aufgebaut, Gesamtlänge:', fullPrompt.length);
    return fullPrompt;
}

export async function streamToAI(userMessage, onChunk) {
    state.conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    const messages = [];
    const systemPrompt = buildSystemPrompt();
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    const historyContext = state.conversationHistory.slice(-20);
    messages.push(...historyContext);

    const provider = PROVIDERS[state.activeProvider];
    if (!provider) {
        throw new Error('Provider nicht gefunden');
    }

    const requestBody = {
        model: state.selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiKey}`
    };

    if (provider.headers) {
        Object.assign(headers, provider.headers);
    }

    const response = await fetch(provider.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `${provider.name} API-Fehler`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                    fullContent += content;
                    onChunk(content);
                }
            } catch (e) {}
        }
    }

    state.conversationHistory.push({
        role: 'assistant',
        content: fullContent
    });

    return fullContent;
}

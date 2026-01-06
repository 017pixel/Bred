/**
 * API Communication
 */
import { CONFIG } from './config.js';
import { state } from './state.js';

export async function sendToGroq(userMessage) {
    // Add user message to history
    state.conversationHistory.push({
        role: 'user',
        content: userMessage
    });

    const messages = [];

    // Add system prompt if not incognito
    const systemPrompt = buildSystemPrompt();
    if (systemPrompt) {
        messages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    // Add conversation history (up to last 20 messages for context)
    const historyContext = state.conversationHistory.slice(-20);
    messages.push(...historyContext);

    const requestBody = {
        model: state.selectedModel,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
    };

    const response = await fetch(CONFIG.GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Groq API-Fehler');
    }

    const data = await response.json();

    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Keine Antwort von Groq erhalten');
    }

    const botResponse = data.choices[0].message.content;

    // Add model response to history
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

    try {
        const response = await fetch(CONFIG.GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: JSON.stringify({
                model: CONFIG.SUMMARY_MODEL,
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

    const parts = ["Du bist Bred Version 2, ein hilfreicher und intelligenter KI-Assistent."];
    const p = state.personalization;

    if (p.name) parts.push(`Der Name des Benutzers ist ${p.name}.`);
    if (p.hobbies) parts.push(`Hobbys und Interessen des Benutzers: ${p.hobbies}`);
    if (p.about) parts.push(`Weitere Informationen über den Benutzer: ${p.about}`);
    if (p.instructions) parts.push(`Spezielle Anweisungen: ${p.instructions}`);

    // Add Memory if enabled
    if (state.isMemoryEnabled && state.memory) {
        parts.push(`Hintergrundwissen aus vergangenen Chats:\n${state.memory}`);
    }

    return parts.join('\n');
}

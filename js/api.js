/**
 * API Communication
 */
import { CONFIG } from './config.js';
import { state } from './state.js';

export async function sendToGemini(userMessage) {
    state.conversationHistory.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    const requestBody = {
        contents: state.conversationHistory,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    };

    const systemPrompt = buildSystemPrompt();
    if (systemPrompt) {
        requestBody.systemInstruction = {
            parts: [{ text: systemPrompt }]
        };
    }

    const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${state.apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API-Fehler');
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        throw new Error('Keine Antwort erhalten');
    }

    const botResponse = data.candidates[0].content.parts[0].text;

    state.conversationHistory.push({
        role: 'model',
        parts: [{ text: botResponse }]
    });

    return botResponse;
}

function buildSystemPrompt() {
    if (state.isIncognito) {
        return null;
    }

    const parts = [];
    const p = state.personalization;

    if (p.name) parts.push(`Der Name des Benutzers ist ${p.name}.`);
    if (p.hobbies) parts.push(`Hobbys und Interessen des Benutzers: ${p.hobbies}`);
    if (p.about) parts.push(`Weitere Informationen über den Benutzer: ${p.about}`);
    if (p.instructions) parts.push(`Spezielle Anweisungen: ${p.instructions}`);

    if (parts.length === 0) return null;

    return parts.join('\n');
}

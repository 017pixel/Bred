export const PROVIDERS = {
    groq: {
        id: 'groq',
        name: 'Groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        keyUrl: 'https://console.groq.com/keys',
        icon: 'bolt',
        color: '#f55036',
        models: [
            { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', category: 'Meta' },
            { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', category: 'Meta' },
            { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', category: 'OpenAI' },
            { id: 'openai/gpt-oss-20b', name: 'GPT OSS 20B', category: 'OpenAI' },
            { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', category: 'Meta' }
        ],
        defaultModel: 'llama-3.3-70b-versatile'
    },
    cerebras: {
        id: 'cerebras',
        name: 'Cerebras',
        url: 'https://api.cerebras.ai/v1/chat/completions',
        keyUrl: 'https://cloud.cerebras.ai',
        icon: 'speed',
        color: '#00d4aa',
        models: [
            { id: 'llama3.1-8b', name: 'Llama 3.1 8B', category: 'Meta' },
            { id: 'gpt-oss-120b', name: 'GPT OSS 120B', category: 'OpenAI' },
            { id: 'qwen-3-235b-a22b-instruct-2507', name: 'Qwen 3 235B', category: 'Qwen', preview: true },
            { id: 'zai-glm-4.7', name: 'GLM 4.7', category: 'Z.ai', preview: true }
        ],
        defaultModel: 'gpt-oss-120b'
    },
    nvidia: {
        id: 'nvidia',
        name: 'NVIDIA NIM',
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        keyUrl: 'https://build.nvidia.com',
        icon: 'memory',
        color: '#76b900',
        models: [
            { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', category: 'Meta' },
            { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct', category: 'Meta' },
            { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 397B', category: 'Qwen' },
            { id: 'z-ai/glm5', name: 'GLM 5', category: 'Z.ai' },
            { id: 'nvidia/nemotron-3-nano-30b-a3b', name: 'Nemotron 3 Nano 30B', category: 'NVIDIA' }
        ],
        defaultModel: 'meta/llama-3.3-70b-instruct'
    },
    openrouter: {
        id: 'openrouter',
        name: 'OpenRouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        keyUrl: 'https://openrouter.ai/keys',
        icon: 'hub',
        color: '#6366f1',
        models: [],
        defaultModel: 'meta-llama/llama-3.3-70b-instruct',
        headers: {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'BREAD AI'
        },
        categories: [
            { name: 'OpenAI', models: [
                { id: 'openai/gpt-4o', name: 'GPT-4o' },
                { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
                { id: 'openai/o1-preview', name: 'o1 Preview' },
                { id: 'openai/o1-mini', name: 'o1 Mini' }
            ]},
            { name: 'Anthropic', models: [
                { id: 'anthropic/claude-4.6-sonnet', name: 'Claude 4.6 Sonnet' },
                { id: 'anthropic/claude-4.5-sonnet', name: 'Claude 4.5 Sonnet' },
                { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku' }
            ]},
            { name: 'Google', models: [
                { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro' },
                { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash' },
                { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' }
            ]},
            { name: 'Meta', models: [
                { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
                { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B' },
                { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout' }
            ]},
            { name: 'DeepSeek', models: [
                { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
                { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3' }
            ]},
            { name: 'Mistral', models: [
                { id: 'mistralai/mistral-large-2411', name: 'Mistral Large' },
                { id: 'mistralai/mistral-small-24b-instruct-2501', name: 'Mistral Small 24B' }
            ]}
        ]
    }
};

export function getProvider(providerId) {
    return PROVIDERS[providerId] || null;
}

export function getAllProviders() {
    return Object.values(PROVIDERS);
}

export function getModelsForProvider(providerId) {
    const provider = PROVIDERS[providerId];
    if (!provider) return [];
    
    if (providerId === 'openrouter' && provider.categories) {
        const allModels = [];
        provider.categories.forEach(cat => {
            cat.models.forEach(model => {
                allModels.push({ ...model, category: cat.name });
            });
        });
        return allModels;
    }
    
    return provider.models || [];
}

export function getDefaultModel(providerId) {
    const provider = PROVIDERS[providerId];
    return provider ? provider.defaultModel : null;
}

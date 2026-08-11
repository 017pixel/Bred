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
            'X-Title': 'BREAD AI'
        },
        categories: [
            { name: 'OpenAI', models: [
                { id: 'openai/gpt-4.1', name: 'GPT-4.1' },
                { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini' },
                { id: 'openai/gpt-4o', name: 'GPT-4o' },
                { id: 'openai/o3-mini', name: 'o3 Mini' }
            ]},
            { name: 'Anthropic', models: [
                { id: 'anthropic/claude-sonnet-5', name: 'Claude Sonnet 5' },
                { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
                { id: 'anthropic/claude-opus-5', name: 'Claude Opus 5' }
            ]},
            { name: 'Google', models: [
                { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
                { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
                { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' }
            ]},
            { name: 'Meta', models: [
                { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
                { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick' },
                { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout' }
            ]},
            { name: 'DeepSeek', models: [
                { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1' },
                { id: 'deepseek/deepseek-chat-v3.1', name: 'DeepSeek V3.1' }
            ]},
            { name: 'Mistral', models: [
                { id: 'mistralai/mistral-small-3.2-24b-instruct', name: 'Mistral Small 3.2' },
                { id: 'mistralai/mistral-large-2411', name: 'Mistral Large' }
            ]}
        ]
    },
    'opencode-go': {
        id: 'opencode-go',
        name: 'OpenCode Go',
        url: 'https://opencode.ai/zen/go/v1/chat/completions',
        keyUrl: 'https://opencode.ai/auth',
        icon: 'rocket_launch',
        color: '#5aa7e0',
        models: [
            { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', category: 'DeepSeek' },
            { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', category: 'DeepSeek' },
            { id: 'glm-5.2', name: 'GLM 5.2', category: 'Z.ai' },
            { id: 'glm-5.1', name: 'GLM 5.1', category: 'Z.ai' },
            { id: 'kimi-k3', name: 'Kimi K3', category: 'Moonshot' },
            { id: 'kimi-k2.6', name: 'Kimi K2.6', category: 'Moonshot' },
            { id: 'kimi-k2.7-code', name: 'Kimi K2.7 Code', category: 'Moonshot' },
            { id: 'grok-4.5', name: 'Grok 4.5', category: 'xAI' },
            { id: 'mimo-v2.5', name: 'MiMo V2.5', category: 'Xiaomi' },
            { id: 'hy3', name: 'Hy3', category: 'DeepSeek' }
        ],
        defaultModel: 'deepseek-v4-flash'
    },
    'opencode-zen': {
        id: 'opencode-zen',
        name: 'OpenCode Zen',
        url: 'https://opencode.ai/zen/v1/chat/completions',
        keyUrl: 'https://opencode.ai/auth',
        icon: 'workspace_premium',
        color: '#8b7cf8',
        models: [
            { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', category: 'DeepSeek' },
            { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', category: 'DeepSeek' },
            { id: 'deepseek-v4-flash-free', name: 'DeepSeek V4 Flash Free', category: 'DeepSeek', free: true },
            { id: 'glm-5.2', name: 'GLM 5.2', category: 'Z.ai' },
            { id: 'glm-5.1', name: 'GLM 5.1', category: 'Z.ai' },
            { id: 'minimax-m3', name: 'MiniMax M3', category: 'MiniMax' },
            { id: 'minimax-m2.7', name: 'MiniMax M2.7', category: 'MiniMax' },
            { id: 'kimi-k3', name: 'Kimi K3', category: 'Moonshot' },
            { id: 'kimi-k2.6', name: 'Kimi K2.6', category: 'Moonshot' }
        ],
        defaultModel: 'deepseek-v4-flash'
    },
    mistral: {
        id: 'mistral',
        name: 'Mistral',
        url: 'https://api.mistral.ai/v1/chat/completions',
        keyUrl: 'https://console.mistral.ai',
        icon: 'air',
        color: '#ff7000',
        models: [
            { id: 'mistral-medium-2604', name: 'Mistral Medium 3.5', category: 'Mistral' },
            { id: 'mistral-large-2512', name: 'Mistral Large 3', category: 'Mistral' },
            { id: 'mistral-small-2603', name: 'Mistral Small 4', category: 'Mistral' },
            { id: 'codestral-2508', name: 'Codestral', category: 'Mistral' },
            { id: 'ministral-14b-2512', name: 'Ministral 3 14B', category: 'Mistral' },
            { id: 'ministral-8b-2512', name: 'Ministral 3 8B', category: 'Mistral' }
        ],
        defaultModel: 'mistral-medium-2604'
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

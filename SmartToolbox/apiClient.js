class APIClient {
    constructor() {
        this.maxRetries = CONFIG.API.MAX_RETRIES;
        this.timeout = CONFIG.API.TIMEOUT;
        this.requestCount = 0;
    }

    async callLLM(prompt, options = {}) {
        this.requestCount++;
        console.log(`API Request #${this.requestCount}: ${prompt.substring(0, 100)}...`);

        let retries = 0;
        let delay = 1000;

        while (retries <= this.maxRetries) {
            try {
                const response = await this.makeAPICall(prompt, options);
                console.log(`API Request #${this.requestCount} successful`);
                return response;
            } catch (error) {
                console.error(`API call failed (attempt ${retries + 1}/${this.maxRetries + 1}):`, error);
                
                if (retries >= this.maxRetries) {
                    console.error(`Max retries (${this.maxRetries}) reached. Giving up.`);
                    throw error;
                }
                
                await Utils.delay(delay);
                delay *= 2; // Exponential backoff
                retries++;
            }
        }
    }

    async makeAPICall(prompt, options) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('API timeout'));
            }, this.timeout);

            GM_xmlhttpRequest({
                method: 'POST',
                url: CONFIG.API.OPENAI_ENDPOINT,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.API.API_KEY}`
                },
                data: JSON.stringify({
                    model: options.model || CONFIG.API.DEFAULT_MODEL,
                    messages: [{ 
                        role: 'user', 
                        content: prompt 
                    }],
                    max_tokens: options.maxTokens || (options.endpoint === 'approaches' ? 300 : 1000),
                    temperature: options.temperature || CONFIG.API.DEFAULT_TEMPERATURE
                }),
                onload: (response) => {
                    clearTimeout(timeoutId);
                    
                    if (!response || response.status !== 200) {
                        reject(new Error(`API Error: ${response?.status || 'Unknown'} ${response?.statusText || ''}`));
                        return;
                    }

                    try {
                        const data = JSON.parse(response.responseText);
                        
                        if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                            reject(new Error("Received invalid or empty response from API"));
                            return;
                        }

                        const content = data.choices[0].message.content;
                        if (!content || content.trim() === '') {
                            reject(new Error("API returned empty content"));
                            return;
                        }

                        resolve(content);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse API response: ${parseError.message}`));
                    }
                },
                onerror: (error) => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Network error: ${error}`));
                },
                ontimeout: () => {
                    clearTimeout(timeoutId);
                    reject(new Error('Request timeout'));
                }
            });
        });
    }

    // Helper method for generating approaches
    async generateApproaches(userBuildInput) {
        const prompt = `
            Generate 3 different approaches for building "${userBuildInput}" using CAD tools.
            Use the following list of tools as reference:
            ${JSON.stringify(TOOL_ONTOLOGY)}

            Format your response as a JSON array with 3 objects, each with a single property 'approach'.
            Each approach description must be maximum 83 characters.

            Example format:
            [
                {"approach": "First approach description (max 83 chars)"},
                {"approach": "Second approach description (max 83 chars)"},
                {"approach": "Third approach description (max 83 chars)"}
            ]
        `;

        try {
            const content = await this.callLLM(prompt, { endpoint: 'approaches' });
            return Utils.safeJsonParse(content, this.getDefaultApproaches());
        } catch (error) {
            console.error("Error generating approaches:", error);
            return this.getDefaultApproaches();
        }
    }

    getDefaultApproaches() {
        return [
            {"approach": "Create using basic shapes then combine them for a unified structure."},
            {"approach": "Start with 2D sketches, then extrude into 3D forms for precision."},
            {"approach": "Begin with a base shape, then sculpt and refine with modeling tools."}
        ];
    }
}

// Make available globally
window.APIClient = APIClient;

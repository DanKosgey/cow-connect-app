/**
 * Test script to list available Gemini models using REST API
 */

const API_KEY = "AIzaSyAzgNdJjn1kgbpOuaEr2BbK4Q-EX7UQXsE";

async function listAvailableModels() {
    try {
        console.log("Fetching available models from Gemini API...\n");

        // Use the REST API to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log("=== AVAILABLE GEMINI MODELS ===\n");

        if (data.models && Array.isArray(data.models)) {
            for (const model of data.models) {
                console.log(`Model: ${model.name}`);
                console.log(`  Display Name: ${model.displayName || 'N/A'}`);
                console.log(`  Description: ${model.description || 'N/A'}`);
                console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(", ") || 'N/A'}`);
                console.log(`  Version: ${model.version || 'N/A'}`);
                console.log("");
            }

            // Filter models that support generateContent
            const contentModels = data.models.filter(m =>
                m.supportedGenerationMethods?.includes("generateContent")
            );

            console.log("\n=== MODELS SUPPORTING generateContent ===\n");
            contentModels.forEach(m => {
                const modelId = m.name.replace('models/', '');
                console.log(`✅ ${modelId}`);
            });

            console.log("\n=== RECOMMENDED FOR VISION/IMAGE TASKS ===\n");
            const visionModels = contentModels.filter(m =>
                m.name.includes("gemini") &&
                m.supportedGenerationMethods?.includes("generateContent")
            );

            visionModels.slice(0, 5).forEach(m => {
                const modelId = m.name.replace('models/', '');
                console.log(`🖼️  ${modelId}`);
                console.log(`    ${m.description || 'Vision-capable model'}`);
            });

        } else {
            console.log("No models found in response");
            console.log("Response:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listAvailableModels();

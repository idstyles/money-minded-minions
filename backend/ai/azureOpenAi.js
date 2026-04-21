const OpenAI = require("openai");
require("dotenv").config();

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { "api-version": '2024-02-15-preview' },
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY
  }
});

async function callLLM(payload) {
  
try {
    const response = await client.chat.completions.create(payload);

    // Explicit error checking (similar intent to Foundry snippet)
    if (!response || response.error) {
      throw new Error(response?.error?.message || "Unknown Azure OpenAI error");
    }

    return response;

  } catch (error) {
    console.error("Azure OpenAI call failed:", error.message);
    throw error;
  }
}

module.exports = { callLLM };
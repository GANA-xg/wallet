import type { AiProvider, InsightsRequest, InsightsResponse } from "./types";
import { analyze } from "./analyzer";

export interface LlmProviderConfig {
  provider: AiProvider;
  apiKey?: string;
  model?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#EF4444",
  shopping: "#8B5CF6",
  transport: "#3B82F6",
  entertainment: "#F59E0B",
  health: "#22C55E",
  housing: "#EC4899",
  utility: "#06B6D4",
  savings: "#22C55E",
  transfer: "#A855F7",
  reward: "#FCD34D",
};

function buildPrompt(data: InsightsRequest, localInsights: InsightsResponse): string {
  return `You are an AI financial advisor for the Indian digital wallet "Vault". 
Analyze the user's financial data below and generate personalized insights.

USER DATA:
- Balance: ₹${data.balance.toLocaleString("en-IN")}
- UPI Lite Balance: ₹${(data.upiLite ?? 0).toLocaleString("en-IN")}
- Month: ${data.month ?? "current"}
- Year: ${data.year ?? new Date().getFullYear()}

TRANSACTIONS (${data.transactions.length}):
${JSON.stringify(data.transactions, null, 2)}

BUDGETS:
${JSON.stringify(data.budgets, null, 2)}

RESERVED AMOUNTS:
${JSON.stringify(data.reservedAmounts, null, 2)}

LOCAL ANALYZER OUTPUT:
${JSON.stringify(localInsights, null, 2)}

Based on this data, provide 3 personalized financial recommendations. 
Each recommendation should have:
- icon: string (one of: "trending-down", "refresh-cw", "credit-card", "piggy-bank", "alert-triangle", "bar-chart", "trending-up", "dollar-sign", "target", "shield")
- title: short actionable title
- body: detailed explanation with specific amounts in Indian Rupees
- saving: expected monthly saving (e.g., "₹800/mo")
- color: hex color string
- priority: "high", "medium", or "low"

Return ONLY valid JSON array. No markdown, no explanation.
[
  {
    "icon": "trending-down",
    "title": "Actionable Title",
    "body": "Specific advice with ₹ amounts.",
    "saving": "₹XXX/mo",
    "color": "#HEX",
    "priority": "high"
  }
]`;
}

async function callOpenAI(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function callGemini(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model ?? "gemini-2.0-flash"}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callClaude(apiKey: string, prompt: string, model?: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: model ?? "claude-3-5-haiku-latest",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { content?: { text?: string }[] };
  return json.content?.[0]?.text ?? "";
}

function getEnvConfig(): LlmProviderConfig {
  const provider = (process.env.AI_PROVIDER ?? "local") as AiProvider;
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  const model = process.env.AI_MODEL;
  return { provider, apiKey, model };
}

export async function generateEnhancedInsights(
  request: InsightsRequest,
  localInsights: InsightsResponse,
): Promise<InsightsResponse> {
  const config = getEnvConfig();

  if (!config.apiKey || config.provider === "local") {
    return localInsights;
  }

  try {
    const prompt = buildPrompt(request, localInsights);
    let raw: string;

    switch (config.provider) {
      case "openai":
        raw = await callOpenAI(config.apiKey, prompt, config.model);
        break;
      case "gemini":
        raw = await callGemini(config.apiKey, prompt, config.model);
        break;
      case "claude":
        raw = await callClaude(config.apiKey, prompt, config.model);
        break;
      default:
        return localInsights;
    }

    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const llmRecommendations = JSON.parse(cleaned);

    if (Array.isArray(llmRecommendations)) {
      return {
        ...localInsights,
        recommendations: llmRecommendations,
        provider: "llm",
      };
    }

    return localInsights;
  } catch (error) {
    console.warn("LLM insight generation failed, falling back to local analyzer:", error);
    return localInsights;
  }
}

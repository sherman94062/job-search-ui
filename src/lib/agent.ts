import Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "./config";

export const anthropic = new Anthropic({
  apiKey: CONFIG.ANTHROPIC_API_KEY,
});

// SDK 0.51 types don't include 'adaptive' yet — cast required
export const THINKING_PARAM = {
  type: "adaptive",
} as unknown as { type: "enabled"; budget_tokens: number };

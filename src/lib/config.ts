export const CONFIG = {
  ANTHROPIC_API_KEY:   process.env.ANTHROPIC_API_KEY ?? "",
  MODEL:               "claude-sonnet-4-6",
  MAX_TOKENS:          8192,
  MAX_TOOL_ITERATIONS: 6,
  REMOTIVE_BASE_URL:   "https://remotive.com/api/remote-jobs",

  ADZUNA_APP_ID:  process.env.ADZUNA_APP_ID  ?? "",
  ADZUNA_APP_KEY: process.env.ADZUNA_APP_KEY ?? "",
  RAPIDAPI_KEY:   process.env.RAPIDAPI_KEY   ?? "",

  DEFAULT_LOCATION:  "Austin, Texas",
  DEFAULT_JOB_TYPE:  "full_time",
  DEFAULT_JOB_TITLE: "AI",

  PRICE_INPUT_PER_M:  3.00,
  PRICE_OUTPUT_PER_M: 15.00,
} as const;

// ── Remotive job shape ────────────────────────────────────────────────────────
export interface JobListing {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo: string;
  category: string;
  tags: string[];
  job_type: string;
  publication_date: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

export interface RemotiveResponse {
  "job-count": number;
  "total-job-count": number;
  jobs: JobListing[];
}

export interface JobCategory {
  name: string;
  slug: string;
}

export interface CategoriesResponse {
  jobs: JobCategory[];
}

// ── Chat display types ─────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface UsageInfo {
  input: number;
  output: number;
  cost: number;
}

// ── API message format (structurally matches Anthropic.MessageParam) ───────────
export type ContentPart =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; signature?: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface ApiMessage {
  role: "user" | "assistant";
  content: string | ContentPart[];
}

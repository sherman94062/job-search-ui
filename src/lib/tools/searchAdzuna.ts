import type { RegisteredTool } from "./registry";
import type { JobListing } from "@/lib/types";
import { CONFIG } from "@/lib/config";
import { jobCache } from "./searchJobs";

const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs/us/search/1";
const ADZUNA_OFFSET = 3_000_000;

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  created: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  contract_type?: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

function djb2(s: string, offset: number): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return offset + ((h >>> 0) % 900_000);
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "";
  if (min && max) return `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k`;
  if (min) return `$${Math.round(min / 1000)}k+`;
  return `up to $${Math.round((max ?? 0) / 1000)}k`;
}

function adzunaToJobListing(job: AdzunaJob): JobListing {
  return {
    id: djb2(job.id, ADZUNA_OFFSET),
    title: job.title,
    company_name: job.company.display_name,
    company_logo: "",
    category: "Engineering",
    tags: [],
    job_type: job.contract_type ?? "full_time",
    salary: formatSalary(job.salary_min, job.salary_max),
    candidate_required_location: job.location.display_name,
    url: job.redirect_url,
    publication_date: job.created,
    description: job.description,
  };
}

function formatJobSummary(job: JobListing, index: number): string {
  const salary  = job.salary || "salary not listed";
  const posted  = new Date(job.publication_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    `${index + 1}. [ID:${job.id}] ${job.title} — ${job.company_name}\n` +
    `   ${salary} | ${job.candidate_required_location} | ${job.job_type}\n` +
    `   Posted: ${posted}\n` +
    `   URL: ${job.url}`
  );
}

export const searchAdzunaTool: RegisteredTool = {
  definition: {
    name: "search_adzuna",
    description:
      "Search Adzuna for US job listings. Broad coverage of US job boards with good salary data. " +
      "Requires ADZUNA_APP_ID and ADZUNA_APP_KEY. " +
      "Use get_job_details to fetch full description for a specific job.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Job title or keywords e.g. 'forward deployed engineer', 'software engineer AI'",
        },
        location: {
          type: "string",
          description: "Location e.g. 'Austin Texas', 'New York'. Default: Austin Texas",
        },
        job_type: {
          type: "string",
          description: "Employment type: 'permanent', 'contract', 'part_time'. Default: permanent",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 10, max 20)",
        },
      },
      required: ["query"],
    },
  },

  async execute(input) {
    if (!CONFIG.ADZUNA_APP_ID || !CONFIG.ADZUNA_APP_KEY) {
      return "Adzuna requires ADZUNA_APP_ID and ADZUNA_APP_KEY — set them in .env.local. Falling back to other sources.";
    }

    const query    = String(input["query"] ?? "").trim();
    const location = input["location"] ? String(input["location"]) : "Austin Texas";
    const jobType  = input["job_type"] ? String(input["job_type"]) : undefined;
    const limit    = Math.min(Number(input["limit"] ?? 10), 20);

    const url = new URL(ADZUNA_BASE_URL);
    url.searchParams.set("app_id", CONFIG.ADZUNA_APP_ID);
    url.searchParams.set("app_key", CONFIG.ADZUNA_APP_KEY);
    url.searchParams.set("what", query);
    url.searchParams.set("where", location);
    url.searchParams.set("results_per_page", String(limit));
    url.searchParams.set("content-type", "application/json");
    if (jobType) url.searchParams.set("contract_type", jobType);

    let data: AdzunaResponse;
    try {
      const res = await fetch(url.toString());
      if (!res.ok) return `Adzuna API error: ${res.status} ${res.statusText}`;
      data = await res.json() as AdzunaResponse;
    } catch (err) {
      return `Network error: ${err instanceof Error ? err.message : String(err)}`;
    }

    const jobs = data.results.slice(0, limit);

    if (jobs.length === 0) {
      return `No jobs found on Adzuna for "${query}" in "${location}". Try broader keywords.`;
    }

    const listings = jobs.map(adzunaToJobListing);
    for (const job of listings) {
      jobCache.set(job.id, job);
    }

    const summaries = listings.map((j, i) => formatJobSummary(j, i)).join("\n\n");
    return `Found ${listings.length} jobs on Adzuna (${data.count} total) for "${query}" in "${location}":\n\n${summaries}`;
  },
};

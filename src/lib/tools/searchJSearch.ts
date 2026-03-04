import type { RegisteredTool } from "./registry";
import type { JobListing } from "@/lib/types";
import { CONFIG } from "@/lib/config";
import { jobCache } from "./searchJobs";

const JSEARCH_BASE_URL = "https://jsearch.p.rapidapi.com/search";
const JSEARCH_OFFSET = 4_000_000;

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo?: string;
  job_description: string;
  job_city?: string;
  job_state?: string;
  job_employment_type?: string;
  job_posted_at_datetime_utc?: string;
  job_apply_link: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_required_skills?: string[];
}

interface JSearchResponse {
  data: JSearchJob[];
  status: string;
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

function jsearchToJobListing(job: JSearchJob): JobListing {
  const location = [job.job_city, job.job_state].filter(Boolean).join(", ") || "Not specified";
  const skills = job.job_required_skills ?? [];
  return {
    id: djb2(job.job_id, JSEARCH_OFFSET),
    title: job.job_title,
    company_name: job.employer_name,
    company_logo: job.employer_logo ?? "",
    category: "Engineering",
    tags: skills.slice(0, 8),
    job_type: job.job_employment_type ?? "full_time",
    salary: formatSalary(job.job_min_salary, job.job_max_salary),
    candidate_required_location: location,
    url: job.job_apply_link,
    publication_date: job.job_posted_at_datetime_utc ?? new Date().toISOString(),
    description: job.job_description,
  };
}

function formatJobSummary(job: JobListing, index: number): string {
  const salary = job.salary || "salary not listed";
  const tags   = job.tags.slice(0, 6).join(", ") || "no skills listed";
  const posted = new Date(job.publication_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    `${index + 1}. [ID:${job.id}] ${job.title} — ${job.company_name}\n` +
    `   ${salary} | ${job.candidate_required_location} | ${job.job_type}\n` +
    `   Skills: ${tags}\n` +
    `   Posted: ${posted}\n` +
    `   URL: ${job.url}`
  );
}

export const searchJSearchTool: RegisteredTool = {
  definition: {
    name: "search_jsearch",
    description:
      "Search JSearch via RapidAPI — aggregates LinkedIn, Indeed, and Glassdoor. Most comprehensive source. " +
      "Requires RAPIDAPI_KEY. Include location inline in the query e.g. 'forward deployed engineer Austin TX'. " +
      "Use get_job_details to fetch full description for a specific job.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query including location e.g. 'forward deployed engineer Austin TX', 'software engineer AI remote'",
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
    if (!CONFIG.RAPIDAPI_KEY) {
      return "JSearch requires RAPIDAPI_KEY — set it in .env.local. Falling back to other sources.";
    }

    const query = String(input["query"] ?? "").trim();
    const limit = Math.min(Number(input["limit"] ?? 10), 20);

    const url = new URL(JSEARCH_BASE_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("page", "1");
    url.searchParams.set("num_pages", "1");

    let data: JSearchResponse;
    try {
      const res = await fetch(url.toString(), {
        headers: {
          "X-RapidAPI-Key":  CONFIG.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      if (!res.ok) return `JSearch API error: ${res.status} ${res.statusText}`;
      data = await res.json() as JSearchResponse;
    } catch (err) {
      return `Network error: ${err instanceof Error ? err.message : String(err)}`;
    }

    const jobs = (data.data ?? []).slice(0, limit);

    if (jobs.length === 0) {
      return `No jobs found on JSearch for "${query}". Try different keywords or location.`;
    }

    const listings = jobs.map(jsearchToJobListing);
    for (const job of listings) {
      jobCache.set(job.id, job);
    }

    const summaries = listings.map((j, i) => formatJobSummary(j, i)).join("\n\n");
    return `Found ${listings.length} jobs on JSearch (LinkedIn/Indeed/Glassdoor) for "${query}":\n\n${summaries}`;
  },
};

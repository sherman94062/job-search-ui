import type { RegisteredTool } from "./registry";
import type { JobListing, RemotiveResponse } from "../types";
import { CONFIG } from "../config";

// Module-level cache shared with getJobDetails
export const jobCache = new Map<number, JobListing>();

/** Strip HTML tags and decode common entities */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

function matchesLocation(jobLocation: string, filter: string): boolean {
  const loc = jobLocation.toLowerCase();
  const f   = filter.toLowerCase();

  if (!loc || loc.includes("worldwide") || loc.includes("anywhere") || loc.includes("global")) return true;
  if (loc.includes(f)) return true;

  const filterIsUSA =
    f.includes("texas") || f.includes("austin") ||
    f.includes("usa")   || f.includes("united states");
  if (filterIsUSA) {
    const usaTerms = ["usa", "united states", "us only", "north america", "americas", "remote us"];
    return usaTerms.some((t) => loc.includes(t));
  }

  return false;
}

function formatJobSummary(job: JobListing, index: number): string {
  const salary   = job.salary || "salary not listed";
  const location = job.candidate_required_location || "location not specified";
  const tags     = job.tags.slice(0, 6).join(", ") || "no tags";
  const posted   = new Date(job.publication_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    `${index + 1}. [ID:${job.id}] ${job.title} — ${job.company_name}\n` +
    `   ${salary} | ${location} | ${job.job_type}\n` +
    `   Tags: ${tags}\n` +
    `   Posted: ${posted}\n` +
    `   URL: ${job.url}`
  );
}

export const searchJobsTool: RegisteredTool = {
  definition: {
    name: "search_jobs",
    description:
      "Search remote job listings on Remotive by keyword. Returns a summary list of matching jobs with IDs. " +
      "Use get_job_details to fetch the full description for a specific job.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keywords e.g. 'machine learning engineer', 'typescript AI agent'",
        },
        category: {
          type: "string",
          description:
            "Optional Remotive category slug: " +
            "'software-dev', 'ai-ml', 'devops-sysadmin', 'data-analysis', 'product', 'design', 'marketing', 'customer-support'",
        },
        location_filter: {
          type: "string",
          description:
            "Filter results to jobs available from this location. " +
            "Worldwide and USA-open roles are always included for US locations. " +
            "Default: 'Austin, Texas'",
        },
        job_type: {
          type: "string",
          description:
            "Filter by employment type: 'full_time', 'contract', 'freelance', 'part_time'. Default: 'full_time'",
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
    const query          = String(input["query"] ?? "").trim();
    const category       = input["category"]        ? String(input["category"])        : undefined;
    const locationFilter = input["location_filter"] ? String(input["location_filter"]) : CONFIG.DEFAULT_LOCATION;
    const jobType        = input["job_type"]        ? String(input["job_type"])        : CONFIG.DEFAULT_JOB_TYPE;
    const limit          = Math.min(Number(input["limit"] ?? 10), 20);

    const url = new URL(CONFIG.REMOTIVE_BASE_URL);
    url.searchParams.set("search", query);
    if (category) url.searchParams.set("category", category);

    let data: RemotiveResponse;
    try {
      const res = await fetch(url.toString());
      if (!res.ok) return `Remotive API error: ${res.status} ${res.statusText}`;
      data = await res.json() as RemotiveResponse;
    } catch (err) {
      return `Network error: ${err instanceof Error ? err.message : String(err)}`;
    }

    let jobs = data.jobs.filter((j) => matchesLocation(j.candidate_required_location, locationFilter));
    if (jobType) jobs = jobs.filter((j) => !j.job_type || j.job_type === jobType);
    jobs = jobs.slice(0, limit);

    if (jobs.length === 0) {
      return (
        `No jobs found for "${query}" matching location "${locationFilter}" and type "${jobType}". ` +
        `Try broader keywords, a different category, or remove filters.`
      );
    }

    // Cache full listings for get_job_details
    for (const job of jobs) {
      jobCache.set(job.id, { ...job, description: stripHtml(job.description) });
    }

    const summaries = jobs.map((j, i) => formatJobSummary(j, i)).join("\n\n");
    return `Found ${jobs.length} jobs (${data["total-job-count"]} total on Remotive) for "${query}":\n\n${summaries}`;
  },
};

import type { RegisteredTool } from "./registry";
import type { JobListing } from "@/lib/types";
import { jobCache } from "./searchJobs";

const MUSE_BASE_URL = "https://www.themuse.com/api/public/jobs";
const MUSE_OFFSET = 2_000_000;

interface MuseJob {
  id: number;
  name: string;
  company: { name: string };
  locations: { name: string }[];
  categories: { name: string }[];
  levels: { name: string }[];
  publication_date: string;
  landing_page: string;
  contents: string;
}

interface MuseResponse {
  results: MuseJob[];
  total: number;
}

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

function museToJobListing(muse: MuseJob): JobListing {
  const numericId = MUSE_OFFSET + muse.id;
  const location = muse.locations.map((l) => l.name).join(", ") || "Not specified";
  const category = muse.categories.map((c) => c.name).join(", ") || "General";
  return {
    id: numericId,
    title: muse.name,
    company_name: muse.company.name,
    company_logo: "",
    category,
    tags: [...muse.categories.map((c) => c.name), ...muse.levels.map((l) => l.name)],
    job_type: "full_time",
    salary: "",
    candidate_required_location: location,
    url: muse.landing_page,
    publication_date: muse.publication_date,
    description: stripHtml(muse.contents),
  };
}

function formatJobSummary(job: JobListing, index: number): string {
  const posted = new Date(job.publication_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    `${index + 1}. [ID:${job.id}] ${job.title} — ${job.company_name}\n` +
    `   ${job.candidate_required_location} | ${job.category}\n` +
    `   Tags: ${job.tags.slice(0, 6).join(", ") || "none"}\n` +
    `   Posted: ${posted}\n` +
    `   URL: ${job.url}`
  );
}

export const searchMuseTool: RegisteredTool = {
  definition: {
    name: "search_muse",
    description:
      "Search The Muse for tech and startup job listings. No API key required. " +
      "Good for engineering, product, and design roles at startups and tech companies. " +
      "Use get_job_details to fetch full description for a specific job.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Title keywords to filter client-side e.g. 'forward deployed engineer', 'software engineer'",
        },
        category: {
          type: "string",
          description:
            "The Muse category name e.g. 'Engineering', 'Data Science', 'Product & Project Management'",
        },
        location: {
          type: "string",
          description: "Location filter e.g. 'Austin, TX', 'New York City, New York, US'",
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
    const query    = String(input["query"] ?? "").trim().toLowerCase();
    const category = input["category"] ? String(input["category"]) : undefined;
    const location = input["location"] ? String(input["location"]) : undefined;
    const limit    = Math.min(Number(input["limit"] ?? 10), 20);

    const url = new URL(MUSE_BASE_URL);
    url.searchParams.set("page", "0");
    url.searchParams.set("descending", "true");
    if (category) url.searchParams.set("category", category);
    if (location) url.searchParams.set("location", location);

    let data: MuseResponse;
    try {
      const res = await fetch(url.toString());
      if (!res.ok) return `The Muse API error: ${res.status} ${res.statusText}`;
      data = await res.json() as MuseResponse;
    } catch (err) {
      return `Network error: ${err instanceof Error ? err.message : String(err)}`;
    }

    // Client-side title filter
    let jobs = data.results;
    if (query) {
      jobs = jobs.filter((j) => j.name.toLowerCase().includes(query) || query.split(" ").some((w) => j.name.toLowerCase().includes(w)));
    }
    jobs = jobs.slice(0, limit);

    if (jobs.length === 0) {
      return `No jobs found on The Muse for "${query}". Try broader keywords or remove filters.`;
    }

    const listings = jobs.map(museToJobListing);
    for (const job of listings) {
      jobCache.set(job.id, job);
    }

    const summaries = listings.map((j, i) => formatJobSummary(j, i)).join("\n\n");
    return `Found ${listings.length} jobs on The Muse for "${query}":\n\n${summaries}`;
  },
};

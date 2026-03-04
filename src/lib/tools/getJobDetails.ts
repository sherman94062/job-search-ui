import type { RegisteredTool } from "./registry";
import { jobCache } from "./searchJobs";

export const getJobDetailsTool: RegisteredTool = {
  definition: {
    name: "get_job_details",
    description:
      "Get the full description and details for a specific job by its ID. " +
      "The job must have been returned by a previous search_jobs call.",
    input_schema: {
      type: "object",
      properties: {
        job_id: {
          type: "number",
          description: "The job ID from a previous search_jobs result (shown as [ID:XXXXX])",
        },
      },
      required: ["job_id"],
    },
  },

  async execute(input) {
    const jobId = Number(input["job_id"]);
    const job = jobCache.get(jobId);

    if (!job) {
      return `Job ID ${jobId} not found in cache. Run search_jobs first to find jobs, then use the ID shown in the results.`;
    }

    const salary   = job.salary || "Not listed";
    const location = job.candidate_required_location || "Not specified";
    const tags     = job.tags.join(", ") || "None listed";
    const posted   = new Date(job.publication_date).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    return [
      `# ${job.title}`,
      `**Company:** ${job.company_name}`,
      `**Category:** ${job.category}`,
      `**Type:** ${job.job_type}`,
      `**Salary:** ${salary}`,
      `**Location:** ${location}`,
      `**Tags:** ${tags}`,
      `**Posted:** ${posted}`,
      `**Apply:** ${job.url}`,
      ``,
      `## Description`,
      job.description.slice(0, 4000) + (job.description.length > 4000 ? "\n\n[…description truncated]" : ""),
    ].join("\n");
  },
};

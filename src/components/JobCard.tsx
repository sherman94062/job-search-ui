"use client";

import type { JobListing } from "@/lib/types";

interface Props {
  job: JobListing;
  onDetails: (jobId: number) => void;
}

export default function JobCard({ job, onDetails }: Props) {
  const salary   = job.salary || "Salary not listed";
  const location = job.candidate_required_location || "Worldwide";
  const posted   = new Date(job.publication_date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  const jobTypeLabel = job.job_type
    ? job.job_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Full-time";

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-accent/40 hover:bg-card-hover transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary font-semibold text-sm leading-snug truncate" title={job.title}>
            {job.title}
          </h3>
          <p className="text-text-muted text-xs mt-0.5">{job.company_name}</p>
        </div>
        <span className="text-[10px] text-text-muted bg-[#1e1e30] px-1.5 py-0.5 rounded font-mono shrink-0">
          #{job.id}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs mb-3">
        {job.salary && (
          <span className="text-success font-medium">{salary}</span>
        )}
        <span className="text-text-muted">{location}</span>
        <span className="text-text-muted">{jobTypeLabel}</span>
      </div>

      {/* Tags */}
      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {job.tags.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="text-[11px] bg-[#1a1a28] border border-[#2a2a3e] text-text-muted px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 6 && (
            <span className="text-[11px] text-text-muted px-1">+{job.tags.length - 6}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-muted">Posted {posted}</span>
        <div className="flex gap-2">
          <button
            onClick={() => onDetails(job.id)}
            className="text-[11px] text-text-muted hover:text-text-primary border border-border hover:border-accent/40 px-2 py-1 rounded transition-colors"
          >
            Details
          </button>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] bg-accent hover:bg-accent/80 text-white px-2.5 py-1 rounded transition-colors font-medium"
          >
            Apply ↗
          </a>
        </div>
      </div>
    </div>
  );
}

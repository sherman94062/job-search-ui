"use client";

import type { JobListing } from "@/lib/types";
import JobCard from "./JobCard";

interface Props {
  jobs: JobListing[];
  onDetails: (jobId: number) => void;
}

export default function JobsPanel({ jobs, onDetails }: Props) {
  return (
    <div className="flex flex-col h-full bg-panel border-l border-border">
      {/* Sticky header */}
      <div className="shrink-0 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Results</h2>
          {jobs.length > 0 && (
            <span className="text-xs text-text-muted bg-[#1e1e30] px-2 py-0.5 rounded-full">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Scrollable cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="text-3xl mb-3 opacity-30">🔍</div>
            <p className="text-text-muted text-sm">
              Ask me to find jobs and results will appear here.
            </p>
            <p className="text-text-muted text-xs mt-2 opacity-70">
              Try: &ldquo;find me Forward Deployed Engineer jobs&rdquo;
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} onDetails={onDetails} />
          ))
        )}
      </div>
    </div>
  );
}

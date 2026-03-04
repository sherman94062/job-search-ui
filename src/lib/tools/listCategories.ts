import type { RegisteredTool } from "./registry";
import type { CategoriesResponse } from "../types";
import { CONFIG } from "../config";

let categoriesCache: string | null = null;

export const listCategoriesTool: RegisteredTool = {
  definition: {
    name: "list_categories",
    description: "List all available remote job categories on Remotive, with their slugs for use in search_jobs.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  async execute(_input) {
    if (categoriesCache) return categoriesCache;

    let data: CategoriesResponse;
    try {
      const res = await fetch(`${CONFIG.REMOTIVE_BASE_URL}/categories`);
      if (!res.ok) return `Remotive API error: ${res.status} ${res.statusText}`;
      data = await res.json() as CategoriesResponse;
    } catch (err) {
      return `Network error: ${err instanceof Error ? err.message : String(err)}`;
    }

    const lines = data.jobs.map((c) => `  ${c.name.padEnd(25)} slug: "${c.slug}"`);
    categoriesCache = `Available Remotive job categories:\n\n${lines.join("\n")}`;
    return categoriesCache;
  },
};

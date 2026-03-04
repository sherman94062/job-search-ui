import { toolRegistry } from "./registry";
import { searchJobsTool } from "./searchJobs";
import { getJobDetailsTool } from "./getJobDetails";
import { listCategoriesTool } from "./listCategories";

toolRegistry.register(searchJobsTool);
toolRegistry.register(getJobDetailsTool);
toolRegistry.register(listCategoriesTool);

export { toolRegistry };

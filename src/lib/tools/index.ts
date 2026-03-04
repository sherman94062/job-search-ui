import { toolRegistry } from "./registry";
import { getJobDetailsTool } from "./getJobDetails";
import { searchMuseTool } from "./searchMuse";
import { searchAdzunaTool } from "./searchAdzuna";
import { searchJSearchTool } from "./searchJSearch";

toolRegistry.register(searchJSearchTool);
toolRegistry.register(searchMuseTool);
toolRegistry.register(searchAdzunaTool);
toolRegistry.register(getJobDetailsTool);

export { toolRegistry };

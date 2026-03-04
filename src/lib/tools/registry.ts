import type Anthropic from "@anthropic-ai/sdk";

export interface RegisteredTool {
  definition: Anthropic.Tool;
  execute: (input: Record<string, unknown>) => Promise<string>;
}

class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool): void {
    this.tools.set(tool.definition.name, tool);
  }

  definitions(): Anthropic.Tool[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(name: string, input: Record<string, unknown>): Promise<string> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool.execute(input);
  }
}

export const toolRegistry = new ToolRegistry();

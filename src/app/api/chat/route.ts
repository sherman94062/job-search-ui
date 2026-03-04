import type Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "@/lib/config";
import { anthropic, THINKING_PARAM } from "@/lib/agent";
import { toolRegistry } from "@/lib/tools/index";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { jobCache } from "@/lib/tools/searchJobs";
import type { ApiMessage } from "@/lib/types";

export async function POST(req: Request) {
  let body: { messages?: ApiMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("ANTHROPIC_API_KEY is not set", { status: 500 });
  }

  // Clone so we can mutate during the agent loop without affecting the caller's array
  const messages: Anthropic.MessageParam[] = (body.messages ?? []) as Anthropic.MessageParam[];

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  async function write(event: string, data: unknown): Promise<void> {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(chunk));
  }

  // Fire-and-forget — return Response immediately
  (async () => {
    try {
      const usage = { input_tokens: 0, output_tokens: 0 };

      for (let i = 0; i < CONFIG.MAX_TOOL_ITERATIONS; i++) {
        const stream = anthropic.messages.stream({
          model:    CONFIG.MODEL,
          max_tokens: CONFIG.MAX_TOKENS,
          thinking: THINKING_PARAM,
          system:   SYSTEM_PROMPT,
          tools:    toolRegistry.definitions(),
          messages,
        });

        for await (const event of stream) {
          if (event.type === "message_start") {
            usage.input_tokens += event.message.usage.input_tokens;
          }

          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              await write("text", { delta: delta.text });
            }
          }

          if (event.type === "message_delta") {
            usage.output_tokens += event.usage.output_tokens ?? 0;
          }
        }

        const finalMessage = await stream.finalMessage();

        if (finalMessage.stop_reason === "end_turn") break;

        if (finalMessage.stop_reason === "tool_use") {
          messages.push({ role: "assistant", content: finalMessage.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of finalMessage.content) {
            if (block.type !== "tool_use") continue;

            const input = block.input as Record<string, unknown>;
            await write("tool_call", { tool: block.name, input });

            let result: string;
            try {
              result = await toolRegistry.execute(block.name, input);
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : String(err)}`;
            }

            // Emit cached jobs to populate the right panel in real time
            if (block.name === "search_jobs" && jobCache.size > 0) {
              await write("job_results", { jobs: Array.from(jobCache.values()) });
            }

            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
          }

          messages.push({ role: "user", content: toolResults });
          continue;
        }

        break;
      }

      const inputCost  = (usage.input_tokens  / 1_000_000) * CONFIG.PRICE_INPUT_PER_M;
      const outputCost = (usage.output_tokens / 1_000_000) * CONFIG.PRICE_OUTPUT_PER_M;
      await write("done", {
        usage,
        cost:     inputCost + outputCost,
        messages: messages as ApiMessage[],
      });
    } catch (err) {
      await write("error", {
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type":    "text/event-stream",
      "Cache-Control":   "no-cache, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

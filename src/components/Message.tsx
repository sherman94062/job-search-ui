"use client";

import type { ChatMessage } from "@/lib/types";

interface Props {
  message: ChatMessage;
}

/** Render bold, italic, inline code, and links from markdown-ish text. */
function renderInline(text: string): React.ReactNode[] {
  // Split on code spans, bold, italic, links
  const parts: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));

    const token = m[0];
    if (token.startsWith("`")) {
      parts.push(
        <code key={m.index} className="bg-[#2a2a3e] text-accent-light px-1 rounded text-sm font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={m.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      parts.push(<em key={m.index}>{token.slice(1, -1)}</em>);
    } else if (m[2] && m[3]) {
      // markdown link
      parts.push(
        <a key={m.index} href={m[3]} target="_blank" rel="noreferrer"
           className="text-link underline underline-offset-2 hover:text-blue-300">
          {m[2]}
        </a>
      );
    }
    last = m.index + token.length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderContent(content: string): React.ReactNode {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H1
    if (line.startsWith("# ")) {
      nodes.push(
        <h1 key={i} className="text-lg font-bold text-text-primary mt-3 mb-1">
          {line.slice(2)}
        </h1>
      );
    }
    // H2
    else if (line.startsWith("## ")) {
      nodes.push(
        <h2 key={i} className="text-base font-semibold text-text-primary mt-3 mb-1">
          {line.slice(3)}
        </h2>
      );
    }
    // H3
    else if (line.startsWith("### ")) {
      nodes.push(
        <h3 key={i} className="text-sm font-semibold text-text-primary mt-2 mb-1">
          {line.slice(4)}
        </h3>
      );
    }
    // Bullet list
    else if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <li key={i} className="ml-4 list-disc text-text-primary leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, "");
      nodes.push(
        <li key={i} className="ml-4 list-decimal text-text-primary leading-relaxed">
          {renderInline(text)}
        </li>
      );
    }
    // Empty line → spacer
    else if (line.trim() === "") {
      nodes.push(<div key={i} className="h-2" />);
    }
    // Normal paragraph
    else {
      nodes.push(
        <p key={i} className="text-text-primary leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  return <>{nodes}</>;
}

export default function Message({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-accent px-4 py-2.5 rounded-2xl rounded-tr-sm text-white text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[90%]">
        {/* Avatar + label */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">
            A
          </div>
          <span className="text-xs text-text-muted font-medium">Assistant</span>
        </div>

        <div className="text-sm space-y-0.5">
          {renderContent(message.content)}
          {message.streaming && (
            <span className="inline-block w-0.5 h-4 bg-text-muted animate-blink ml-0.5 align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}

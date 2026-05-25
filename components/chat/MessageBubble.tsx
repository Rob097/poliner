"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export interface BubbleMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  allegati?: Array<{ type: "image"; url: string }>;
  isStreaming?: boolean;
}

interface Props {
  message: BubbleMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-2 max-w-[88%]", isUser ? "flex-row-reverse" : "")}>
        {!isUser && (
          <div
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-base mt-0.5"
            style={{ background: "#E0F2FE" }}
            aria-hidden
          >
            ✨
          </div>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          {message.allegati && message.allegati.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.allegati.map((a) => (
                <div
                  key={a.url}
                  className="relative w-32 h-32 rounded-xl overflow-hidden border border-(--border)"
                >
                  <Image
                    src={a.url}
                    alt="Allegato"
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {message.content.length > 0 && (
            <div
              className={cn(
                "px-3.5 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap break-words",
                isUser
                  ? "bg-(--primary) text-white rounded-br-md"
                  : "bg-white border border-(--border) text-text rounded-bl-md",
              )}
            >
              {message.content}
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 align-text-bottom ml-0.5 bg-text/60 animate-pulse" aria-hidden />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

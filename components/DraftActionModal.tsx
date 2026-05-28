"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Sparkles, X } from "lucide-react";

export type ActionType =
  | "department_brief"
  | "individual_message"
  | "standup_agenda";

export interface TaskContextItem {
  task_id: string;
  task_name: string;
  status: string;
  priority: string;
  days_overdue: number;
  assignee: string | null;
  department: string | null;
}

export interface DraftActionContext {
  department?: string;
  assignee?: string;
  tasks: TaskContextItem[];
}

interface DraftActionModalProps {
  open: boolean;
  actionType: ActionType;
  context: DraftActionContext;
  onClose: () => void;
}

const TITLES: Record<ActionType, (ctx: DraftActionContext) => string> = {
  department_brief: (ctx) =>
    ctx.department ? `Brief to ${ctx.department} lead` : "Department brief",
  individual_message: (ctx) =>
    ctx.assignee ? `Message to ${ctx.assignee}` : "Direct message",
  standup_agenda: () => "Monday standup agenda",
};

const SUBTITLES: Record<ActionType, (n: number) => string> = {
  department_brief: (n) =>
    `Drafting from ${n} blocked or overdue ${n === 1 ? "task" : "tasks"}`,
  individual_message: (n) =>
    `Drafting from ${n} blocked or overdue ${n === 1 ? "task" : "tasks"}`,
  standup_agenda: (n) =>
    `Drafting from ${n} blocked or overdue ${n === 1 ? "task" : "tasks"}`,
};

/**
 * Centered modal that calls /api/draft-action and renders the result.
 * Mounting is gated on `open` — fresh state every time it opens.
 *
 * Accessibility limitations (Day 3+):
 *   - No focus trap. ESC and click-outside close work.
 *   - aria-modal / role="dialog" are set but tab focus can escape.
 */
export function DraftActionModal({
  open,
  actionType,
  context,
  onClose,
}: DraftActionModalProps) {
  if (!open) return null;
  return (
    <DraftActionModalContent
      actionType={actionType}
      context={context}
      onClose={onClose}
    />
  );
}

type ModalState = "loading" | "success" | "error";

const MIN_LOADING_MS = 2000;

function DraftActionModalContent({
  actionType,
  context,
  onClose,
}: Omit<DraftActionModalProps, "open">) {
  const [state, setState] = useState<ModalState>("loading");
  const [message, setMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Fetch on mount. cancelled guards against fast close.
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const settle = (next: ModalState, msg: string) => {
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, MIN_LOADING_MS - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        setMessage(msg);
        setState(next);
      }, wait);
    };

    (async () => {
      try {
        const res = await fetch("/api/draft-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action_type: actionType,
            context,
          }),
        });
        if (cancelled) return;

        if (!res.ok) {
          console.error("Draft action API error:", res.status);
          settle("error", "");
          return;
        }
        const data = (await res.json()) as { message?: string };
        if (!data.message) {
          settle("error", "");
          return;
        }
        settle("success", data.message);
      } catch (err) {
        console.error("Draft action fetch failed:", err);
        if (!cancelled) settle("error", "");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally empty — modal content remounts when `open` flips, so
    // this effect runs exactly once per open. context/actionType are
    // captured from the closure at mount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCopy = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard write failed:", err);
    }
  };

  const title = TITLES[actionType](context);
  const subtitle = SUBTITLES[actionType](context.tasks.length);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(10, 10, 12, 0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-surface rounded-lg max-w-2xl w-full p-8 animate-modal-in relative"
      >
        {/* Close button — always visible. ESC and click-outside also close. */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-md transition-colors cursor-pointer
                     text-zinc-400 hover:text-zinc-50 hover:bg-[#1f1f23]"
        >
          <X className="w-[18px] h-[18px]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span className="text-[10px] uppercase tracking-widest text-muted">
            AI draft
          </span>
        </div>
        <h2 className="text-lg font-semibold text-primary mb-1">{title}</h2>
        <p className="text-xs text-muted mb-6">{subtitle}</p>

        {/* Body */}
        {state === "loading" && <LoadingBody />}
        {state === "error" && <ErrorBody onClose={onClose} />}
        {state === "success" && (
          <SuccessBody
            message={message}
            copied={copied}
            onCopy={handleCopy}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="py-12 flex flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-1.5">
        {[0, 0.16, 0.32].map((delay, i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-violet-400"
            style={{
              animation: "dot-pulse 1.4s ease-in-out infinite",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm text-muted">Drafting…</p>
    </div>
  );
}

function ErrorBody({ onClose }: { onClose: () => void }) {
  return (
    <div className="py-8">
      <p className="text-sm text-secondary mb-6">
        Couldn&apos;t draft this. Try again?
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="text-sm text-secondary px-4 py-2 rounded-md hover:bg-card-border transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SuccessBody({
  message,
  copied,
  onCopy,
  onClose,
}: {
  message: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <pre className="whitespace-pre-wrap text-sm text-primary leading-relaxed font-sans mb-6 max-h-[400px] overflow-y-auto">
        {message}
      </pre>
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="text-sm text-secondary px-4 py-2 rounded-md hover:bg-card-border transition-colors"
        >
          Close
        </button>
        <button
          onClick={onCopy}
          disabled={copied}
          className="text-sm font-medium px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-500 disabled:bg-emerald-600 text-white transition-colors flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
    </>
  );
}

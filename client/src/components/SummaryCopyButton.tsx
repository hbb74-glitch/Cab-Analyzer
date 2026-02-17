import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

function tryClipboardWrite(text: string): Promise<boolean> {
  return (async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch {
      return false;
    }
  })();
}

interface SummaryCopyButtonProps {
  buildSummaryText: () => string;
  buttonLabel?: string;
  className?: string;
}

export function SummaryCopyButton({ buildSummaryText, buttonLabel = "Copy summary", className }: SummaryCopyButtonProps) {
  const [open, setOpen] = useState(false);
  const [lastText, setLastText] = useState("");
  const [copied, setCopied] = useState(false);

  const summaryText = useMemo(() => {
    try {
      const t = buildSummaryText?.();
      return typeof t === "string" ? t : String(t ?? "");
    } catch (e: any) {
      return `ERROR: buildSummaryText() threw: ${e?.message || e}`;
    }
  }, [buildSummaryText]);

  async function onCopyClick(e: React.MouseEvent) {
    e?.preventDefault?.();

    const text = summaryText?.trim() || "";
    if (!text) {
      return;
    }

    setLastText(text);

    const ok = await tryClipboardWrite(text);

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setOpen(true);
  }

  function onClose() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={onCopyClick}
        className={cn("px-3 py-1 rounded border border-zinc-600 text-xs", className)}
        data-testid="button-copy-summary"
      >
        {copied ? "Copied!" : buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={onClose}
        >
          <div
            className="rounded-2xl p-4 overflow-auto bg-background border border-white/10"
            style={{ width: "min(900px, 96vw)", maxHeight: "85vh" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex gap-2 items-center mb-3">
              <strong className="flex-1 text-sm">Manual copy</strong>
              <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              Clipboard copy is blocked on this device/browser. Tap inside the box, then
              <b> Select All &rarr; Copy</b>.
            </p>

            <textarea
              value={lastText}
              readOnly
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs"
              style={{ height: "55vh", lineHeight: 1.4 }}
              onFocus={(ev) => {
                try {
                  ev.target.select();
                  ev.target.setSelectionRange(0, ev.target.value.length);
                } catch {}
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

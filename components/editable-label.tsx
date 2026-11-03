"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditableLabelProps = {
  value: string;
  editing: boolean;
  ariaLabel: string;
  onEditStart: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  className?: string;
  textClassName?: string;
  inputClassName?: string;
  truncate?: boolean;
  deleteClassName?: string;
};

export function EditableLabel({
  value,
  editing,
  ariaLabel,
  onEditStart,
  onCommit,
  onCancel,
  onDelete,
  deleteLabel,
  className,
  textClassName,
  inputClassName,
  truncate = true,
  deleteClassName,
}: EditableLabelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [editing]);

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        aria-label={ariaLabel}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            return;
          }
          onCommit(draft);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit(draft);
          } else if (event.key === "Escape") {
            event.preventDefault();
            cancelRef.current = true;
            onCancel();
          }
        }}
        className={cn("h-8 min-w-0", inputClassName)}
      />
    );
  }

  return (
    <div className={cn("group/label relative flex min-w-0 items-center", className)}>
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          onEditStart();
        }}
        className={cn(
          "rounded-md px-1 py-0.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          truncate ? "min-w-0 truncate" : "whitespace-nowrap",
          textClassName,
        )}
      >
        {value}
      </button>
      {onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={deleteLabel}
          onClick={onDelete}
          className={cn(
            "absolute top-1/2 z-10 -translate-y-1/2 bg-card opacity-0 group-hover/label:opacity-100 focus-visible:opacity-100",
            deleteClassName ?? "-right-1",
          )}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type PendingDelete = {
  kind: "time" | "tier";
  id: string;
  label: string;
};

type DeleteConfirmDialogProps = {
  pending: PendingDelete | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (skipFuture: boolean) => void;
};

export function DeleteConfirmDialog({
  pending,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={pending !== null} onOpenChange={onOpenChange}>
      {pending ? (
        <DeleteConfirmBody
          key={`${pending.kind}:${pending.id}`}
          pending={pending}
          onConfirm={onConfirm}
        />
      ) : null}
    </AlertDialog>
  );
}

function DeleteConfirmBody({
  pending,
  onConfirm,
}: {
  pending: PendingDelete;
  onConfirm: (skipFuture: boolean) => void;
}) {
  const [dontAsk, setDontAsk] = useState(false);
  const description =
    pending.kind === "tier"
      ? `Remove the ${pending.label} tier. Points on it move to the nearest tier that stays.`
      : `Remove the ${pending.label} column and the point on it.`;

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Remove {pending.label}?</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <div className="grid gap-1.5">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 accent-foreground"
            checked={dontAsk}
            onChange={(event) => setDontAsk(event.target.checked)}
          />
          Don&apos;t ask again
        </label>
        {dontAsk ? (
          <p className="pl-6 text-xs text-muted-foreground">
            Reset prompts in the menu brings this question back.
          </p>
        ) : null}
      </div>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant="destructive"
          onClick={() => onConfirm(dontAsk)}
        >
          Remove
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Maximize2, Minimize2, Plus, RotateCcw } from "lucide-react";
import { cn } from "cn";

import { DeleteConfirmDialog, type PendingDelete } from "@/components/delete-confirm-dialog";
import { EditableLabel } from "@/components/editable-label";
import { GraphMenu } from "@/components/graph-menu";
import { PerformanceGraph } from "@/components/performance-graph";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  addTier,
  addTime,
  allPointsCleared,
  clearPoints,
  createSample,
  getGraphSnapshot,
  getServerGraphSnapshot,
  removeTier,
  removeTime,
  renameTier,
  renameTime,
  reorderTier,
  reorderTime,
  setPoint,
  subscribeGraph,
  updateGraph,
  type EditTarget,
  type Resolution,
} from "@/lib/graph-model";
import { getSkipDeletePrompt, setSkipDeletePrompt } from "@/lib/prompts";

const RESOLUTIONS: { value: Resolution; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function PerformanceBoard() {
  const state = useSyncExternalStore(
    subscribeGraph,
    getGraphSnapshot,
    getServerGraphSnapshot,
  );
  const [resolution, setResolution] = useState<Resolution>("medium");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);

  function performRemove(pending: PendingDelete) {
    if (editing?.type === pending.kind && editing.id === pending.id) {
      setEditing(null);
    }
    const current = getGraphSnapshot();
    updateGraph(
      pending.kind === "time"
        ? removeTime(current, pending.id)
        : removeTier(current, pending.id),
    );
  }

  function requestRemove(kind: PendingDelete["kind"], id: string) {
    const current = getGraphSnapshot();
    const label =
      kind === "time"
        ? current.times.find((time) => time.id === id)?.label
        : current.tiers.find((tier) => tier.id === id)?.label;
    if (!label) return;
    const pending = { kind, id, label };
    if (getSkipDeletePrompt()) {
      performRemove(pending);
      return;
    }
    setPendingDelete(pending);
  }

  function commit(target: EditTarget, value: string) {
    const trimmed = value.trim().slice(0, 48);
    setEditing(null);
    if (!trimmed) return;
    const current = getGraphSnapshot();
    if (target.type === "title") updateGraph({ ...current, title: trimmed });
    else if (target.type === "time") updateGraph(renameTime(current, target.id, trimmed));
    else updateGraph(renameTier(current, target.id, trimmed));
  }

  function handleAddTime() {
    const next = addTime(getGraphSnapshot());
    updateGraph(next.state);
    setEditing({ type: "time", id: next.id });
  }

  function handleAddTier() {
    const next = addTier(getGraphSnapshot());
    updateGraph(next.state);
    setEditing({ type: "tier", id: next.id });
  }

  function controls(compact = false) {
    return (
      <div
        className={cn(
          "flex gap-2",
          compact ? "min-w-0 items-center" : "flex-wrap items-end gap-3",
        )}
      >
        <div className={cn("flex flex-col gap-1.5", compact && "shrink-0")}>
          {compact ? null : (
            <span id="resolution-label" className="text-xs text-muted-foreground">
              Resolution
            </span>
          )}
          <ToggleGroup
            aria-label={compact ? "Resolution" : undefined}
            aria-labelledby={compact ? undefined : "resolution-label"}
            value={[resolution]}
            onValueChange={(next) => {
              const picked = next[next.length - 1];
              if (picked === "high" || picked === "medium" || picked === "low") {
                setResolution(picked);
              }
            }}
            variant="outline"
            size="sm"
            spacing={0}
          >
            {RESOLUTIONS.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                className="data-[state=on]:bg-foreground data-[state=on]:text-primary-foreground"
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Button type="button" variant="outline" onClick={handleAddTime}>
          <Plus data-icon="inline-start" />
          Add time
        </Button>
        <Button type="button" variant="outline" onClick={handleAddTier}>
          <Plus data-icon="inline-start" />
          Add tier
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setEditing(null);
            updateGraph(createSample());
          }}
        >
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={fullscreen ? "Exit full screen" : "Fill the window"}
          aria-pressed={fullscreen}
          onClick={() => setFullscreen((value) => !value)}
        >
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
        </Button>
        {compact ? (
          <GraphMenu
            state={state}
            pointsCleared={allPointsCleared(state)}
            onImport={(next) => {
              setEditing(null);
              setPendingDelete(null);
              updateGraph(next);
            }}
            onClear={() => {
              setEditing(null);
              setPendingDelete(null);
              updateGraph(clearPoints(getGraphSnapshot()));
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <main
      className={cn(
        fullscreen
          ? "fixed inset-0 z-40 bg-background"
          : "mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10",
      )}
    >
      {fullscreen ? null : (
      <header className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <EditableLabel
              value={state.title}
              editing={editing?.type === "title"}
              ariaLabel="Chart title"
              onEditStart={() => setEditing({ type: "title" })}
              onCommit={(value) => commit({ type: "title" }, value)}
              onCancel={() => setEditing(null)}
              textClassName="font-serif text-4xl tracking-tight text-foreground sm:text-5xl"
              inputClassName="h-12 font-serif text-3xl tracking-tight sm:text-4xl"
            />
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              Time runs across. Performance rises through the tiers. Click any
              label to rename it.
            </p>
          </div>
          <GraphMenu
            state={state}
            pointsCleared={allPointsCleared(state)}
            onImport={(next) => {
              setEditing(null);
              setPendingDelete(null);
              updateGraph(next);
            }}
            onClear={() => {
              setEditing(null);
              setPendingDelete(null);
              updateGraph(clearPoints(getGraphSnapshot()));
            }}
          />
        </div>

        {controls()}
      </header>
      )}

      <div className={cn("relative", fullscreen && "h-full")}>
        {fullscreen ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
            <div className="pointer-events-auto flex items-center gap-3 overflow-x-auto rounded-2xl border border-border bg-card/90 px-3 py-2 shadow-md backdrop-blur-md">
              <EditableLabel
                value={state.title}
                editing={editing?.type === "title"}
                ariaLabel="Chart title"
                onEditStart={() => setEditing({ type: "title" })}
                onCommit={(value) => commit({ type: "title" }, value)}
                onCancel={() => setEditing(null)}
                className="max-w-[9rem] shrink-0 sm:max-w-xs"
                textClassName="truncate font-serif text-xl tracking-tight text-foreground"
                inputClassName="h-8 font-serif text-xl"
              />
              {controls(true)}
            </div>
          </div>
        ) : null}
        <PerformanceGraph
          state={state}
          resolution={resolution}
          editing={editing}
          fill={fullscreen}
          onEdit={setEditing}
          onCommit={commit}
          onCancelEdit={() => setEditing(null)}
          onSetPoint={(timeId, tierId) =>
            updateGraph(setPoint(getGraphSnapshot(), timeId, tierId))
          }
          onRemoveTime={(id) => requestRemove("time", id)}
          onRemoveTier={(id) => requestRemove("tier", id)}
          onReorderTime={(id, toIndex) =>
            updateGraph(reorderTime(getGraphSnapshot(), id, toIndex))
          }
          onReorderTier={(id, toIndex) =>
            updateGraph(reorderTier(getGraphSnapshot(), id, toIndex))
          }
          onExitFullscreen={
            fullscreen ? () => setFullscreen(false) : undefined
          }
        />
      </div>

      <DeleteConfirmDialog
        pending={pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={(skipFuture) => {
          if (!pendingDelete) return;
          if (skipFuture) setSkipDeletePrompt(true);
          performRemove(pendingDelete);
          setPendingDelete(null);
        }}
      />

      {fullscreen ? null : (
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Drag a point or click a band and it snaps to a tier. Click a plotted
        point to select it, then delete it from the corner. Hold a time or a
        tier and drag to reorder it. Fill the window when you want the chart
        to take the page, with the controls floating on top.
      </p>
      )}
    </main>
  );
}

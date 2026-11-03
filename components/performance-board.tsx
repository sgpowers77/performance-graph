"use client";

import { useState, useSyncExternalStore } from "react";
import { Plus, RotateCcw } from "lucide-react";

import { EditableLabel } from "@/components/editable-label";
import { PerformanceGraph } from "@/components/performance-graph";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  addTier,
  addTime,
  createSample,
  getGraphSnapshot,
  getServerGraphSnapshot,
  removeTier,
  removeTime,
  renameTier,
  renameTime,
  setPoint,
  subscribeGraph,
  updateGraph,
  type EditTarget,
  type Resolution,
} from "@/lib/graph-model";

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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5">
        <div className="max-w-xl">
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

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span id="resolution-label" className="text-xs text-muted-foreground">
              Resolution
            </span>
            <ToggleGroup
              aria-labelledby="resolution-label"
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
        </div>
      </header>

      <PerformanceGraph
        state={state}
        resolution={resolution}
        editing={editing}
        onEdit={setEditing}
        onCommit={commit}
        onCancelEdit={() => setEditing(null)}
        onSetPoint={(timeId, tierId) =>
          updateGraph(setPoint(getGraphSnapshot(), timeId, tierId))
        }
        onRemoveTime={(id) => {
          if (editing?.type === "time" && editing.id === id) setEditing(null);
          updateGraph(removeTime(getGraphSnapshot(), id));
        }}
        onRemoveTier={(id) => {
          if (editing?.type === "tier" && editing.id === id) setEditing(null);
          updateGraph(removeTier(getGraphSnapshot(), id));
        }}
      />

      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Drag a point or click a band and it snaps to a tier. Arrow keys move
        the selected point. Hover a point to clear it. High, medium, and low
        only change how much of the chart stays in view.
      </p>
    </main>
  );
}

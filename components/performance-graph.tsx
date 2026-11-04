"use client";

import { useEffect, useRef, useState } from "react";
import { GripHorizontal, GripVertical, Trash2, X } from "lucide-react";
import { cn } from "cn";

import { EditableLabel } from "@/components/editable-label";
import { Button } from "@/components/ui/button";
import {
  allPointsCleared,
  chartMetrics,
  linePaths,
  pointPosition,
  tierIdAtY,
  tierIndex,
  type ChartMetrics,
  type EditTarget,
  type GraphState,
  type Resolution,
} from "@/lib/graph-model";

type PerformanceGraphProps = {
  state: GraphState;
  resolution: Resolution;
  editing: EditTarget | null;
  fill?: boolean;
  onEdit: (target: EditTarget) => void;
  onCommit: (target: EditTarget, value: string) => void;
  onCancelEdit: () => void;
  onSetPoint: (timeId: string, tierId: string | null) => void;
  onRemoveTime: (id: string) => void;
  onRemoveTier: (id: string) => void;
  onReorderTime: (id: string, toIndex: number) => void;
  onReorderTier: (id: string, toIndex: number) => void;
  onExitFullscreen?: () => void;
};

export function PerformanceGraph({
  state,
  resolution,
  editing,
  fill = false,
  onEdit,
  onCommit,
  onCancelEdit,
  onSetPoint,
  onRemoveTime,
  onRemoveTier,
  onReorderTime,
  onReorderTier,
  onExitFullscreen,
}: PerformanceGraphProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const tierColumnRef = useRef<HTMLDivElement>(null);
  const dragTime = useRef<string | null>(null);
  const [availableWidth, setAvailableWidth] = useState(720);
  const [frameHeight, setFrameHeight] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const frame = frameRef.current;
    if (!scroller) return;
    const measure = () => {
      setAvailableWidth(scroller.clientWidth);
      if (frame) setFrameHeight(frame.clientHeight);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    if (frame) observer.observe(frame);
    return () => observer.disconnect();
  }, [fill]);

  useEffect(() => {
    if (editing?.type !== "time") return;
    document
      .getElementById(`time-label-${editing.id}`)
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [editing]);

  const canRemoveTier = state.tiers.length > 2;
  const canRemoveTime = state.times.length > 2;
  const footerHeight = canRemoveTime ? 88 : 64;
  const metrics = filledMetrics(
    chartMetrics(
      resolution,
      state.times.length,
      state.tiers.length,
      availableWidth,
    ),
    fill,
    frameHeight,
    footerHeight,
    state.tiers.length,
  );
  const selectedTime = state.times.find((time) => time.id === selectedId) ?? null;
  const selectedTierId = selectedTime
    ? (state.points[selectedTime.id] ?? null)
    : null;
  const paths = linePaths(state, metrics);
  const cleared = allPointsCleared(state);
  const tiersTopFirst = [...state.tiers].reverse();

  function placeFromPointer(timeId: string, clientY: number) {
    const plotTop = plotRef.current?.getBoundingClientRect().top;
    if (plotTop === undefined) return;
    const tierId = tierIdAtY(clientY, plotTop, metrics, state.tiers);
    if (!tierId) return;
    setSelectedId(timeId);
    onSetPoint(timeId, tierId);
  }

  function clearSelected() {
    if (!selectedTime || !selectedTierId) return;
    onSetPoint(selectedTime.id, null);
    setSelectedId(null);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "Escape") {
        if (selectedId) {
          setSelectedId(null);
          return;
        }
        onExitFullscreen?.();
        return;
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedTime &&
        selectedTierId
      ) {
        event.preventDefault();
        onSetPoint(selectedTime.id, null);
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExitFullscreen, onSetPoint, selectedId, selectedTime, selectedTierId]);

  function beginAxisDrag(
    event: React.PointerEvent,
    kind: "time" | "tier",
    id: string,
  ) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("input, [data-axis-delete]")) {
      return;
    }
    const startX = event.clientX;
    const startY = event.clientY;
    let active = false;

    function indexAt(clientX: number, clientY: number) {
      if (kind === "time") {
        const plot = plotRef.current;
        if (!plot) return 0;
        const rect = plot.getBoundingClientRect();
        const count = Number(plot.dataset.count ?? 1);
        const column = rect.width / Math.max(count, 1);
        if (column <= 0) return 0;
        return Math.max(
          0,
          Math.min(count - 1, Math.floor((clientX - rect.left) / column)),
        );
      }
      const column = tierColumnRef.current;
      if (!column) return 0;
      const rect = column.getBoundingClientRect();
      const count = Number(column.dataset.count ?? 1);
      const band = rect.height / Math.max(count, 1);
      if (band <= 0) return 0;
      const visual = Math.max(
        0,
        Math.min(count - 1, Math.floor((clientY - rect.top) / band)),
      );
      return count - 1 - visual;
    }

    function move(ev: PointerEvent) {
      const along = kind === "time" ? ev.clientX - startX : ev.clientY - startY;
      const across = kind === "time" ? ev.clientY - startY : ev.clientX - startX;
      if (!active) {
        if (Math.abs(along) < 8 || Math.abs(across) > Math.abs(along)) return;
        active = true;
        setDraggingId(id);
        document.body.style.cursor = "grabbing";
      }
      ev.preventDefault();
      const next = indexAt(ev.clientX, ev.clientY);
      if (kind === "time") onReorderTime(id, next);
      else onReorderTier(id, next);
    }

    function finish() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      document.body.style.cursor = "";
      setDraggingId(null);
      if (!active) return;
      const swallow = (click: MouseEvent) => {
        click.preventDefault();
        click.stopPropagation();
        window.removeEventListener("click", swallow, true);
      };
      window.addEventListener("click", swallow, true);
      window.setTimeout(() => window.removeEventListener("click", swallow, true), 400);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  function movePoint(timeId: string, direction: 1 | -1) {
    const current = tierIndex(state, state.points[timeId] ?? null);
    const nextIndex =
      current < 0
        ? direction > 0
          ? 0
          : state.tiers.length - 1
        : Math.max(0, Math.min(state.tiers.length - 1, current + direction));
    const next = state.tiers[nextIndex];
    if (next) {
      setSelectedId(timeId);
      onSetPoint(timeId, next.id);
    }
  }

  return (
    <div ref={frameRef} className={cn("relative", fill && "h-full")}>
    <div
      className={cn(
        "overflow-hidden bg-card",
        fill
          ? "h-full rounded-none border-0 shadow-none"
          : "rounded-2xl border border-border shadow-[0_1px_0_rgba(36,30,24,0.04)]",
      )}
    >
      <div className={cn("flex", fill && "h-full pt-20")}>
        <div
          ref={tierColumnRef}
          data-count={state.tiers.length}
          className="relative w-36 shrink-0 border-r border-border/80 sm:w-48"
          style={{ height: metrics.plotHeight }}
        >
          {tiersTopFirst.map((tier, visualIndex) => (
            <div
              key={tier.id}
              className={cn(
                "absolute inset-x-0 flex touch-none items-center gap-1 pr-2 pl-1 sm:pr-3",
                draggingId === tier.id && "bg-accent/80",
              )}
              style={{
                top: visualIndex * metrics.bandHeight,
                height: metrics.bandHeight,
              }}
              onPointerDown={(event) => beginAxisDrag(event, "tier", tier.id)}
            >
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground/70"
              >
                <GripVertical className="size-3.5" />
              </span>
              {canRemoveTier ? (
                <RemoveAxisButton
                  label={`Remove tier ${tier.label}`}
                  onClick={() => onRemoveTier(tier.id)}
                />
              ) : (
                <span className="size-6 shrink-0" aria-hidden="true" />
              )}
              <EditableLabel
                value={tier.label}
                editing={editing?.type === "tier" && editing.id === tier.id}
                ariaLabel={`Performance tier ${tier.label}`}
                onEditStart={() => onEdit({ type: "tier", id: tier.id })}
                onCommit={(value) => onCommit({ type: "tier", id: tier.id }, value)}
                onCancel={onCancelEdit}
                className="min-w-0 flex-1 justify-end"
                textClassName="text-right text-xs text-muted-foreground sm:text-sm"
                inputClassName="text-right text-xs sm:text-sm"
              />
            </div>
          ))}
        </div>

        <div ref={scrollerRef} className="chart-scroll min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: metrics.plotWidth }}>
            <div
              ref={plotRef}
              data-count={state.times.length}
              className="relative touch-none"
              style={{ height: metrics.plotHeight }}
            >
              <svg
                width={metrics.plotWidth}
                height={metrics.plotHeight}
                className="absolute inset-0 text-foreground"
                aria-hidden="true"
              >
                {state.tiers.map((tier, index) => {
                  const fromTop = state.tiers.length - 1 - index;
                  return (
                    <rect
                      key={tier.id}
                      x={0}
                      y={fromTop * metrics.bandHeight}
                      width={metrics.plotWidth}
                      height={metrics.bandHeight}
                      fill="currentColor"
                      fillOpacity={
                        fromTop % 2 === 0 ? 0.06 * metrics.bandOpacity : 0
                      }
                    />
                  );
                })}
                {state.tiers.map((tier, index) => {
                  if (resolution === "low") return null;
                  const y =
                    metrics.plotHeight - index * metrics.bandHeight;
                  return (
                    <line
                      key={`h-${tier.id}`}
                      x1={0}
                      x2={metrics.plotWidth}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.12 * metrics.gridOpacity}
                    />
                  );
                })}
                {metrics.showVerticalGrid
                  ? state.times.map((time, index) => (
                      <line
                        key={`v-${time.id}`}
                        x1={index * metrics.columnWidth}
                        x2={index * metrics.columnWidth}
                        y1={0}
                        y2={metrics.plotHeight}
                        stroke="currentColor"
                        strokeOpacity={0.16 * metrics.gridOpacity}
                      />
                    ))
                  : null}
                {paths.map((path) => (
                  <path
                    key={path}
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={metrics.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {state.times.map((time, index) => {
                const placed = tierIndex(state, state.points[time.id] ?? null);
                const { x, y } = pointPosition(index, placed, metrics);
                const tier = placed >= 0 ? state.tiers[placed] : undefined;
                const diameter = metrics.pointRadius * 2;
                return (
                  <div key={time.id}>
                    <div
                      className="absolute inset-y-0 z-10 cursor-pointer"
                      style={{
                        left: index * metrics.columnWidth,
                        width: metrics.columnWidth,
                      }}
                      onPointerDown={(event) => {
                        if (
                          (event.target as HTMLElement).closest("[data-point]")
                        ) {
                          return;
                        }
                        placeFromPointer(time.id, event.clientY);
                      }}
                    />
                    <div
                      className="group/point absolute z-20"
                      style={{
                        left: x,
                        top: y - metrics.pointRadius - (tier ? 16 : 0),
                        width: Math.max(28, diameter),
                        height: diameter + (tier ? 16 : 0),
                        transform: "translateX(-50%)",
                      }}
                    >
                      {tier ? (
                        <button
                          type="button"
                          data-point
                          aria-label={`Clear ${time.label}`}
                          className="absolute top-0 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover/point:opacity-100 hover:bg-accent hover:text-foreground focus-visible:opacity-100"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={() => {
                            onSetPoint(time.id, null);
                            if (selectedId === time.id) setSelectedId(null);
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        data-point
                        role="slider"
                        aria-label={time.label}
                        aria-orientation="vertical"
                        aria-valuemin={0}
                        aria-valuemax={Math.max(0, state.tiers.length - 1)}
                        aria-valuenow={Math.max(0, placed)}
                        aria-valuetext={tier?.label ?? "Not set"}
                        className={
                          tier
                            ? cn(
                                "absolute bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-card bg-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                                selectedId === time.id &&
                                  "ring-3 ring-ring ring-offset-2 ring-offset-card",
                              )
                            : "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-dashed border-foreground/35 bg-card/80 opacity-0 outline-none hover:opacity-100 focus-visible:opacity-100"
                        }
                        style={{ width: diameter, height: diameter }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          if (tier) setSelectedId(time.id);
                          dragTime.current = time.id;
                          event.currentTarget.setPointerCapture(event.pointerId);
                          placeFromPointer(time.id, event.clientY);
                        }}
                        onPointerMove={(event) => {
                          if (dragTime.current !== time.id) return;
                          placeFromPointer(time.id, event.clientY);
                        }}
                        onPointerUp={() => {
                          dragTime.current = null;
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            movePoint(time.id, 1);
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            movePoint(time.id, -1);
                          } else if (
                            event.key === "Delete" ||
                            event.key === "Backspace"
                          ) {
                            event.preventDefault();
                            onSetPoint(time.id, null);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {cleared ? (
                <p className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6 text-center text-sm text-muted-foreground">
                  Click a column to set performance for that time.
                </p>
              ) : null}
            </div>

            <div
              className="relative border-t border-border/80"
              style={{ height: footerHeight }}
            >
              {state.times.map((time, index) => {
                const tightColumn = metrics.columnWidth < 44;
                const narrowLabel = metrics.columnWidth < 56;
                return (
                  <div
                    key={time.id}
                    id={`time-label-${time.id}`}
                    className={cn(
                      "group/time absolute top-1 flex touch-none flex-col items-center gap-0.5 overflow-hidden px-0.5",
                      draggingId === time.id && "rounded-md bg-accent/80",
                    )}
                    style={{
                      left: index * metrics.columnWidth,
                      width: metrics.columnWidth,
                    }}
                    onPointerDown={(event) =>
                      beginAxisDrag(event, "time", time.id)
                    }
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-3 cursor-grab items-center text-muted-foreground/70"
                    >
                      <GripHorizontal className="size-3.5" />
                    </span>
                    <EditableLabel
                      value={time.label}
                      editing={
                        editing?.type === "time" && editing.id === time.id
                      }
                      ariaLabel={`Time increment ${time.label}`}
                      onEditStart={() => onEdit({ type: "time", id: time.id })}
                      onCommit={(value) =>
                        onCommit({ type: "time", id: time.id }, value)
                      }
                      onCancel={onCancelEdit}
                      className="w-full max-w-full justify-center"
                      truncate={narrowLabel}
                      textClassName={cn(
                        "w-full text-center text-muted-foreground",
                        narrowLabel
                          ? "text-[10px] leading-4"
                          : "text-xs sm:text-sm",
                      )}
                      inputClassName="text-center text-xs sm:text-sm"
                    />
                    {canRemoveTime ? (
                      <RemoveAxisButton
                        label={`Remove ${time.label}`}
                        onClick={() => onRemoveTime(time.id)}
                        className={
                          tightColumn
                            ? "pointer-events-none opacity-0 group-hover/time:pointer-events-auto group-hover/time:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
                            : undefined
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
    {selectedTime && selectedTierId ? (
      <Button
        type="button"
        variant="destructive"
        data-point-delete
        className="absolute right-3 z-30 shadow-md"
        style={{ bottom: footerHeight + 12 }}
        onClick={clearSelected}
      >
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    ) : null}
    </div>
  );
}

function filledMetrics(
  metrics: ChartMetrics,
  fill: boolean,
  frameHeight: number,
  footerHeight: number,
  tierCount: number,
): ChartMetrics {
  const overlay = fill ? 80 : 0;
  if (!fill || frameHeight <= footerHeight + overlay + 80) return metrics;
  const plotHeight = frameHeight - footerHeight - overlay;
  const bandHeight = plotHeight / Math.max(tierCount, 1);
  return {
    ...metrics,
    bandHeight,
    plotHeight,
    pointRadius: Math.max(4, Math.min(7, bandHeight * 0.11)),
  };
}

function RemoveAxisButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      data-axis-delete
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(
        "shrink-0 text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
    >
      <X />
    </Button>
  );
}

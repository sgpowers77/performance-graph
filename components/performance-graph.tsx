"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { EditableLabel } from "@/components/editable-label";
import {
  allPointsCleared,
  chartMetrics,
  linePaths,
  pointPosition,
  tierIdAtY,
  tierIndex,
  timeLabelVisible,
  type EditTarget,
  type GraphState,
  type Resolution,
} from "@/lib/graph-model";

type PerformanceGraphProps = {
  state: GraphState;
  resolution: Resolution;
  editing: EditTarget | null;
  onEdit: (target: EditTarget) => void;
  onCommit: (target: EditTarget, value: string) => void;
  onCancelEdit: () => void;
  onSetPoint: (timeId: string, tierId: string | null) => void;
  onRemoveTime: (id: string) => void;
  onRemoveTier: (id: string) => void;
};

export function PerformanceGraph({
  state,
  resolution,
  editing,
  onEdit,
  onCommit,
  onCancelEdit,
  onSetPoint,
  onRemoveTime,
  onRemoveTier,
}: PerformanceGraphProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const dragTime = useRef<string | null>(null);
  const [availableWidth, setAvailableWidth] = useState(720);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => setAvailableWidth(scroller.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (editing?.type !== "time") return;
    document
      .getElementById(`time-label-${editing.id}`)
      ?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [editing]);

  const metrics = chartMetrics(
    resolution,
    state.times.length,
    state.tiers.length,
    availableWidth,
  );
  const paths = linePaths(state, metrics);
  const cleared = allPointsCleared(state);
  const tiersTopFirst = [...state.tiers].reverse();

  function placeFromPointer(timeId: string, clientY: number) {
    const plotTop = plotRef.current?.getBoundingClientRect().top;
    if (plotTop === undefined) return;
    const tierId = tierIdAtY(clientY, plotTop, metrics, state.tiers);
    if (tierId) onSetPoint(timeId, tierId);
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
    if (next) onSetPoint(timeId, next.id);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(36,30,24,0.04)]">
      <div className="flex">
        <div
          className="relative w-28 shrink-0 border-r border-border/80 sm:w-40"
          style={{ height: metrics.plotHeight }}
        >
          {tiersTopFirst.map((tier, visualIndex) => (
            <div
              key={tier.id}
              className="absolute right-2 left-1 flex items-center sm:right-3 sm:left-2"
              style={{
                top: visualIndex * metrics.bandHeight,
                height: metrics.bandHeight,
              }}
            >
              <EditableLabel
                value={tier.label}
                editing={editing?.type === "tier" && editing.id === tier.id}
                ariaLabel={`Performance tier ${tier.label}`}
                onEditStart={() => onEdit({ type: "tier", id: tier.id })}
                onCommit={(value) => onCommit({ type: "tier", id: tier.id }, value)}
                onCancel={onCancelEdit}
                onDelete={
                  state.tiers.length > 2 ? () => onRemoveTier(tier.id) : undefined
                }
                deleteLabel={`Remove tier ${tier.label}`}
                className="w-full justify-end"
                deleteClassName="left-0"
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
                      fill={
                        fromTop % 2 === 0
                          ? `rgba(36, 30, 24, ${0.045 * metrics.bandOpacity})`
                          : "transparent"
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
                          onClick={() => onSetPoint(time.id, null)}
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
                            ? "absolute bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize rounded-full border-2 border-card bg-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                            : "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border border-dashed border-foreground/35 bg-card/80 opacity-0 outline-none hover:opacity-100 focus-visible:opacity-100"
                        }
                        style={{ width: diameter, height: diameter }}
                        onPointerDown={(event) => {
                          event.stopPropagation();
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

            <div className="relative h-14 border-t border-border/80">
              {state.times.map((time, index) => {
                const visible = timeLabelVisible(
                  index,
                  state.times.length,
                  resolution,
                  metrics.columnWidth,
                );
                return (
                  <div
                    key={time.id}
                    id={`time-label-${time.id}`}
                    className="absolute top-1 flex justify-center px-0.5"
                    style={{
                      left: index * metrics.columnWidth,
                      width: metrics.columnWidth,
                    }}
                  >
                    {visible ? (
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
                        onDelete={
                          state.times.length > 2
                            ? () => onRemoveTime(time.id)
                            : undefined
                        }
                        deleteLabel={`Remove ${time.label}`}
                        className="justify-center"
                        truncate={false}
                        textClassName="text-center text-xs text-muted-foreground sm:text-sm"
                        inputClassName="text-center text-xs sm:text-sm"
                      />
                    ) : (
                      <span className="sr-only">{time.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

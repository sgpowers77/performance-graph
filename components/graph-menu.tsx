"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { BellRing, Download, Ellipsis, Moon, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  graphFileName,
  parseGraphFile,
  type GraphState,
} from "@/lib/graph-model";
import {
  getServerSkipDeletePrompt,
  getSkipDeletePrompt,
  resetPrompts,
  subscribePrompts,
} from "@/lib/prompts";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  setTheme,
  subscribeTheme,
} from "@/lib/theme";

const MAX_IMPORT_BYTES = 1_000_000;

type GraphMenuProps = {
  state: GraphState;
  pointsCleared: boolean;
  onImport: (next: GraphState) => void;
  onClear: () => void;
};

export function GraphMenu({
  state,
  pointsCleared,
  onImport,
  onClear,
}: GraphMenuProps) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const promptsSkipped = useSyncExternalStore(
    subscribePrompts,
    getSkipDeletePrompt,
    getServerSkipDeletePrompt,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importFailed, setImportFailed] = useState(false);

  function exportFile() {
    const payload = {
      title: state.title,
      tiers: state.tiers,
      times: state.times,
      points: state.points,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = graphFileName(state);
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) {
      setImportFailed(true);
      return;
    }
    const next = parseGraphFile(await file.text());
    if (!next) {
      setImportFailed(true);
      return;
    }
    onImport(next);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Graph menu"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} style={{ width: "13.5rem" }}>
          <DropdownMenuCheckboxItem
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          >
            <Moon />
            Dark mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuItem disabled={!promptsSkipped} onClick={() => resetPrompts()}>
            <BellRing />
            Reset prompts
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={exportFile}>
            <Download />
            Export data file
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Upload />
            Import data file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={pointsCleared}
            onClick={() => setConfirmClear(true)}
          >
            <Trash2 />
            Clear all
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="Import a performance graph file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void importFile(file);
        }}
      />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Clear every point?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the whole curve. The title, times, and tiers stay.
              You cannot undo it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onClear();
                setConfirmClear(false);
              }}
            >
              Clear all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={importFailed} onOpenChange={setImportFailed}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>That file is not a graph</AlertDialogTitle>
            <AlertDialogDescription>
              Choose a JSON file exported from this app. It needs a title, at
              least two times, and at least two tiers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImportFailed(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

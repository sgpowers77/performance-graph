export const SKIP_DELETE_PROMPT_KEY = "performance-graph.skip-delete-prompt";

const PROMPT_EVENT = "performance-graph-prompts";

function readSkipDeletePrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SKIP_DELETE_PROMPT_KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribePrompts(onChange: () => void): () => void {
  const onLocal = () => onChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === SKIP_DELETE_PROMPT_KEY) onChange();
  };
  window.addEventListener(PROMPT_EVENT, onLocal);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROMPT_EVENT, onLocal);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSkipDeletePrompt(): boolean {
  return readSkipDeletePrompt();
}

export function getServerSkipDeletePrompt(): boolean {
  return false;
}

export function setSkipDeletePrompt(skip: boolean): void {
  try {
    if (skip) window.localStorage.setItem(SKIP_DELETE_PROMPT_KEY, "1");
    else window.localStorage.removeItem(SKIP_DELETE_PROMPT_KEY);
  } catch {
    // The choice still applies until the page reloads.
  }
  window.dispatchEvent(new Event(PROMPT_EVENT));
}

export function resetPrompts(): void {
  setSkipDeletePrompt(false);
}

// Optional JSON files next to your media (in the assets dir), read at render time. A missing file gives the fallback,
// so the repo renders with nothing in it. Used for sfx/have.json and the demo's anchors.json.
import { continueRender, delayRender, staticFile } from "remotion";
import { useEffect, useRef, useState } from "react";
import { assetExists } from "./image";

const cache = new Map<string, Promise<unknown>>();
const fetchJson = (path: string) => {
  if (!cache.has(path) && assetExists(staticFile(path)) === false) cache.set(path, Promise.resolve(undefined));
  if (!cache.has(path)) {
    cache.set(path, fetch(staticFile(path)).then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined));
  }
  return cache.get(path)!;
};

export const useJsonAsset = <T,>(path: string, fallback: T): T => {
  const [val, setVal] = useState<T | null>(null);
  const [handle] = useState(() => delayRender(`json ${path}`));
  const done = useRef(false);
  useEffect(() => {
    fetchJson(path).then((v) => {
      setVal(v === undefined ? fallback : (v as T));
      if (!done.current) { done.current = true; continueRender(handle); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, handle]);
  return val ?? fallback;
};

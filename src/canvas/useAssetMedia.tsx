import {
  useCallback,
  useEffect,
  useState,
  type ComponentProps,
  type ElementType,
} from "react";
import { parseAssetSource } from "../backend/assetSource.ts";
import { creationClient } from "../backend/creationClient.ts";

export type AssetMediaState = "loading" | "ready" | "failed";

/** Resolves a media field for display. Inline and object URLs pass through. */
export function useAssetMedia(
  source: string | null | undefined,
  active = true,
): { src?: string; state: AssetMediaState; retry: () => void } {
  const asset = parseAssetSource(source);
  const [loaded, setLoaded] = useState<{
    source: string;
    src?: string;
  }>();
  const [attempt, setAttempt] = useState(0);
  const projectId = asset?.projectId;
  const assetId = asset?.assetId;
  useEffect(() => {
    if (!projectId || !assetId || !active) return;
    let current = true;
    creationClient(projectId)
      .mediaUrl(assetId)
      .then((src) => {
        if (current) setLoaded({ source: source!, src });
      })
      .catch(() => {
        if (current) setLoaded({ source: source! });
      });
    return () => {
      current = false;
    };
  }, [source, projectId, assetId, active, attempt]);
  const retry = useCallback(() => {
    setLoaded(undefined);
    setAttempt((value) => value + 1);
  }, []);
  if (!asset)
    return { src: source ?? undefined, state: "ready", retry };
  if (!loaded || loaded.source !== source) return { state: "loading", retry };
  return loaded.src
    ? { src: loaded.src, state: "ready", retry }
    : { state: "failed", retry };
}

type MediaTag = "img" | "video" | "audio";

/** A media element whose source may be a saved asset. A failed read keeps the
 * unresolvable value so the element's own error handling still runs. */
export function AssetMedia<Tag extends MediaTag>({
  as,
  src,
  ...props
}: { as: Tag; src?: string } & Omit<ComponentProps<Tag>, "src">) {
  const media = useAssetMedia(src);
  const Element = as as ElementType;
  return <Element {...props} src={media.state === "failed" ? src : media.src} />;
}

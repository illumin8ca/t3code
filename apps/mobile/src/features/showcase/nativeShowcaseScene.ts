import { requireOptionalNativeModule } from "expo";

export const SHOWCASE_SCENES = ["threads", "thread", "terminal", "review"] as const;
export type ShowcaseScene = (typeof SHOWCASE_SCENES)[number];

interface NativeShowcaseControls {
  readonly getShowcasePairingUrl?: () => string | null;
  readonly getShowcaseScene?: () => string | null;
  readonly prepareShowcaseCapture?: () => void;
  readonly markShowcaseReady?: (scene: ShowcaseScene) => void;
}

function nativeShowcaseControls(): NativeShowcaseControls | null {
  return requireOptionalNativeModule<NativeShowcaseControls>("T3NativeControls");
}

export function getNativeShowcasePairingUrl(): string | null {
  try {
    return nativeShowcaseControls()?.getShowcasePairingUrl?.()?.trim() || null;
  } catch {
    return null;
  }
}

export function getNativeShowcaseScene(): ShowcaseScene | null {
  try {
    const scene = nativeShowcaseControls()?.getShowcaseScene?.()?.trim();
    return SHOWCASE_SCENES.find((candidate) => candidate === scene) ?? null;
  } catch {
    return null;
  }
}

export function prepareNativeShowcaseCapture(): void {
  try {
    nativeShowcaseControls()?.prepareShowcaseCapture?.();
  } catch {
    // The harness still works when a development build predates this helper.
  }
}

export function markNativeShowcaseReady(scene: ShowcaseScene): void {
  try {
    nativeShowcaseControls()?.markShowcaseReady?.(scene);
  } catch {
    // The readiness marker is capture-runner metadata, never app functionality.
  }
}

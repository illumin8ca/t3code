"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderInstanceConfig,
  type ProviderInstanceEnvironmentVariable,
} from "@t3tools/contracts";

import { usePrimarySettings, useUpdatePrimarySettings } from "../../hooks/useSettings";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { toastManager } from "../ui/toast";

const CLAUDE_DRIVER_KIND = ProviderDriverKind.make("claudeAgent");

/**
 * Same slugging rules as `AddProviderInstanceDialog`: normalize the label
 * into a slug suffix and prefix the driver kind, keeping the composed id
 * under the 64-char `ProviderInstanceId` cap.
 */
function slugifyLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function deriveCustomClaudeEndpointInstanceId(label: string): string {
  const slug = slugifyLabel(label);
  return slug ? `${CLAUDE_DRIVER_KIND}_${slug}` : "";
}

/** URL-validate the base URL field. Returns an error string or null. */
export function validateCustomEndpointBaseUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Base URL is required.";
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "Enter a valid URL, e.g. http://127.0.0.1:8317.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Base URL must use http or https.";
  }
  return null;
}

/** Split the comma/whitespace-separated model ids input into unique ids. */
export function parseCustomEndpointModelIds(value: string): string[] {
  const seen = new Set<string>();
  const models: string[] = [];
  for (const candidate of value.split(/[,\n]/)) {
    const trimmed = candidate.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) continue;
    seen.add(trimmed);
    models.push(trimmed);
  }
  return models;
}

interface CustomClaudeEndpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create a Claude provider instance pointed at a custom Anthropic-compatible
 * endpoint. Persists a normal `claudeAgent` `ProviderInstanceConfig`: the
 * base URL and model ids live on the driver config (`baseUrl`,
 * `customModels`), and the API key — when provided — is stored as a
 * `sensitive` `ANTHROPIC_API_KEY` instance environment variable so the
 * server keeps it in the secret store and redacts it on read-back.
 */
export function CustomClaudeEndpointDialog({
  open,
  onOpenChange,
}: CustomClaudeEndpointDialogProps) {
  const settings = usePrimarySettings();
  const updateSettings = useUpdatePrimarySettings();

  const [label, setLabel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelIdsInput, setModelIdsInput] = useState("");
  // Errors are suppressed until the first submit attempt, then update live.
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const existingIds = useMemo(
    () => new Set(Object.keys(settings.providerInstances ?? {})),
    [settings.providerInstances],
  );

  const instanceId = deriveCustomClaudeEndpointInstanceId(label);
  const modelIds = useMemo(() => parseCustomEndpointModelIds(modelIdsInput), [modelIdsInput]);

  const labelError =
    label.trim().length === 0
      ? "Label is required."
      : instanceId.length === 0
        ? "Label must contain at least one letter or digit."
        : existingIds.has(instanceId)
          ? `An instance named '${instanceId}' already exists. Choose a different label.`
          : null;
  const baseUrlError = validateCustomEndpointBaseUrl(baseUrl);
  const modelIdsError = modelIds.length === 0 ? "Enter at least one model id." : null;
  const firstError = labelError ?? baseUrlError ?? modelIdsError;

  const resetForm = useCallback(() => {
    setLabel("");
    setBaseUrl("");
    setApiKey("");
    setModelIdsInput("");
    setHasAttemptedSubmit(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) resetForm();
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetForm],
  );

  const handleSave = useCallback(() => {
    setHasAttemptedSubmit(true);
    if (firstError !== null) return;

    const trimmedApiKey = apiKey.trim();
    const environment: ProviderInstanceEnvironmentVariable[] =
      trimmedApiKey.length > 0
        ? [{ name: "ANTHROPIC_API_KEY", value: trimmedApiKey, sensitive: true }]
        : [];
    const nextInstance: ProviderInstanceConfig = {
      driver: CLAUDE_DRIVER_KIND,
      enabled: true,
      displayName: label.trim(),
      ...(environment.length > 0 ? { environment } : {}),
      config: {
        baseUrl: baseUrl.trim(),
        customModels: modelIds,
      },
    };
    const brandedId = ProviderInstanceId.make(instanceId);
    const nextMap = {
      ...settings.providerInstances,
      [brandedId]: nextInstance,
    };
    try {
      updateSettings({ providerInstances: nextMap });
      toastManager.add({
        type: "success",
        title: "Custom endpoint added",
        description: `Claude instance '${instanceId}' now targets ${baseUrl.trim()}.`,
      });
      handleOpenChange(false);
    } catch (error) {
      toastManager.add({
        type: "error",
        title: "Could not add custom endpoint",
        description: error instanceof Error ? error.message : "Update failed.",
      });
    }
  }, [
    apiKey,
    baseUrl,
    firstError,
    handleOpenChange,
    instanceId,
    label,
    modelIds,
    settings.providerInstances,
    updateSettings,
  ]);

  const showError = (error: string | null) => (hasAttemptedSubmit ? error : null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>Custom Claude endpoint</DialogTitle>
          <DialogDescription>
            Point the Claude agent at an Anthropic-compatible API, such as a local proxy. Built-in
            Claude models are unavailable on a custom endpoint.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-4">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-foreground">Label</span>
            <Input
              placeholder="e.g. Local GPT"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-invalid={showError(labelError) !== null}
            />
            {showError(labelError) ? (
              <span className="text-[11px] text-destructive">{labelError}</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Shown in the model picker{instanceId ? ` as instance '${instanceId}'` : ""}.
              </span>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-foreground">Base URL</span>
            <Input
              placeholder="http://127.0.0.1:8317"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              aria-invalid={showError(baseUrlError) !== null}
            />
            {showError(baseUrlError) ? (
              <span className="text-[11px] text-destructive">{baseUrlError}</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Sent to the Claude agent as ANTHROPIC_BASE_URL.
              </span>
            )}
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-foreground">API key</span>
            <Input
              type="password"
              placeholder="Optional"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">
              Stored as a sensitive ANTHROPIC_API_KEY environment variable.
            </span>
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-medium text-foreground">Model IDs</span>
            <Input
              placeholder="e.g. gpt-5.6-sol"
              value={modelIdsInput}
              onChange={(event) => setModelIdsInput(event.target.value)}
              aria-invalid={showError(modelIdsError) !== null}
            />
            {showError(modelIdsError) ? (
              <span className="text-[11px] text-destructive">{modelIdsError}</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Comma-separated ids served by the endpoint.
              </span>
            )}
          </label>
        </DialogPanel>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            Add endpoint
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

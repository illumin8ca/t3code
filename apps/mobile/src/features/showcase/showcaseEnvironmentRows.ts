import { EnvironmentId } from "@t3tools/contracts";

import type { RelayEnvironmentView } from "../connection/useConnectionController";
import type { ConnectedEnvironmentSummary } from "../../state/remote-runtime-types";

const pocketPiId = EnvironmentId.make("showcase-pocket-pi");
const pocketPiEndpoint = {
  httpBaseUrl: "https://pocket-pi.t3.sh",
  wsBaseUrl: "wss://pocket-pi.t3.sh",
  providerKind: "t3_relay" as const,
};

export const SHOWCASE_CONNECTED_CLOUD_ENVIRONMENTS: ReadonlyArray<ConnectedEnvironmentSummary> = [
  {
    environmentId: EnvironmentId.make("showcase-aurora-gpu"),
    environmentLabel: "Aurora GPU Pod",
    displayUrl: "https://aurora-gpu.t3.sh",
    isRelayManaged: true,
    connectionState: "connected",
    connectionError: null,
    connectionErrorTraceId: null,
  },
];

export const SHOWCASE_AVAILABLE_CLOUD_ENVIRONMENTS: ReadonlyArray<RelayEnvironmentView> = [
  {
    environment: {
      environmentId: pocketPiId,
      label: "Pocket Pi",
      endpoint: pocketPiEndpoint,
      linkedAt: "2026-07-16T08:00:00.000Z",
    },
    availability: "online",
    status: {
      environmentId: pocketPiId,
      endpoint: pocketPiEndpoint,
      status: "online",
      checkedAt: "2026-07-16T08:41:00.000Z",
    },
    error: null,
    traceId: null,
  },
];

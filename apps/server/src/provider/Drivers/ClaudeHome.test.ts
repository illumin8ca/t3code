import * as NodeOS from "node:os";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";

import {
  makeClaudeCapabilitiesCacheKey,
  makeClaudeContinuationGroupKey,
  makeClaudeEnvironment,
  resolveClaudeHomePath,
} from "./ClaudeHome.ts";

it.layer(NodeServices.layer)("ClaudeHome", (it) => {
  describe("Claude home resolution", () => {
    it.effect("uses the process home when no Claude home override is configured", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const resolved = path.resolve(NodeOS.homedir());

        expect(yield* resolveClaudeHomePath({ homePath: "" })).toBe(resolved);
        expect(yield* makeClaudeEnvironment({ homePath: "", baseUrl: "" })).toBe(process.env);
      }),
    );

    it.effect("resolves configured Claude HOME and stamps continuation/cache keys with it", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const homePath = "~/.claude-work";
        const resolved = path.resolve(NodeOS.homedir(), ".claude-work");

        expect(yield* resolveClaudeHomePath({ homePath })).toBe(resolved);
        expect((yield* makeClaudeEnvironment({ homePath, baseUrl: "" })).CLAUDE_CONFIG_DIR).toBe(
          resolved,
        );
        expect(yield* makeClaudeContinuationGroupKey({ homePath, baseUrl: "" })).toBe(
          `claude:home:${resolved}`,
        );
        expect(
          yield* makeClaudeCapabilitiesCacheKey({ binaryPath: "claude", homePath, baseUrl: "" }),
        ).toBe(`claude\0${resolved}\0\0`);
      }),
    );

    it.effect("separates capability probes by cwd", () =>
      Effect.gen(function* () {
        const config = { binaryPath: "claude", homePath: "", baseUrl: "" };
        const first = yield* makeClaudeCapabilitiesCacheKey(config, "/repo-a");
        const second = yield* makeClaudeCapabilitiesCacheKey(config, "/repo-b");
        expect(first).not.toBe(second);
      }),
    );

    it.effect("keeps continuation compatible across instances with the same Claude HOME", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const resolved = path.resolve(NodeOS.homedir());

        expect(yield* makeClaudeContinuationGroupKey({ homePath: "", baseUrl: "" })).toBe(
          `claude:home:${resolved}`,
        );
      }),
    );
  });

  describe("custom Anthropic-compatible endpoint", () => {
    it.effect("injects ANTHROPIC_BASE_URL when a base URL is configured", () =>
      Effect.gen(function* () {
        const baseEnv = { PATH: "/usr/bin", ANTHROPIC_API_KEY: "sk-x" };
        const environment = yield* makeClaudeEnvironment(
          { homePath: "", baseUrl: "http://127.0.0.1:8317" },
          baseEnv,
        );

        expect(environment.ANTHROPIC_BASE_URL).toBe("http://127.0.0.1:8317");
        // Instance-environment variables (e.g. the sensitive API key) pass
        // through untouched, and no config dir is set without a homePath.
        expect(environment.ANTHROPIC_API_KEY).toBe("sk-x");
        expect(environment.PATH).toBe("/usr/bin");
        expect(environment.CLAUDE_CONFIG_DIR).toBeUndefined();
      }),
    );

    it.effect("combines a Claude HOME override with a custom base URL", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const homePath = "~/.claude-custom";
        const resolved = path.resolve(NodeOS.homedir(), ".claude-custom");
        const environment = yield* makeClaudeEnvironment(
          { homePath, baseUrl: "http://127.0.0.1:8317" },
          { PATH: "/usr/bin" },
        );

        expect(environment.CLAUDE_CONFIG_DIR).toBe(resolved);
        expect(environment.ANTHROPIC_BASE_URL).toBe("http://127.0.0.1:8317");
      }),
    );

    it.effect("does not inject ANTHROPIC_BASE_URL when the base URL is blank", () =>
      Effect.gen(function* () {
        const environment = yield* makeClaudeEnvironment(
          { homePath: "", baseUrl: "   " },
          { PATH: "/usr/bin" },
        );

        expect(environment.ANTHROPIC_BASE_URL).toBeUndefined();
      }),
    );

    it.effect("separates continuation groups for instances on different endpoints", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const resolved = path.resolve(NodeOS.homedir());
        const defaultKey = yield* makeClaudeContinuationGroupKey({ homePath: "", baseUrl: "" });
        const customKey = yield* makeClaudeContinuationGroupKey({
          homePath: "",
          baseUrl: "http://127.0.0.1:8317",
        });

        expect(defaultKey).toBe(`claude:home:${resolved}`);
        expect(customKey).toBe(`claude:home:${resolved}:base:http://127.0.0.1:8317`);
        expect(customKey).not.toBe(defaultKey);
      }),
    );

    it.effect("separates capabilities cache keys for instances on different endpoints", () =>
      Effect.gen(function* () {
        const shared = { binaryPath: "claude", homePath: "" };
        const defaultKey = yield* makeClaudeCapabilitiesCacheKey({ ...shared, baseUrl: "" });
        const customKey = yield* makeClaudeCapabilitiesCacheKey({
          ...shared,
          baseUrl: "http://127.0.0.1:8317",
        });

        expect(customKey).not.toBe(defaultKey);
      }),
    );
  });
});

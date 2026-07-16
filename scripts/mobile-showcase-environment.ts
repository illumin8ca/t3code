// @effect-diagnostics nodeBuiltinImport:off globalDate:off - This host-side fixture creates an isolated local T3 environment.
import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";
import * as NodeUtil from "node:util";

const execFile = NodeUtil.promisify(NodeChildProcess.execFile);

export const SHOWCASE_PROJECT_ID = "lumen-notes";
export const SHOWCASE_THREAD_ID = "polish-command-palette";
export const SHOWCASE_TERMINAL_ID = "term-1";

export const SHOWCASE_SCENES = ["threads", "thread", "terminal", "review"] as const;
export type ShowcaseScene = (typeof SHOWCASE_SCENES)[number];

const PROJECTOR_NAMES = [
  "projection.projects",
  "projection.threads",
  "projection.thread-messages",
  "projection.thread-proposed-plans",
  "projection.thread-activities",
  "projection.thread-sessions",
  "projection.thread-turns",
  "projection.checkpoints",
  "projection.pending-approvals",
] as const;

const MODEL_SELECTION = JSON.stringify({ instanceId: "codex", model: "gpt-5.4" });
const PROJECT_SCRIPTS = JSON.stringify([
  {
    id: "dev",
    name: "Dev",
    command: "pnpm dev",
    icon: "play",
    runOnWorktreeCreate: false,
  },
  {
    id: "test",
    name: "Tests",
    command: "pnpm test",
    icon: "test",
    runOnWorktreeCreate: false,
  },
]);

export const SHOWCASE_TERMINAL_BUFFER = [
  "\u001b[38;5;75m~/Code/lumen-notes\u001b[0m \u001b[38;5;212mfeat/command-palette\u001b[0m",
  "$ pnpm check",
  "",
  "  ✓ lint             1.3s",
  "  ✓ typecheck        2.1s",
  "  ✓ unit tests      84 passed",
  "  ✓ native checks    0 issues",
  "",
  "\u001b[32mAll checks passed\u001b[0m  ·  ready to ship ✦",
  "",
  "\u001b[38;5;75m~/Code/lumen-notes\u001b[0m \u001b[38;5;212mfeat/command-palette\u001b[0m $ ",
].join("\r\n");

const BASE_COMMAND_PALETTE = `import { Modal } from "react-native";

export function CommandPalette({ commands, open, query }: Props) {
  const visibleCommands = commands.filter((command) =>
    command.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal visible={open}>
      <CommandList commands={visibleCommands} />
    </Modal>
  );
}
`;

const UPDATED_COMMAND_PALETTE = `import { Modal } from "react-native";
import { rankCommands } from "./rankCommands";

export function CommandPalette({ commands, open, query, recentCommandIds }: Props) {
  const visibleCommands = rankCommands(commands, {
    query,
    recentCommandIds,
    limit: 12,
  });

  return (
    <Modal visible={open} animationType="fade">
      <PaletteHeader
        title="Jump anywhere"
        shortcut="⌘ K"
        resultCount={visibleCommands.length}
      />
      <CommandList commands={visibleCommands} />
    </Modal>
  );
}
`;

const RANK_COMMANDS = `export function rankCommands(commands: Command[], input: RankInput) {
  const query = input.query.trim().toLocaleLowerCase();
  return commands
    .map((command) => ({
      command,
      score: fuzzyScore(command.label, query),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit)
    .map((match) => match.command);
}
`;

function minutesBefore(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

async function runGit(workspaceRoot: string, args: ReadonlyArray<string>): Promise<void> {
  await execFile("git", [...args], {
    cwd: workspaceRoot,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Alex Rivera",
      GIT_AUTHOR_EMAIL: "alex@lumen.test",
      GIT_COMMITTER_NAME: "Alex Rivera",
      GIT_COMMITTER_EMAIL: "alex@lumen.test",
    },
  });
}

async function seedWorkspace(workspaceRoot: string): Promise<void> {
  await NodeFSP.mkdir(NodePath.join(workspaceRoot, "apps/mobile/src"), { recursive: true });
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "package.json"),
    JSON.stringify(
      { name: "lumen-notes", private: true, scripts: { check: "pnpm test" } },
      null,
      2,
    ),
  );
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "apps/mobile/src/CommandPalette.tsx"),
    BASE_COMMAND_PALETTE,
  );
  await runGit(workspaceRoot, ["init", "-b", "main"]);
  await runGit(workspaceRoot, [
    "remote",
    "add",
    "origin",
    "https://github.com/lumen-labs/lumen-notes.git",
  ]);
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "Initial command palette"]);
  await runGit(workspaceRoot, ["checkout", "-b", "feat/command-palette"]);
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "apps/mobile/src/CommandPalette.tsx"),
    UPDATED_COMMAND_PALETTE,
  );
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "apps/mobile/src/rankCommands.ts"),
    RANK_COMMANDS,
  );
}

function insertThread(
  database: NodeSqlite.DatabaseSync,
  now: number,
  input: {
    readonly id: string;
    readonly title: string;
    readonly branch: string;
    readonly minutesAgo: number;
    readonly state?: "working" | "approval" | "plan";
    readonly workspaceRoot: string;
  },
): void {
  const turnId = `${input.id}-turn`;
  const updatedAt = minutesBefore(now, input.minutesAgo);
  const isWorking = input.state === "working";
  database
    .prepare(
      `INSERT INTO projection_threads (
        thread_id, project_id, title, model_selection_json, runtime_mode, interaction_mode,
        branch, worktree_path, latest_turn_id, latest_user_message_at, pending_approval_count,
        pending_user_input_count, has_actionable_proposed_plan, created_at, updated_at,
        archived_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, NULL)`,
    )
    .run(
      input.id,
      SHOWCASE_PROJECT_ID,
      input.title,
      MODEL_SELECTION,
      "full-access",
      input.state === "plan" ? "plan" : "default",
      input.branch,
      input.workspaceRoot,
      turnId,
      minutesBefore(now, input.minutesAgo + 1),
      input.state === "approval" ? 1 : 0,
      input.state === "plan" ? 1 : 0,
      minutesBefore(now, input.minutesAgo + 120),
      updatedAt,
    );
  database
    .prepare(
      `INSERT INTO projection_turns (
        thread_id, turn_id, pending_message_id, assistant_message_id, state, requested_at,
        started_at, completed_at, checkpoint_turn_count, checkpoint_ref, checkpoint_status,
        checkpoint_files_json, source_proposed_plan_thread_id, source_proposed_plan_id
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, NULL, NULL, NULL, '[]', NULL, NULL)`,
    )
    .run(
      input.id,
      turnId,
      isWorking ? null : `${input.id}-answer`,
      isWorking ? "running" : "completed",
      minutesBefore(now, input.minutesAgo + 2),
      minutesBefore(now, input.minutesAgo + 2),
      isWorking ? null : updatedAt,
    );
  database
    .prepare(
      `INSERT INTO projection_thread_sessions (
        thread_id, status, provider_name, provider_instance_id, provider_session_id,
        provider_thread_id, runtime_mode, active_turn_id, last_error, updated_at
      ) VALUES (?, ?, 'Codex', 'codex', NULL, NULL, 'full-access', ?, NULL, ?)`,
    )
    .run(input.id, isWorking ? "running" : "ready", isWorking ? turnId : null, updatedAt);
}

function seedDatabase(dbPath: string, workspaceRoot: string, now: number): void {
  const database = new NodeSqlite.DatabaseSync(dbPath);
  try {
    database.exec("BEGIN IMMEDIATE");
    for (const table of [
      "projection_pending_approvals",
      "projection_thread_proposed_plans",
      "projection_thread_activities",
      "projection_thread_messages",
      "projection_thread_sessions",
      "projection_turns",
      "projection_threads",
      "projection_projects",
      "projection_state",
    ]) {
      database.exec(`DELETE FROM ${table}`);
    }
    database
      .prepare(
        `INSERT INTO projection_projects (
          project_id, title, workspace_root, default_model_selection_json, scripts_json,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(
        SHOWCASE_PROJECT_ID,
        "Lumen Notes",
        workspaceRoot,
        MODEL_SELECTION,
        PROJECT_SCRIPTS,
        minutesBefore(now, 60 * 24 * 30),
        minutesBefore(now, 2),
      );

    for (const thread of [
      {
        id: SHOWCASE_THREAD_ID,
        title: "Polish the command palette",
        branch: "feat/command-palette",
        minutesAgo: 2,
      },
      {
        id: "offline-first-sync",
        title: "Make sync feel instant",
        branch: "feat/offline-sync",
        minutesAgo: 14,
        state: "working" as const,
      },
      {
        id: "share-sheet",
        title: "Add a beautiful share sheet",
        branch: "feat/share-sheet",
        minutesAgo: 47,
        state: "approval" as const,
      },
      {
        id: "editor-motion",
        title: "Smooth editor transitions",
        branch: "perf/editor-motion",
        minutesAgo: 126,
        state: "plan" as const,
      },
    ]) {
      insertThread(database, now, { ...thread, workspaceRoot });
    }

    const turnId = `${SHOWCASE_THREAD_ID}-turn`;
    const insertMessage = database.prepare(
      `INSERT INTO projection_thread_messages (
        message_id, thread_id, turn_id, role, text, is_streaming, attachments_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    );
    insertMessage.run(
      "palette-request",
      SHOWCASE_THREAD_ID,
      turnId,
      "user",
      "Make the command palette feel fast, calm, and unmistakably native. Add fuzzy search and keyboard shortcuts.",
      minutesBefore(now, 8),
      minutesBefore(now, 8),
    );
    insertMessage.run(
      `${SHOWCASE_THREAD_ID}-answer`,
      SHOWCASE_THREAD_ID,
      turnId,
      "assistant",
      "The command palette is ready. Search now ranks exact and recent matches first, every action shows its shortcut, and the transition stays smooth even with hundreds of commands.\n\nI also added focused keyboard-navigation tests and verified the full mobile check suite.",
      minutesBefore(now, 2),
      minutesBefore(now, 2),
    );

    const insertActivity = database.prepare(
      `INSERT INTO projection_thread_activities (
        activity_id, thread_id, turn_id, tone, kind, summary, payload_json, sequence, created_at
      ) VALUES (?, ?, ?, 'tool', 'tool.completed', ?, ?, ?, ?)`,
    );
    insertActivity.run(
      "inspect-components",
      SHOWCASE_THREAD_ID,
      turnId,
      "Explored the navigation and command registry",
      JSON.stringify({
        itemType: "command_execution",
        title: "Explored the navigation and command registry",
        detail: "Found shared command metadata and keyboard routing",
        status: "completed",
      }),
      1,
      minutesBefore(now, 7),
    );
    insertActivity.run(
      "edit-palette",
      SHOWCASE_THREAD_ID,
      turnId,
      "Built the new palette experience",
      JSON.stringify({
        itemType: "file_change",
        title: "Built the new palette experience",
        detail: "6 files changed · fuzzy ranking · native shortcuts",
        status: "completed",
      }),
      2,
      minutesBefore(now, 6),
    );

    for (const [index, projector] of PROJECTOR_NAMES.entries()) {
      database
        .prepare(
          "INSERT INTO projection_state (projector, last_applied_sequence, updated_at) VALUES (?, ?, ?)",
        )
        .run(projector, index + 1, minutesBefore(now, 1));
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }
}

export async function seedShowcaseEnvironment(input: {
  readonly baseDir: string;
  readonly now?: number;
}): Promise<{ readonly dbPath: string; readonly workspaceRoot: string }> {
  const now = input.now ?? Date.now();
  const workspaceRoot = NodePath.join(input.baseDir, "workspace", "lumen-notes");
  const dbPath = NodePath.join(input.baseDir, "userdata", "state.sqlite");
  await seedWorkspace(workspaceRoot);
  seedDatabase(dbPath, workspaceRoot, now);

  const terminalDirectory = NodePath.join(input.baseDir, "userdata", "logs", "terminals");
  const safeThreadId = Buffer.from(SHOWCASE_THREAD_ID).toString("base64url");
  await NodeFSP.mkdir(terminalDirectory, { recursive: true });
  await NodeFSP.writeFile(
    NodePath.join(terminalDirectory, `terminal_${safeThreadId}.log`),
    SHOWCASE_TERMINAL_BUFFER,
  );
  return { dbPath, workspaceRoot };
}

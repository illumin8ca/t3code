// @effect-diagnostics nodeBuiltinImport:off globalDate:off - This host-side fixture creates an isolated local T3 environment.
import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeSqlite from "node:sqlite";
import * as NodeUtil from "node:util";

const execFile = NodeUtil.promisify(NodeChildProcess.execFile);

export const SHOWCASE_PROJECT_ID = "codex";
export const SHOWCASE_THREAD_ID = "terminal-heartbeat";
export const SHOWCASE_TERMINAL_ID = "term-1";

export const SHOWCASE_SCENES = ["threads", "thread", "terminal", "review", "environments"] as const;
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
  "\u001b[38;5;75m~/Code/codex\u001b[0m \u001b[38;5;212mfeat/terminal-heartbeat\u001b[0m",
  "$ cargo nextest run --workspace",
  "",
  "  \u001b[38;5;117mcodex-core\u001b[0m         418 passed",
  "  \u001b[38;5;213mcodex-tui\u001b[0m          267 passed",
  "  \u001b[38;5;221mprotocol\u001b[0m           162 passed",
  "",
  "\u001b[32m✨ 847 tests passed\u001b[0m  ·  terminal pulse is steady",
  "",
  "\u001b[38;5;75m~/Code/codex\u001b[0m \u001b[38;5;212mfeat/terminal-heartbeat\u001b[0m $ ",
].join("\r\n");

const BASE_STATUS_INDICATOR = `use ratatui::text::Line;

pub(crate) fn status_line(label: &str) -> Line<'static> {
    Line::from(format!("  {label}"))
}
`;

const UPDATED_STATUS_INDICATOR = `use ratatui::{style::Stylize, text::{Line, Span}};

const PULSE: [&str; 4] = ["✦", "✧", "·", "✧"];

pub(crate) fn status_line(label: &str, frame: usize) -> Line<'static> {
    Line::from(vec![
        Span::raw("  "),
        Span::raw(PULSE[frame % PULSE.len()]).cyan(),
        Span::raw(format!("  {label}")).white(),
    ])
}
`;

const TOOL_CALL_CARD = `use ratatui::{style::Stylize, text::Line};

pub(crate) fn completed_tool(title: &str, detail: &str) -> Vec<Line<'static>> {
    vec![
        Line::from(format!("  ✓  {title}")).green().bold(),
        Line::from(format!("     {detail}")).dark_gray(),
    ]
}
`;

const PROJECT_FAVICONS = {
  codex: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="8" y1="8" x2="56" y2="56"><stop stop-color="#182848"/><stop offset="1" stop-color="#10151f"/></linearGradient></defs>
  <rect width="64" height="64" rx="15" fill="url(#g)"/>
  <path d="M17 22l10 10-10 10M31 43h16" fill="none" stroke="#79e7ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M46 13l1.7 4.3L52 19l-4.3 1.7L46 25l-1.7-4.3L40 19l4.3-1.7z" fill="#ffd166"/>
</svg>`,
  react: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#20232a"/>
  <g fill="none" stroke="#61dafb" stroke-width="2.8"><ellipse cx="32" cy="32" rx="25" ry="9"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="25" ry="9" transform="rotate(120 32 32)"/></g>
  <circle cx="32" cy="32" r="4.8" fill="#61dafb"/>
</svg>`,
  linux: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="15" fill="#f7c948"/>
  <ellipse cx="32" cy="35" rx="17" ry="22" fill="#202124"/>
  <ellipse cx="32" cy="40" rx="12" ry="14" fill="#f5f5f2"/>
  <circle cx="27" cy="24" r="5" fill="white"/><circle cx="37" cy="24" r="5" fill="white"/>
  <circle cx="28" cy="25" r="2"/><circle cx="36" cy="25" r="2"/>
  <path d="M27 31l5-4 5 4-5 4z" fill="#f28c28"/><path d="M16 55h14l-7-5zM34 55h14l-7-5z" fill="#f28c28"/>
</svg>`,
} as const;

export const SHOWCASE_PROJECTS = [
  {
    id: "codex",
    title: "Codex",
    directory: "codex",
    repositoryUrl: "https://github.com/openai/codex.git",
    favicon: PROJECT_FAVICONS.codex,
  },
  {
    id: "react",
    title: "React",
    directory: "react",
    repositoryUrl: "https://github.com/facebook/react.git",
    favicon: PROJECT_FAVICONS.react,
  },
  {
    id: "linux",
    title: "Linux",
    directory: "linux",
    repositoryUrl: "https://github.com/torvalds/linux.git",
    favicon: PROJECT_FAVICONS.linux,
  },
] as const;

export const SHOWCASE_ENVIRONMENTS = [
  {
    id: "moonbase-terminal",
    label: "Moonbase Terminal",
    projectIds: ["codex"],
  },
  {
    id: "suspense-station",
    label: "Suspense Station",
    projectIds: ["react"],
  },
  {
    id: "kernel-cabin",
    label: "Kernel Cabin",
    projectIds: ["linux"],
  },
] as const;

export const SHOWCASE_THREADS = [
  {
    id: SHOWCASE_THREAD_ID,
    projectId: "codex",
    title: "Give the terminal a heartbeat ✦",
    branch: "feat/terminal-heartbeat",
    minutesAgo: 3,
    request:
      "Give the Codex terminal a little pulse. Stream tool calls as crisp cards, make success feel electric, and keep everything fast enough to disappear.",
    response:
      "The terminal has a heartbeat now — expressive, but never noisy. ✦\n\n- Tool calls arrive as compact live cards\n- Successful runs resolve with a subtle electric pulse\n- Reconnects preserve the exact animation frame\n- Reduced-motion mode stays completely calm\n\nI also ran the full Rust workspace: **847 tests passed**.",
  },
  {
    id: "green-build-celebration",
    projectId: "codex",
    title: "Teach agents to celebrate green builds",
    branch: "feat/green-builds",
    minutesAgo: 21,
    state: "approval" as const,
    request: "Make successful builds feel rewarding without turning the CLI into a slot machine.",
    response:
      "Added a restrained success moment: one shimmer, one crisp summary, then straight back to work. The final color treatment is ready for approval.",
  },
  {
    id: "buttery-suspense",
    projectId: "react",
    title: "Make Suspense transitions buttery",
    branch: "perf/buttery-suspense",
    minutesAgo: 12,
    state: "working" as const,
    request:
      "Trace the last few dropped frames in nested Suspense transitions and make them disappear.",
    response: null,
  },
  {
    id: "hydration-haikus",
    projectId: "react",
    title: "Turn hydration warnings into haikus",
    branch: "dev/hydration-haikus",
    minutesAgo: 44,
    request:
      "Keep hydration errors precise, but make the development copy unexpectedly delightful.",
    response:
      "The diagnostics still lead with the exact mismatch and component stack. A tiny optional haiku now closes the expanded explanation.",
  },
  {
    id: "beautiful-boot",
    projectId: "linux",
    title: "Make boot logs oddly beautiful",
    branch: "feat/beautiful-boot",
    minutesAgo: 34,
    state: "plan" as const,
    request:
      "Design a clearer boot timeline that remains useful over serial and never hides kernel detail.",
    response:
      "The plan groups milestones without changing the underlying log stream, preserves plain-text output, and adds zero work to the hot path.",
  },
  {
    id: "scheduler-breathe",
    projectId: "linux",
    title: "Let the scheduler breathe",
    branch: "perf/scheduler-breathe",
    minutesAgo: 76,
    request:
      "Find a calmer balancing strategy for bursty mixed workloads without hurting tail latency.",
    response:
      "The new heuristic reduces needless migrations during short bursts while preserving the existing latency guardrails.",
  },
] as const;

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

async function initializeRepository(input: {
  readonly workspaceRoot: string;
  readonly repositoryUrl: string;
  readonly commitMessage: string;
}): Promise<void> {
  await runGit(input.workspaceRoot, ["init", "-b", "main"]);
  await runGit(input.workspaceRoot, ["remote", "add", "origin", input.repositoryUrl]);
  await runGit(input.workspaceRoot, ["add", "."]);
  await runGit(input.workspaceRoot, ["commit", "-m", input.commitMessage]);
}

async function seedCodexWorkspace(workspaceRoot: string): Promise<void> {
  await NodeFSP.mkdir(NodePath.join(workspaceRoot, "codex-rs/tui/src"), { recursive: true });
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "Cargo.toml"),
    `[workspace]\nmembers = ["codex-rs/tui"]\nresolver = "2"\n`,
  );
  await NodeFSP.writeFile(NodePath.join(workspaceRoot, "favicon.svg"), PROJECT_FAVICONS.codex);
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "codex-rs/tui/src/status_indicator.rs"),
    BASE_STATUS_INDICATOR,
  );
  await initializeRepository({
    workspaceRoot,
    repositoryUrl: "https://github.com/openai/codex.git",
    commitMessage: "Render terminal status",
  });
  await runGit(workspaceRoot, ["checkout", "-b", "feat/terminal-heartbeat"]);
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "codex-rs/tui/src/status_indicator.rs"),
    UPDATED_STATUS_INDICATOR,
  );
  await NodeFSP.writeFile(
    NodePath.join(workspaceRoot, "codex-rs/tui/src/tool_call_card.rs"),
    TOOL_CALL_CARD,
  );
}

async function seedCompanionWorkspace(input: {
  readonly workspaceRoot: string;
  readonly title: string;
  readonly repositoryUrl: string;
  readonly favicon: string;
}): Promise<void> {
  await NodeFSP.mkdir(input.workspaceRoot, { recursive: true });
  await NodeFSP.writeFile(NodePath.join(input.workspaceRoot, "favicon.svg"), input.favicon);
  await NodeFSP.writeFile(
    NodePath.join(input.workspaceRoot, "README.md"),
    `# ${input.title}\n\nSeeded by the T3 Code mobile screenshot harness.\n`,
  );
  await initializeRepository({
    workspaceRoot: input.workspaceRoot,
    repositoryUrl: input.repositoryUrl,
    commitMessage: `Seed ${input.title} workspace`,
  });
}

function insertThread(
  database: NodeSqlite.DatabaseSync,
  now: number,
  input: {
    readonly id: string;
    readonly projectId: string;
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
      input.projectId,
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

function seedDatabase(
  dbPath: string,
  workspaceRoots: ReadonlyMap<string, string>,
  projects: ReadonlyArray<(typeof SHOWCASE_PROJECTS)[number]>,
  threads: ReadonlyArray<(typeof SHOWCASE_THREADS)[number]>,
  now: number,
): void {
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
    const insertProject = database.prepare(
      `INSERT INTO projection_projects (
          project_id, title, workspace_root, default_model_selection_json, scripts_json,
          created_at, updated_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    );
    for (const [index, project] of projects.entries()) {
      const workspaceRoot = workspaceRoots.get(project.id);
      if (!workspaceRoot) throw new Error(`Missing workspace root for ${project.id}.`);
      const latestThreadMinutes = Math.min(
        ...threads
          .filter((thread) => thread.projectId === project.id)
          .map((thread) => thread.minutesAgo),
      );
      insertProject.run(
        project.id,
        project.title,
        workspaceRoot,
        MODEL_SELECTION,
        PROJECT_SCRIPTS,
        minutesBefore(now, 60 * 24 * (90 - index * 12)),
        minutesBefore(now, latestThreadMinutes),
      );
    }

    for (const thread of threads) {
      const workspaceRoot = workspaceRoots.get(thread.projectId);
      if (!workspaceRoot) throw new Error(`Missing workspace root for ${thread.projectId}.`);
      insertThread(database, now, {
        ...thread,
        ...("state" in thread ? { state: thread.state } : {}),
        workspaceRoot,
      });
    }

    const insertMessage = database.prepare(
      `INSERT INTO projection_thread_messages (
        message_id, thread_id, turn_id, role, text, is_streaming, attachments_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    );
    for (const thread of threads) {
      const turnId = `${thread.id}-turn`;
      const requestTime = minutesBefore(now, thread.minutesAgo + 5);
      insertMessage.run(
        `${thread.id}-request`,
        thread.id,
        turnId,
        "user",
        thread.request,
        requestTime,
        requestTime,
      );
      if (thread.response !== null) {
        const responseTime = minutesBefore(now, thread.minutesAgo);
        insertMessage.run(
          `${thread.id}-answer`,
          thread.id,
          turnId,
          "assistant",
          thread.response,
          responseTime,
          responseTime,
        );
      }
    }

    const turnId = `${SHOWCASE_THREAD_ID}-turn`;
    const insertActivity = database.prepare(
      `INSERT INTO projection_thread_activities (
        activity_id, thread_id, turn_id, tone, kind, summary, payload_json, sequence, created_at
      ) VALUES (?, ?, ?, 'tool', 'tool.completed', ?, ?, ?, ?)`,
    );
    insertActivity.run(
      "trace-render-loop",
      SHOWCASE_THREAD_ID,
      turnId,
      "Traced the terminal rendering loop",
      JSON.stringify({
        itemType: "command_execution",
        title: "Traced the terminal rendering loop",
        detail: "Found a zero-allocation path for the pulse frames",
        status: "completed",
      }),
      1,
      minutesBefore(now, 8),
    );
    insertActivity.run(
      "paint-tool-cards",
      SHOWCASE_THREAD_ID,
      turnId,
      "Painted live tool-call cards",
      JSON.stringify({
        itemType: "file_change",
        title: "Painted live tool-call cards",
        detail: "2 files changed · cyan pulse · calm reconnects",
        status: "completed",
      }),
      2,
      minutesBefore(now, 6),
    );
    insertActivity.run(
      "run-rust-suite",
      SHOWCASE_THREAD_ID,
      turnId,
      "Ran the Rust workspace",
      JSON.stringify({
        itemType: "command_execution",
        title: "Ran the Rust workspace",
        detail: "847 tests passed · 0 flaky retries",
        status: "completed",
      }),
      3,
      minutesBefore(now, 4),
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
  readonly projectIds?: ReadonlyArray<string>;
  readonly now?: number;
}): Promise<{ readonly dbPath: string; readonly workspaceRoot: string }> {
  const now = input.now ?? Date.now();
  const selectedProjectIds = new Set(
    input.projectIds ?? SHOWCASE_PROJECTS.map((project) => project.id),
  );
  const projects = SHOWCASE_PROJECTS.filter((project) => selectedProjectIds.has(project.id));
  if (projects.length === 0) throw new Error("At least one showcase project must be selected.");
  const threads = SHOWCASE_THREADS.filter((thread) => selectedProjectIds.has(thread.projectId));
  const workspaceBase = NodePath.join(input.baseDir, "workspace");
  const workspaceRoots = new Map(
    projects.map(
      (project) => [project.id, NodePath.join(workspaceBase, project.directory)] as const,
    ),
  );
  const primaryProject =
    projects.find((project) => project.id === SHOWCASE_PROJECT_ID) ?? projects[0];
  if (!primaryProject) throw new Error("The primary showcase workspace is not configured.");
  const workspaceRoot = workspaceRoots.get(primaryProject.id);
  if (!workspaceRoot) throw new Error("The primary showcase workspace is not configured.");
  const dbPath = NodePath.join(input.baseDir, "userdata", "state.sqlite");
  if (primaryProject.id === SHOWCASE_PROJECT_ID) {
    await seedCodexWorkspace(workspaceRoot);
  }
  await Promise.all(
    projects
      .filter((project) => project.id !== SHOWCASE_PROJECT_ID)
      .map(async (project) => {
        const projectWorkspaceRoot = workspaceRoots.get(project.id);
        if (!projectWorkspaceRoot) throw new Error(`Missing workspace root for ${project.id}.`);
        await seedCompanionWorkspace({
          workspaceRoot: projectWorkspaceRoot,
          title: project.title,
          repositoryUrl: project.repositoryUrl,
          favicon: project.favicon,
        });
      }),
  );
  seedDatabase(dbPath, workspaceRoots, projects, threads, now);

  const terminalDirectory = NodePath.join(input.baseDir, "userdata", "logs", "terminals");
  if (selectedProjectIds.has(SHOWCASE_PROJECT_ID)) {
    const safeThreadId = Buffer.from(SHOWCASE_THREAD_ID).toString("base64url");
    await NodeFSP.mkdir(terminalDirectory, { recursive: true });
    await NodeFSP.writeFile(
      NodePath.join(terminalDirectory, `terminal_${safeThreadId}.log`),
      SHOWCASE_TERMINAL_BUFFER,
    );
  }
  return { dbPath, workspaceRoot };
}

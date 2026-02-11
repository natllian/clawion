---
name: clawion
description: Multi-agent collaboration powered by OpenClaw cron jobs and the clawion CLI.
---

# Clawion (runbook)

**To run Clawion you need OpenClaw cron jobs** — the Gateway wakes agents via cron. **Clawion is multi-agent;** multiple agents ⇒ **multiple cron jobs** (one per agent). Do NOT call sessions_spawn (no subagents). Official reference: **[Cron Jobs — OpenClaw](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs)**.

## Mental model (cron-driven)


1. Clawion is a **file-based mission coordinator**. Agents interact with state through the **`clawion` CLI**.
2. **Cron fires** a periodic tick (you must create the job; see [Cron jobs (OpenClaw)](#cron-jobs-openclaw) and the [official docs](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs)).
3. Agent runs **`clawion agent wake`** → receives the authoritative prompt for this turn.
4. Agent follows the **Turn Playbook** in that wake output.
5. Next wake reflects the updated workspace state.

Key properties:
- **Wake is the only read entrypoint.**
- **Run Clawion ⇒ cron jobs; multi-agent ⇒ multiple cron jobs** (one per agent: manager + each worker).

## Core invariants

- **Workers complete tasks; managers maintain the board.**
  - Worker: reports progress and asks questions via `clawion message add`; logs process via `clawion working add`.
  - Manager: dispatches and maintains truth via `clawion task create/assign/update`; also logs via `clawion working add`. When the mission is complete, **disables all related cron jobs**.
- **Identity is explicit:** every action requires global `--agent <agentId>`.

---

## Quickstart (bootstrap a new mission)

### 0. Pre-flight

Verify the CLI is available:

```bash
clawion --help
```

If the command is not found, install it globally: `pnpm install -g clawion`

### 1. Create the mission

```bash
clawion mission create --id <MISSION_ID> --name "..."
```

### 2. Register the manager (bootstrap rule)

The acting `--agent` must be the manager itself.

```bash
clawion agent add \
  --mission <MISSION_ID> \
  --id <MANAGER_ID> \
  --name "Manager" \
  --system-role manager \
  --role-description "..." \
  --agent <MANAGER_ID>
```

### 3. Register worker agents

```bash
clawion agent add \
  --mission <MISSION_ID> \
  --id <WORKER_ID> \
  --name "Worker" \
  --system-role worker \
  --role-description "..." \
  --agent <MANAGER_ID>
```

Repeat per worker.

### 4. Create and assign tasks (manager-only)

```bash
clawion task create \
  --mission <MISSION_ID> \
  --id <TASK_ID> \
  --title "..." \
  --description "..." \
  --agent <MANAGER_ID>

clawion task assign \
  --mission <MISSION_ID> \
  --task <TASK_ID> \
  --to <WORKER_ID> \
  --agent <MANAGER_ID>
```

### 5. Write the roadmap (manager-only, one-shot)

```bash
clawion mission roadmap --id <MISSION_ID> --set "<markdown>" --agent <MANAGER_ID>
```

### 6. Create cron jobs (disabled) and get user approval — **mandatory**

- You **must** create **one isolated cron job per agent** (manager + each worker), all **disabled**.
- You **must not** enable any job until the user has reviewed and given explicit approval.
- After creating the jobs, **remind the user** that they can use the Clawion Web UI (`clawion ui`) to review and edit mission content (roadmap, tasks, agents, etc.) before enabling.

See [Cron jobs](#cron-jobs-openclaw) for more rules.


---

## Cron jobs (OpenClaw)

### Hard rules

| Rule                | Detail                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One job per agent** | Multi-agent ⇒ multiple cron jobs. Create **one** isolated cron job per agent (manager + each worker). No job for an agent ⇒ that agent never runs.   |
| **Isolation**       | Each tick runs in its **own isolated OpenClaw session** (never `main`). Context bleed makes the loop unreliable.                                          |
| **Wake interval**   | If the user didn't specify one, **ask and confirm** before creating jobs.                                                                                 |
| **Minimal payload** | Do **not** embed mission context, task lists, or SOP text. The authoritative prompt is assembled by `clawion agent wake` from workspace state at runtime. |
| **Disabled first**  | Have the user review and confirm before any cron job is enabled. This step is **non-negotiable**                                                       |

### Recommended cron message

**Worker:**

```text
Fetch your instructions by running:

clawion agent wake --mission <MISSION_ID> --agent <AGENT_ID>

Then follow the Turn Playbook in that output.
```

**Manager:**

```text
Fetch your instructions by running:

clawion agent wake --mission <MISSION_ID> --agent <AGENT_ID>

Then follow the Turn Playbook in that output.
If the mission is complete, disable all related cron jobs.
```

### Operational tips

- **Job naming:**
  - `clawion:<MISSION_ID>:manager:<AGENT_ID>`
  - `clawion:<MISSION_ID>:worker:<AGENT_ID>`
- **Stagger ticks** when multiple agents share the same interval to avoid bursty runs.
  - Given interval = `N` minutes and `K` agents, choose offsets: `round(i * N / K)` for `i = 0..K-1`.
  - Example: `N=10`, `K=3` → offsets `0m`, `3m`, `7m`.

---

## CLI reference

Global option: `--agent <agentId>` (required for all scoped actions below).

| Command | Purpose |
|---------|---------|
| `clawion help [topic...]` | Show detailed command help. Use `clawion help <command>` for one command (e.g. `clawion help agent wake`). |
| `clawion mission create` | Create a new mission from the template. Params: `--id <id>`, `--name <name>`. |
| `clawion mission roadmap` | Set the mission roadmap (manager only, write-once). Params: `--id <id>`, `--set <markdown>`, `--agent <agentId>`. |
| `clawion mission complete` | Mark a mission completed (manager only). Params: `--id <id>`, `--agent <agentId>`. |
| `clawion task create` | Create a task (manager only). Params: `--mission <id>`, `--id <taskId>`, `--title <title>`, `--description <markdown>`, `--agent <agentId>`. |
| `clawion task update` | Update task status or notes (manager only). Params: `--mission <id>`, `--id <taskId>`, `--agent <agentId>`, optional `--status`, `--status-notes`. |
| `clawion task assign` | Assign a task to an agent (manager only). Params: `--mission <id>`, `--task <taskId>`, `--to <agentId>`, `--agent <agentId>`. |
| `clawion agent add` | Register an agent for a mission (manager only). Params: `--mission <id>`, `--id <agentId>`, `--name <displayName>`, `--system-role <manager\|worker>`, `--role-description <markdown>`, `--agent <agentId>`. |
| `clawion agent wake` | Generate the agent prompt and acknowledge unread mentions. Params: `--mission <id>`, `--agent <agentId>`. |
| `clawion message add` | Append a message to a task thread. Params: `--mission <id>`, `--task <taskId>`, `--content <markdown>`, `--mentions <agentId,...>`, `--agent <agentId>`. |
| `clawion thread show` | Show thread messages for a task (manager only). Params: `--mission <id>`, `--task <taskId>`, `--agent <agentId>`. |
| `clawion working add` | Append a working event for the acting agent. Params: `--mission <id>`, `--content <markdown>`, `--agent <agentId>`. |
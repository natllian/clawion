---
name: clawion
description: Multi-agent collaboration powered by OpenClaw cron jobs and the clawion CLI (wake-driven workflow).
---

# Clawion (runbook)

**Recurring or periodic work in Clawion must be implemented via OpenClaw cron jobs.** Do not rely on ad-hoc runs or "remember to run later" — create cron jobs so the Gateway wakes agents on schedule. Official reference: **[Cron Jobs — OpenClaw](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs)**.

Clawion is **multi-agent**: every agent (the manager and each worker) must have **one dedicated cron job**. One job per agent — no sharing. Clawion is also a **file-based mission coordinator**. Agents interact with state through the **`clawion` CLI**.

## Mental model (cron-driven)

Clawion is **wake-driven** — OpenClaw cron is the only reliable engine for periodic runs.

1. **Cron fires** a periodic tick (you must create the job; see [Cron jobs (OpenClaw)](#cron-jobs-openclaw) and the [official docs](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs)).
2. Agent runs **`clawion agent wake`** → receives the authoritative prompt for this turn.
3. Agent follows the **Turn Playbook** in that wake output.
4. Next wake reflects the updated workspace state.

Key properties:
- **Wake is the only read entrypoint.**
- **One cron job per agent.** The manager and every worker each get their own job; multi-agent ⇒ multiple jobs.
- **No cron job ⇒ no scheduled runs.** Always create cron jobs for missions that need periodic execution.

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

> The roadmap can only be written **once** via the CLI. Any subsequent edits must be made by a human in the Web UI.

### 6. Create cron jobs (disabled) and get user approval — **mandatory**

Clawion is **multi-agent**: you **must** create **one isolated cron job per agent** — one for the manager, one for each worker. All jobs **disabled** until the user approves. You **must not** enable any job until the user has reviewed in the Clawion Web UI and given explicit approval.

- **Do not skip this step.** Without cron jobs, the mission will not run on schedule. When in doubt, create the jobs and leave them disabled until the user approves.
- Use OpenClaw’s cron API/CLI; canonical behavior and JSON shapes: **[Cron Jobs — OpenClaw](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs)**.
- Payload rules and naming: see [Cron jobs (OpenClaw)](#cron-jobs-openclaw) below.

**Required:** Have the user review through the Web UI and confirm before any cron job is enabled. This step is **non-negotiable**.

---

## Cron jobs (OpenClaw)

**Canonical reference:** [Cron Jobs — OpenClaw](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs) (schedule kinds, `sessionTarget: "isolated"`, payload shapes, delivery, CLI/API).

### Hard rules

| Rule                | Detail                                                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create jobs**     | Multi-agent ⇒ one cron job per agent. You **must** create **one** OpenClaw cron job **per agent** (manager + each worker). No cron job for an agent ⇒ that agent never runs on schedule. |
| **Isolation**       | Each tick runs in its **own isolated OpenClaw session** (`sessionTarget: "isolated"`, never `main`). Context bleed makes the loop unreliable.              |
| **Wake interval**   | If the user didn't specify one, **ask and confirm** before creating jobs.                                                                                 |
| **Minimal payload** | Do **not** embed mission context, task lists, or SOP text. The authoritative prompt is assembled by `clawion agent wake` from workspace state at runtime. |
| **Disabled first**  | Always create jobs disabled. Enable only after the user reviews in the Web UI (quickstart step 6).                                                        |

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

### Before you finish

- **Did you create one cron job per agent?** Multi-agent means one job for the manager and one for each worker. If you only created one job or forgot a worker, that agent will never run on schedule. Double-check: [Cron Jobs — OpenClaw](https://docs.openclaw.ai/automation/cron-jobs#cron-jobs).

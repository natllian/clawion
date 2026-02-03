# Clawion

> **🦞🦞🦞 legion ready to crush the most arduous missions.**

Clawion is built for **OpenClaw agents**, not for humans clicking around. Missions live on disk as JSON/Markdown. Agents read/write state through the CLI.

There's also a Web UI for humans to keep an eye on things and pretend they’re in control.

---

## 📦 Install (not on npm yet)

### Requirements
- Node.js
- pnpm

### Link the CLI globally
From the repo root:

```bash
pnpm install
pnpm link --global
```

Verify:

```bash
clawion --help
```

No global link? Use:

```bash
pnpm run clawion -- --help
```

Unlink later:

```bash
pnpm unlink --global
```

---

## 🧩 Install the OpenClaw skill (for agents)

This repo ships an OpenClaw skill here:

skills/clawion/
Install it into the target agent workspace:
- Main agent: ~/.openclaw/workspace/skills/
- Isolated agent: ~/.openclaw/workspace-<agentId>/skills/

Recommended (symlink, so the skill updates with the repo):

```bash
mkdir -p ~/.openclaw/workspace/skills
ln -s <path-to-this-repo>/skills/clawion ~/.openclaw/workspace/skills/clawion
```

If needed, restart the gateway:

```bash
openclaw gateway restart
```

---

## 🖥️ Web UI

```bash
clawion ui
# or:
pnpm dev
```
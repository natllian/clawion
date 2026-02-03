const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const DEFAULT_MISSIONS_DIR = path.join(os.homedir(), ".clawion", "missions");

function getMissionsDir() {
  return process.env.CLAWION_MISSIONS_DIR || DEFAULT_MISSIONS_DIR;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureMissionsDir() {
  const dir = getMissionsDir();
  ensureDir(dir);
  return dir;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

function initWorkspace() {
  const missionsDir = ensureMissionsDir();
  const indexPath = path.join(missionsDir, "index.json");

  if (!fs.existsSync(indexPath)) {
    writeJsonAtomic(indexPath, {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      missions: [],
    });
  }

  const templateDir = path.join(missionsDir, "_template");
  ensureDir(path.join(templateDir, "threads"));
  ensureDir(path.join(templateDir, "logs"));
  ensureDir(path.join(templateDir, "working"));

  const missionJsonPath = path.join(templateDir, "mission.json");
  if (!fs.existsSync(missionJsonPath)) {
    writeJsonAtomic(missionJsonPath, {
      schemaVersion: 1,
      id: "M-0000-example",
      name: "Example mission",
      description: "Replace this with a real mission description.",
      status: "active",
      createdAt: new Date().toISOString(),
    });
  }

  const roadmapPath = path.join(templateDir, "ROADMAP.md");
  if (!fs.existsSync(roadmapPath)) {
    fs.writeFileSync(
      roadmapPath,
      "# ROADMAP\n\n## Big picture\n\nDescribe the mission goal and the end state.\n",
      "utf8",
    );
  }

  const tasksPath = path.join(templateDir, "tasks.json");
  if (!fs.existsSync(tasksPath)) {
    writeJsonAtomic(tasksPath, {
      schemaVersion: 1,
      missionId: "M-0000-example",
      description: "Task board for this mission.",
      updatedAt: new Date().toISOString(),
      columns: [
        "inbox",
        "assigned",
        "in_progress",
        "review",
        "blocked",
        "done",
      ],
      tasks: [],
    });
  }

  const workersPath = path.join(templateDir, "workers.json");
  if (!fs.existsSync(workersPath)) {
    writeJsonAtomic(workersPath, {
      schemaVersion: 1,
      missionId: "M-0000-example",
      updatedAt: new Date().toISOString(),
      workers: [
        {
          id: "worker:example",
          displayName: "Example Worker",
          missionRole: "Describe what this worker does in this mission.",
          status: "active",
        },
      ],
    });
  }

  return { missionsDir, indexPath };
}

module.exports = {
  DEFAULT_MISSIONS_DIR,
  getMissionsDir,
  ensureMissionsDir,
  initWorkspace,
  readJson,
  writeJsonAtomic,
};

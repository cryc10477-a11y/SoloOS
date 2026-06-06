const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const statuses = ['想法池', '待立项', '验证中', '执行中', '暂停', '完成', '放弃'];
const priorities = ['低', '中', '高', '最高'];
const taskStatuses = ['待办', '进行中', '已完成'];

const defaultScore = {
  moneySpeed: 50,
  successProbability: 50,
  costEfficiency: 50,
  interest: 50,
  longTermValue: 50
};

function getProjectRoot() {
  if (process.env.SOLOOS_HOME) {
    return process.env.SOLOOS_HOME;
  }

  if (app.isPackaged) {
    return path.join(app.getPath('home'), 'Desktop', 'SoloOS');
  }

  return path.resolve(__dirname, '..', '..');
}

function getProjectsPath() {
  return path.join(getProjectRoot(), 'data', 'projects.json');
}

function getDataPath(filename) {
  return path.join(getProjectRoot(), 'data', filename);
}

function getDocPath(filename) {
  return path.join(getProjectRoot(), 'docs', filename);
}

async function ensureDataFile() {
  const dataDir = path.dirname(getProjectsPath());
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(getProjectsPath());
  } catch {
    await fs.writeFile(getProjectsPath(), '[]\n', 'utf8');
  }
}

async function ensureJsonArrayFile(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]\n', 'utf8');
  }
}

async function readProjects() {
  await ensureDataFile();
  const raw = await fs.readFile(getProjectsPath(), 'utf8');
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
}

async function writeProjects(projects) {
  await ensureDataFile();
  await fs.writeFile(getProjectsPath(), `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
}

async function readJsonArray(filename) {
  const filePath = getDataPath(filename);
  await ensureJsonArrayFile(filePath);
  const raw = await fs.readFile(filePath, 'utf8');
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
}

async function writeJsonArray(filename, items) {
  const filePath = getDataPath(filename);
  await ensureJsonArrayFile(filePath);
  await fs.writeFile(filePath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

async function readTextFile(filePath, fallback = '') {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return fallback;
  }
}

function timestamp() {
  return new Date().toISOString();
}

function normalizeScore(input = {}, existing = {}) {
  return Object.fromEntries(
    Object.entries(defaultScore).map(([key, defaultValue]) => {
      const raw = input[key] ?? existing[key] ?? defaultValue;
      const value = Number(raw);
      return [key, Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : defaultValue];
    })
  );
}

function normalizeArrayItems(items = []) {
  return items.map((item) => ({
    id: item.id ?? crypto.randomUUID(),
    createdAt: item.createdAt ?? timestamp(),
    ...item
  }));
}

function normalizeTasks(items = []) {
  return normalizeArrayItems(items).map((task) => ({
    ...task,
    title: String(task.title ?? task.content ?? '').trim(),
    status: taskStatuses.includes(task.status) ? task.status : task.done ? '已完成' : '待办'
  }));
}

function normalizeAiSuggestions(items = []) {
  return normalizeArrayItems(items).map((suggestion) => ({
    ...suggestion,
    source: String(suggestion.source ?? 'Codex').trim(),
    content: String(suggestion.content ?? '').trim(),
    adopted: Boolean(suggestion.adopted)
  }));
}

function normalizeTimeline(items = [], projectName, existing = {}) {
  const timeline = normalizeArrayItems(items);
  if (timeline.length > 0 || existing.id) {
    return timeline;
  }
  return [{
    id: crypto.randomUUID(),
    event: '创建项目',
    content: projectName || '未命名项目',
    createdAt: timestamp()
  }];
}

function normalizeProject(input = {}, existing = {}) {
  const now = timestamp();
  const name = String(input.name ?? existing.name ?? '').trim();
  const status = statuses.includes(input.status)
    ? input.status
    : statuses.includes(existing.status)
      ? existing.status
      : '想法池';
  const priority = priorities.includes(input.priority)
    ? input.priority
    : priorities.includes(existing.priority)
      ? existing.priority
      : '中';
  return {
    id: existing.id ?? input.id ?? crypto.randomUUID(),
    name,
    description: String(input.description ?? existing.description ?? '').trim(),
    status,
    priority,
    currentGoal: String(input.currentGoal ?? existing.currentGoal ?? '').trim(),
    nextAction: String(input.nextAction ?? existing.nextAction ?? '').trim(),
    nextActionDueDate: String(input.nextActionDueDate ?? existing.nextActionDueDate ?? '').trim(),
    owner: String(input.owner ?? existing.owner ?? '').trim(),
    createdAt: existing.createdAt ?? input.createdAt ?? now,
    updatedAt: existing.id ? now : input.updatedAt ?? now,
    score: normalizeScore(input.score, existing.score),
    decisions: normalizeArrayItems(Array.isArray(input.decisions) ? input.decisions : existing.decisions ?? []),
    tasks: normalizeTasks(Array.isArray(input.tasks) ? input.tasks : existing.tasks ?? []),
    discussions: normalizeArrayItems(Array.isArray(input.discussions) ? input.discussions : existing.discussions ?? []),
    aiSuggestions: normalizeAiSuggestions(Array.isArray(input.aiSuggestions) ? input.aiSuggestions : existing.aiSuggestions ?? []),
    timeline: normalizeTimeline(Array.isArray(input.timeline) ? input.timeline : existing.timeline ?? [], name, existing)
  };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    title: 'SoloOS',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('projects:list', async () => {
    const projects = await readProjects();
    const normalizedProjects = projects.map((project) => normalizeProject(project));
    await writeProjects(normalizedProjects);
    return normalizedProjects;
  });

  ipcMain.handle('projects:create', async (_event, input) => {
    const projects = await readProjects();
    const project = normalizeProject(input);
    if (!project.name) {
      throw new Error('项目名称不能为空');
    }
    projects.unshift(project);
    await writeProjects(projects);
    return project;
  });

  ipcMain.handle('projects:update', async (_event, id, input) => {
    const projects = await readProjects();
    const index = projects.findIndex((project) => project.id === id);
    if (index === -1) {
      throw new Error('项目不存在');
    }
    const project = normalizeProject(input, projects[index]);
    if (!project.name) {
      throw new Error('项目名称不能为空');
    }
    projects[index] = project;
    await writeProjects(projects);
    return project;
  });

  ipcMain.handle('projects:delete', async (_event, id) => {
    const projects = await readProjects();
    const nextProjects = projects.filter((project) => project.id !== id);
    await writeProjects(nextProjects);
    return { ok: true };
  });

  ipcMain.handle('memory:get', async () => {
    const [owner, aiHandoffLogs, projectUpdates] = await Promise.all([
      readTextFile(getDocPath('owner.md'), '# Owner\n\n暂无 owner.md 内容。\n'),
      readJsonArray('ai_handoff_logs.json'),
      readJsonArray('project_updates.json')
    ]);

    return {
      owner,
      aiHandoffLogs,
      projectUpdates,
      paths: {
        root: getProjectRoot(),
        owner: getDocPath('owner.md'),
        projects: getProjectsPath(),
        aiHandoffLogs: getDataPath('ai_handoff_logs.json'),
        projectUpdates: getDataPath('project_updates.json')
      }
    };
  });

  ipcMain.handle('memory:append', async (_event, collection, input) => {
    const filenames = {
      aiHandoffLogs: 'ai_handoff_logs.json',
      projectUpdates: 'project_updates.json'
    };
    const filename = filenames[collection];
    if (!filename) {
      throw new Error('未知记忆集合');
    }
    const items = await readJsonArray(filename);
    const record = {
      id: input.id ?? crypto.randomUUID(),
      createdAt: input.createdAt ?? timestamp(),
      ...input
    };
    items.unshift(record);
    await writeJsonArray(filename, items);
    return record;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

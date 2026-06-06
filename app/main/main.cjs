const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..', '..');
const dataDir = path.join(projectRoot, 'data');
const projectsPath = path.join(dataDir, 'projects.json');

const statuses = ['想法池', '待立项', '验证中', '暂停', '放弃', '完成'];
const priorities = ['低', '中', '高'];

async function ensureDataFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(projectsPath);
  } catch {
    await fs.writeFile(projectsPath, '[]\n', 'utf8');
  }
}

async function readProjects() {
  await ensureDataFile();
  const raw = await fs.readFile(projectsPath, 'utf8');
  if (!raw.trim()) {
    return [];
  }
  return JSON.parse(raw);
}

async function writeProjects(projects) {
  await ensureDataFile();
  await fs.writeFile(projectsPath, `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
}

function timestamp() {
  return new Date().toISOString();
}

function normalizeProject(input, existing = {}) {
  const now = timestamp();
  return {
    id: existing.id ?? crypto.randomUUID(),
    name: String(input.name ?? existing.name ?? '').trim(),
    description: String(input.description ?? existing.description ?? '').trim(),
    status: statuses.includes(input.status) ? input.status : existing.status ?? '想法池',
    priority: priorities.includes(input.priority) ? input.priority : existing.priority ?? '中',
    nextAction: String(input.nextAction ?? existing.nextAction ?? '').trim(),
    owner: String(input.owner ?? existing.owner ?? '').trim(),
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
    decisions: Array.isArray(input.decisions) ? input.decisions : existing.decisions ?? [],
    tasks: Array.isArray(input.tasks) ? input.tasks : existing.tasks ?? [],
    discussions: Array.isArray(input.discussions) ? input.discussions : existing.discussions ?? [],
    aiSuggestions: Array.isArray(input.aiSuggestions) ? input.aiSuggestions : existing.aiSuggestions ?? []
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
  ipcMain.handle('projects:list', async () => readProjects());

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


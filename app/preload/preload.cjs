const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('soloOS', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (project) => ipcRenderer.invoke('projects:create', project),
  updateProject: (id, project) => ipcRenderer.invoke('projects:update', id, project),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id)
});


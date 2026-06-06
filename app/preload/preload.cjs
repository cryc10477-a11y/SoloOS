const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('soloOS', {
  listProjects: () => ipcRenderer.invoke('projects:list'),
  createProject: (project) => ipcRenderer.invoke('projects:create', project),
  updateProject: (id, project) => ipcRenderer.invoke('projects:update', id, project),
  deleteProject: (id) => ipcRenderer.invoke('projects:delete', id),
  getMemory: () => ipcRenderer.invoke('memory:get'),
  appendMemoryRecord: (collection, record) => ipcRenderer.invoke('memory:append', collection, record)
});

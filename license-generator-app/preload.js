const { contextBridge, ipcRenderer } = require('electron');

// واجهة آمنة بين العملية الرئيسية وعملية الـ Renderer
contextBridge.exposeInMainWorld('genAPI', {
  getSecret:        ()        => ipcRenderer.invoke('gen:secret'),
  getMachineId:     ()        => ipcRenderer.invoke('gen:machineId'),
  generate:         (opts)    => ipcRenderer.invoke('gen:generate', opts),
  verify:           (token)   => ipcRenderer.invoke('gen:verify', token),
  list:             ()        => ipcRenderer.invoke('gen:list'),
  delete:           (id)      => ipcRenderer.invoke('gen:delete', id),
  clear:            ()        => ipcRenderer.invoke('gen:clear'),
  copy:             (text)    => ipcRenderer.invoke('gen:copy', text),
  export:           (args)    => ipcRenderer.invoke('gen:export', args),
  isElectron: true,
});

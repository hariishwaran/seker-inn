const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld('db', {
  getRooms: () => ipcRenderer.invoke('db:getRooms'),
  saveRoom: (room) => ipcRenderer.invoke('db:saveRoom', room),
  deleteRoom: (id) => ipcRenderer.invoke('db:deleteRoom', id),
  getInvoices: () => ipcRenderer.invoke('db:getInvoices'),
  saveInvoice: (invoice) => ipcRenderer.invoke('db:saveInvoice', invoice),
  deleteInvoice: (id) => ipcRenderer.invoke('db:deleteInvoice', id),
  updateInvoiceStatus: (id, status) => ipcRenderer.invoke('db:updateInvoiceStatus', id, status),
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('db:saveSettings', settings),
  resetDatabase: () => ipcRenderer.invoke('db:resetDatabase'),
});

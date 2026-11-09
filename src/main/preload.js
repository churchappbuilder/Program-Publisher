'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  getPaperCatalog: call('paper:catalog'),
  getServiceTypes: call('presets:serviceTypes'),
  orgs: {
    list: call('orgs:list'),
    create: call('orgs:create'),
    update: call('orgs:update'),
    delete: call('orgs:delete')
  },
  assets: {
    list: call('assets:list'),
    data: call('assets:data'),
    pick: call('assets:pick'),
    delete: call('assets:delete'),
    update: call('assets:update')
  },
  templates: {
    list: call('templates:list'),
    create: call('templates:create'),
    update: call('templates:update'),
    duplicate: call('templates:duplicate'),
    delete: call('templates:delete')
  },
  version: call('app:version'),
  catechism: {
    list: call('catechism:list'),
    text: call('catechism:text')
  },
  texts: {
    builtin: call('texts:builtin'),
    list: call('texts:list'),
    create: call('texts:create'),
    update: call('texts:update'),
    delete: call('texts:delete')
  },
  exportPdf: call('export:pdf'),
  print: {
    getJob: call('print:getJob'),
    ready: call('print:ready')
  },
  settings: {
    get: call('settings:get'),
    set: call('settings:set')
  }
});

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const binDir = path.join(rootDir, 'node_modules', '.bin');

try {
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Criar wrapper executável para Linux (usado pela Vercel)
  const linuxVitePath = path.join(binDir, 'vite');
  const linuxScript = `#!/bin/sh\nnode "${path.join(rootDir, 'scripts', 'build.js').replace(/\\/g, '/')}" "$@"\n`;
  fs.writeFileSync(linuxVitePath, linuxScript, { mode: 0o755 });

  // Criar wrapper para Windows (cmd)
  const winCmdPath = path.join(binDir, 'vite.cmd');
  const winCmdScript = `@ECHO off\r\nnode "%~dp0\\..\\..\\scripts\\build.js" %*\r\n`;
  fs.writeFileSync(winCmdPath, winCmdScript);

  // Também rodar o build imediatamente para garantir a pasta dist
  require('./build.js');

  console.log('✅ Shim do vite configurado com sucesso em node_modules/.bin/vite');
} catch (err) {
  console.warn('⚠️ setup-bin aviso:', err.message);
}

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'web');
const destDir = path.join(rootDir, 'dist');

console.log('🚀 Trampou Build: Preparando arquivos estáticos para produção...');

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('✅ Build concluído com sucesso! Arquivos sincronizados em web/ e dist/.');
  process.exit(0);
} catch (err) {
  console.error('❌ Erro no build:', err.message);
  process.exit(1);
}

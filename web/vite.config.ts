import { defineConfig } from 'vite';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [{ name: 'local-rom-dev-only', configureServer(server) {
    server.middlewares.use('/__local-rom', async (_req, res) => {
      try {
        const filename = process.env.YOSHI_ROM_PATH || resolve('..', "Super Mario World 2 - Yoshi's Island (Europe) (En,Fr,De).sfc");
        const rom = await readFile(filename);
        res.setHeader('Content-Type', 'application/octet-stream'); res.end(rom);
      } catch { res.statusCode = 404; res.end('Choisis ta ROM avec le bouton Importer.'); }
    });
  }}],
});

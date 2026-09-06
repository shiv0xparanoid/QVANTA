import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@qvanta/types': path.resolve(__dirname, '../../packages/types/src'),
            '@qvanta/ui': path.resolve(__dirname, '../../packages/ui/src')
        }
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, ''); }
            },
            '/ws': {
                target: 'http://localhost:3000',
                ws: true,
                changeOrigin: true
            }
        }
    }
});

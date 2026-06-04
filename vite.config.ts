import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].js',
              },
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
              output: {
                // sandbox:false + ESM -> .mjs es la convención que Electron 33 espera
                format: 'es',
                entryFileNames: '[name].mjs',
                inlineDynamicImports: true,
              },
            },
          },
        },
      },
      renderer: {},
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
})

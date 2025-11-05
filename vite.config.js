import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Set base for GitHub Pages (project "SUBBITO") to ensure assets resolve under /SUBBITO/
  const isBuild = command === 'build';
  const base = isBuild ? '/SUBBITO/' : '/';
  return {
    base,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@pages': path.resolve(__dirname, 'src/pages'),
        '@api': path.resolve(__dirname, 'src/api'),
        '@utils': path.resolve(__dirname, 'src/utils')
      }
    },
    server: {
      host: true,
      hmr: {
        overlay: false // disable the Vite error overlay (warnings will still appear in console)
      }
    },
    preview: {
      host: true
    }
  }
})



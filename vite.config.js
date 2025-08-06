import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  // Load env file from the project root
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    root: 'src',
    build: {
      outDir: '../dist'
    },
    server: {
      port: 3000
    },
    envDir: '..' // Look for .env files in the parent directory (project root)
  }
})
import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Check if dist directory exists
const distPath = join(__dirname, 'dist')
console.log('Looking for dist directory at:', distPath)
console.log('Dist directory exists:', existsSync(distPath))

if (existsSync(distPath)) {
  console.log('Serving from dist directory')
  // Serve static files from the dist directory
  app.use(express.static(distPath))
  
  // Handle client-side routing - send back index.html for any non-API routes
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
} else {
  console.log('Dist directory not found, serving from src')
  // Fallback: serve from src directory (for development)
  const srcPath = join(__dirname, 'src')
  app.use(express.static(srcPath))
  
  app.get('*', (req, res) => {
    res.sendFile(join(srcPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`🚀 DavBot server running at http://localhost:${PORT}`)
  console.log(`📁 Serving static files from: ${existsSync(distPath) ? distPath : join(__dirname, 'src')}`)
})
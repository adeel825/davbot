import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Serve static files from the dist directory (built files)
app.use(express.static(join(__dirname, 'dist')))

// For development, you might want to serve from src
// Uncomment this line if running in development without build
// app.use(express.static(join(__dirname, 'src')))

// Handle client-side routing - send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🚀 DavBot server running at http://localhost:${PORT}`)
  console.log(`📁 Serving static files from: ${join(__dirname, 'dist')}`)
  console.log(`💡 To build the project first, run: npm run build`)
})
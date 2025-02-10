import express from 'express'
import path from 'path'

const app = express()

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')))

// Handle client-side routing by serving index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

export default app 
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { handleCouncilRequest } from './server/councilRunner.mjs'

const councilBridge = {
  name: 'spark-tank-council-bridge',
  configureServer(server: { middlewares: { use: (path: string, handler: typeof handleCouncilRequest) => void } }) {
    server.middlewares.use('/api/council', handleCouncilRequest)
  },
  configurePreviewServer(server: { middlewares: { use: (path: string, handler: typeof handleCouncilRequest) => void } }) {
    server.middlewares.use('/api/council', handleCouncilRequest)
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), councilBridge],
})

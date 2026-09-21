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
  build: {
    rolldownOptions: {
      input: {
        app: 'index.html',
        guide: 'guide.html',
      },
      output: {
        codeSplitting: {
          minSize: 20_000,
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              maxSize: 250_000,
            },
          ],
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/patterns': 'http://localhost:3000',
      '/status':   'http://localhost:3000',
      '/webhook':  'http://localhost:3000',
      '/check':    'http://localhost:3000',
      '/heal':     'http://localhost:3000',
    },
  },
})

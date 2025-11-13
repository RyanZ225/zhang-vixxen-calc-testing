import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    allowedHosts: [
      'vixxencalc.xm9g.net'
    ]
  }
})

import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    watch: {
      include: ['src/**', 'typedoc.json'],
    },
  },
  resolve: {
    alias: { '~': new URL('./src', import.meta.url).pathname },
  },
  root: 'docs',
  server: {
    open: true,
    port: 1337,
  },
})

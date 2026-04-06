import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    sourcemap: false
  },
  rollupOptions: {
    external: [
      './src/js/lib/mdui.global.min.js',
      './src/js/lib/jquery-4.0.0.esm.min.js'
    ]
  }
})
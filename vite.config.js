import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],

  build: {
    // Split vendor libraries (change rarely) from app code (changes often).
    // This way users only re-download the app chunk on each deploy.
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['pocketbase', 'pinia', 'vue'],
        },
      },
    },
    // Warn if any chunk exceeds 400 KB before gzip.
    chunkSizeWarningLimit: 400,
  },

  // esbuild options apply to both dev and prod transforms.
  // We strip noisy log/debug calls in prod but keep console.warn / console.error
  // so the unhandled-rejection logger in App.vue still reports real failures.
  esbuild: {
    pure: ['console.log', 'console.debug', 'console.info', 'console.trace'],
    drop: ['debugger'],
  },

  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.js'],
    // Playwright owns tests/e2e/**/*.spec.js — keep them out of Vitest's pickup.
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
    reporters: ['verbose'],
  },
})

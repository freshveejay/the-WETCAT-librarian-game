import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'node_modules',
        'test',
        'dist',
        'src/**/*.test.js',
        'src/**/*.spec.js'
      ]
    },
    deps: {
      inline: ['canvas']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@game': resolve(__dirname, './src/game'),
      '@web3': resolve(__dirname, './src/web3')
    }
  }
});
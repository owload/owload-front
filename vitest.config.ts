import viteConfig from './vite.config';
import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import {loadEnv} from "vite";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      env: loadEnv('test', process.cwd(), ''),
      coverage: {
        reporter: ['text', 'lcov']
      }
    },
  })
);

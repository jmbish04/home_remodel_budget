import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced',
    functionPerRoute: false,
  }),
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    ssr: {
      external: ['node:async_hooks'],
    },
    build: {
      target: 'esnext',
    },
  },
});

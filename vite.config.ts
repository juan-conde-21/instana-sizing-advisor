import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryBasePath = '/instana-sizing-advisor/';
const base = process.env.VITE_BASE_PATH ?? repositoryBasePath;

export default defineConfig({
  base,
  plugins: [react()],
});

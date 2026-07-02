import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/instana-sizing-advisor/",
  plugins: [react()],
});

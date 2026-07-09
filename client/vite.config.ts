import { defineConfig } from "vite";

export default defineConfig({
  // Required for itch.io because the uploaded HTML game is served from a nested path.
  // This makes built asset URLs relative, e.g. ./assets/index-abc.js instead of /assets/index-abc.js.
  base: "./",
  server: {
    host: "0.0.0.0"
  },
  preview: {
    host: "0.0.0.0"
  }
});

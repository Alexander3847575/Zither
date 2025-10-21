import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true
  },
  kit: {
    adapter: adapter({
      pages: ".vite/renderer/main_window",
    }),
    router: {
      type: "hash",
    },
  },
};

export default config;

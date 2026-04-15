import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // './' base is required for the Electron build so all asset URLs are
  // relative and work correctly when loaded via file:// protocol.
  base: './',
})

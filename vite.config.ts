import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3100,
    // Fail loudly instead of silently moving to 3101 if the port is taken:
    // the Keycloak client's Web Origins list is per-origin, so a shifted port
    // surfaces as an opaque CORS failure on the token endpoint.
    strictPort: true,
    host: 'localhost',
  },
})

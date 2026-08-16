import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Esto asegura que al hacer el "build", 
  // los assets (js, css, imágenes) usen rutas relativas y no absolutas.
  base: './', 
})

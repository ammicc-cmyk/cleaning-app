import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', // работает под любым именем репозитория GitHub Pages
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Микроуборка',
        short_name: 'Микроуборка',
        description: 'Порядок без генеральных уборок — по 12–15 минут',
        lang: 'ru',
        display: 'standalone',
        background_color: '#f4f3ec',
        theme_color: '#f4f3ec',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})

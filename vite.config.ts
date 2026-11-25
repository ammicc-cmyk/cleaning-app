import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Браузер не загрузит чужие скрипты и не отправит данные на посторонние адреса. Только в сборке: dev-серверу нужны встроенные скрипты. */
function csp(): Plugin {
  let api = ''
  return {
    name: 'csp',
    apply: 'build',
    configResolved(c) {
      const url = c.env.VITE_API_URL as string | undefined
      api = url ? ' ' + new URL(url).origin : ''
    },
    transformIndexHtml: () => [
      { tag: 'meta', injectTo: 'head-prepend', attrs: { name: 'referrer', content: 'no-referrer' } },
      {
        tag: 'meta', injectTo: 'head-prepend',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
            + `manifest-src 'self'; worker-src 'self'; connect-src 'self'${api}; base-uri 'none'; form-action 'none'`,
        },
      },
    ],
  }
}

export default defineConfig({
  base: './', // работает под любым именем репозитория GitHub Pages
  plugins: [
    react(),
    csp(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Уборка 15 минут',
        short_name: 'Уборка 15 мин',
        description: 'Порядок без генеральных уборок: 5, 12 или 15 минут',
        lang: 'ru',
        display: 'standalone',
        background_color: '#f4f3ec',
        theme_color: '#f4f3ec',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})

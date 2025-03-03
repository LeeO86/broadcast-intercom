// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],
  runtimeConfig: {
    // Server-side environment variables
    janusUrl: process.env.JANUS_URL || 'http://localhost:8088/janus',
    janusApiSecret: process.env.JANUS_API_SECRET || '',
    // Keys within public are exposed to the client
    public: {
      appName: 'Broadcast Intercom',
      socketUrl: process.env.SOCKET_URL || '',
    }
  },
  app: {
    head: {
      title: 'Broadcast Intercom',
      meta: [
        { name: 'description', content: 'Professional broadcast intercom system built with Nuxt 3' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },
  typescript: {
    strict: true
  },
  nitro: {
    experimental: {
      websocket: true
    }
  }
})
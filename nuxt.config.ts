export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '冰記',
      htmlAttrs: { lang: 'zh-Hant' },
      meta: [
        { name: 'theme-color', content: '#f5f5f7' },
        { name: 'apple-mobile-web-app-title', content: '冰記' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/app-icon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      appsScriptUrl: '',
      lineChannelId: '',
      lineRedirectUri: '',
      registrationFormUrl: '',
    },
  },
})

export default defineNuxtConfig({
  devtools: { enabled: false },
  ssr: false,
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      appsScriptUrl: '',
    },
  },
})

export default defineNuxtConfig({
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    googleSheetsApiKey: '',
    googleSpreadsheetId: '',
    googleSheetRange: 'Sheet1!A:D',
    teacherPassword: '',
    sessionSecret: '',
    dataFile: './data/db.json',
  },
})

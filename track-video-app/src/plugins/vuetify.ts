import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    defaultTheme: 'trackVideoDark',
    themes: {
      trackVideoDark: {
        dark: true,
        colors: {
          primary: '#d7ff4f',
          secondary: '#7f8cff',
          success: '#67e7aa',
          error: '#ff6f7d',
          warning: '#ffc95f',
          info: '#78d8ff',
          background: '#101116',
          surface: '#191b21',
          'surface-variant': '#242730',
          'on-background': '#f3f4ef',
          'on-surface': '#f3f4ef',
          'on-primary': '#101116',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      class: 'text-none',
    },
    VCard: {
      elevation: 0,
    },
  },
})

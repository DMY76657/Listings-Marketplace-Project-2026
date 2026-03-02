import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
        login: resolve(__dirname, 'login.html'),
        register: resolve(__dirname, 'register.html'),
        listingCreate: resolve(__dirname, 'listing-create.html'),
        listingEdit: resolve(__dirname, 'listing-edit.html'),
        listingDetails: resolve(__dirname, 'listing-details.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html'),
      }
    }
  }
})
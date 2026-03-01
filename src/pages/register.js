import { register } from '../services/authService.js'
import { redirectIfLoggedIn } from '../utils/guard.js'
import { initNavbar } from '../components/navbar.js'

async function initializePage() {
  try {
    await initNavbar()
    await redirectIfLoggedIn()

    const form = document.getElementById('register-form')
    if (!form) return

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const displayName = document.getElementById('display_name')?.value?.trim()
      const email = document.getElementById('email')?.value?.trim()
      const password = document.getElementById('password')?.value
      const confirmPassword = document.getElementById('confirm_password')?.value

      if (password !== confirmPassword) {
        alert('Passwords do not match.')
        return
      }

      try {
        await register(email, password, displayName)
        window.location.href = '/index.html'
      } catch (error) {
        alert(error?.message || 'Registration failed.')
      }
    })
  } catch (error) {
    alert(error?.message || 'Unable to load registration page.')
  }
}

initializePage()

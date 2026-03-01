import { login } from '../services/authService.js'
import { redirectIfLoggedIn } from '../utils/guard.js'
import { initNavbar } from '../components/navbar.js'

async function initializePage() {
  try {
    await initNavbar()
    await redirectIfLoggedIn()

    const form = document.getElementById('login-form')
    if (!form) return

    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      const email = document.getElementById('email')?.value?.trim()
      const password = document.getElementById('password')?.value

      try {
        await login(email, password)
        window.location.href = '/index.html'
      } catch (error) {
        alert(error?.message || 'Login failed.')
      }
    })
  } catch (error) {
    alert(error?.message || 'Unable to load login page.')
  }
}

initializePage()

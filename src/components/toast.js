function ensureToastContainer() {
  let container = document.getElementById('appToastContainer')

  if (!container) {
    container = document.createElement('div')
    container.id = 'appToastContainer'
    container.className = 'toast-container position-fixed top-0 end-0 p-3'
    container.style.zIndex = '1100'
    document.body.appendChild(container)
  }

  return container
}

export function showToast(message, type = 'info') {
  const validTypes = ['success', 'danger', 'warning', 'info']
  const resolvedType = validTypes.includes(type) ? type : 'info'
  const container = ensureToastContainer()

  const toastElement = document.createElement('div')
  toastElement.className = `toast align-items-center text-bg-${resolvedType} border-0`
  toastElement.setAttribute('role', 'alert')
  toastElement.setAttribute('aria-live', 'assertive')
  toastElement.setAttribute('aria-atomic', 'true')

  toastElement.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${String(message || '')}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `

  container.appendChild(toastElement)

  if (window.bootstrap?.Toast) {
    const toast = new window.bootstrap.Toast(toastElement, {
      autohide: true,
      delay: 4000,
    })

    toastElement.addEventListener('hidden.bs.toast', () => {
      toastElement.remove()
    })

    toast.show()
    return
  }

  toastElement.classList.add('show')
  setTimeout(() => {
    toastElement.remove()
  }, 4000)
}

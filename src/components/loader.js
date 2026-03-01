let loaderCounter = 0

function createLoaderElement() {
  const overlay = document.createElement('div')
  overlay.id = 'appLoaderOverlay'
  overlay.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50'
  overlay.style.zIndex = '1200'
  overlay.innerHTML = `
    <div class="spinner-border text-light" role="status" aria-label="Loading">
      <span class="visually-hidden">Loading...</span>
    </div>
  `
  return overlay
}

export function showLoader() {
  loaderCounter += 1

  let overlay = document.getElementById('appLoaderOverlay')
  if (!overlay) {
    overlay = createLoaderElement()
    document.body.appendChild(overlay)
  }
}

export function hideLoader() {
  loaderCounter = Math.max(0, loaderCounter - 1)

  if (loaderCounter > 0) return

  const overlay = document.getElementById('appLoaderOverlay')
  if (overlay) {
    overlay.remove()
  }
}

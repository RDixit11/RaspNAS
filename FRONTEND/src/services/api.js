// Wspólny klient HTTP dla API koordynatora — /api jest proxowane przez Vite (dev) i nginx (prod).
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Wygasła sesja (np. po restarcie koordynatora) — AuthProvider wylogowuje wtedy użytkownika
let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

function messageFrom(status, data) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) return 'Niepoprawne dane w formularzu.'
  if (status >= 500) return 'Koordynator nie odpowiada — czy backend jest uruchomiony?'
  return `Błąd serwera (${status}).`
}

async function errorMessage(response) {
  try {
    return messageFrom(response.status, await response.json())
  } catch {
    return messageFrom(response.status, null)
  }
}

export async function api(path, { body, headers, ...options } = {}) {
  const isForm = body instanceof FormData
  let response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body !== undefined && !isForm ? JSON.stringify(body) : body,
    })
  } catch {
    throw new ApiError('Brak połączenia z koordynatorem.', 0)
  }

  if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.()
  if (!response.ok) throw new ApiError(await errorMessage(response), response.status)
  return response.status === 204 ? null : response.json()
}

// Wysyłanie z postępem (fetch go nie raportuje) — onProgress(wysłane bajty, wszystkie bajty)
export function apiUpload(path, form, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `/api${path}`)
    request.responseType = 'json'
    request.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded, event.total)
    request.onerror = () => reject(new ApiError('Brak połączenia z koordynatorem.', 0))
    request.onload = () => {
      if (request.status === 401) onUnauthorized?.()
      if (request.status >= 200 && request.status < 300) resolve(request.response)
      else reject(new ApiError(messageFrom(request.status, request.response), request.status))
    }
    request.send(form)
  })
}

export const query = (params) => new URLSearchParams(params).toString()

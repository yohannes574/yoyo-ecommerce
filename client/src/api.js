import axios from 'axios'

const api = axios.create({ baseURL: '' }) // /api + /uploads proxied by Vite

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('yoyo_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const data = err.response?.data || {}
    const e = new Error(data.message || 'Something went wrong. Please try again.')
    e.code = data.code || null
    e.status = err.response?.status || 0
    return Promise.reject(e)
  }
)

export default api
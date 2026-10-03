import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://localhost',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'anon-key'
)

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

import { auth } from './firebase'

apiClient.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('medcare_token');
  
  // 1. Check Firebase Auth current user ID token
  if (!token && auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch {}
  }

  // 2. Check Supabase session fallback
  if (!token) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        token = session.access_token;
      }
    } catch {}
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API error:', error.response?.status, error.response?.config?.url)
    return Promise.reject(error)
  }
)
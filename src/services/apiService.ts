// API Service for handling all API calls
class ApiService {
  private baseUrl: string
  private token: string | null = null

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api'
    this.token = localStorage.getItem('auth_token')
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Authentication methods
  async signIn(data: { email: string; password: string }) {
    const response = await this.request<{ user: any; token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (response.token) {
      this.token = response.token
      localStorage.setItem('auth_token', response.token)
    }
    
    return response
  }

  async signUp(data: { email: string; password: string; displayName: string }) {
    const response = await this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    if (response.token) {
      this.token = response.token
      localStorage.setItem('auth_token', response.token)
    }
    
    return response
  }

  async signOut() {
    try {
      await this.request('/auth/signout', { method: 'POST' })
    } finally {
      this.token = null
      localStorage.removeItem('auth_token')
    }
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/auth/me')
  }

  async updateProfile(data: any) {
    return this.request<{ user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Music discovery methods
  async getTracks(params: { genre?: string; limit?: number; offset?: number } = {}) {
    const searchParams = new URLSearchParams()
    if (params.genre) searchParams.append('genre', params.genre)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    
    return this.request<{ data: any[]; pagination: any }>(`/tracks?${searchParams}`)
  }

  async searchTracks(query: string, filters: any = {}) {
    const searchParams = new URLSearchParams({ q: query })
    Object.entries(filters).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString())
    })
    
    return this.request<{ data: any[]; pagination: any }>(`/search?${searchParams}`)
  }

  // Social feed methods
  async getPosts(params: { feedType?: string; limit?: number; offset?: number } = {}) {
    const searchParams = new URLSearchParams()
    if (params.feedType) searchParams.append('feedType', params.feedType)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.offset) searchParams.append('offset', params.offset.toString())
    
    return this.request<{ data: any[]; pagination: any }>(`/posts?${searchParams}`)
  }

  async likePost(postId: string) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' })
  }

  async sharePost(postId: string) {
    return this.request(`/posts/${postId}/share`, { method: 'POST' })
  }
}

export const apiService = new ApiService()
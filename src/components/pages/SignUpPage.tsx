import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function SignUpPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  // Redirect to unified auth page
  useEffect(() => {
    const redirectUrl = searchParams.get('redirect') || '/'
    navigate(`/auth${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`, { replace: true })
  }, [navigate, searchParams])

  return null
}

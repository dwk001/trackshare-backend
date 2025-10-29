import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { supabase } from '@lib/supabase'
import { useAuth } from '@hooks/useAuth'

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  username?: string
  bio?: string
  location?: string
  website?: string
  birth_date?: string
  stats?: {
    tracksShared: number
    followers: number
    following: number
  }
}

export function useProfile() {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  // Fetch profile data from Supabase
  const {
    data: profile,
    isLoading,
    error,
    refetch
  } = useQuery<UserProfile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id || !isAuthenticated) {
        return null
      }

      try {
        // Fetch from profiles table
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          // If profile doesn't exist, create one
          if (profileError.code === 'PGRST116') {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                display_name: user.displayName || user.name
              })
              .select()
              .single()

            if (createError) {
              console.error('Error creating profile:', createError)
              return null
            }

            return {
              id: newProfile.id,
              email: newProfile.email || user.email,
              display_name: newProfile.display_name || user.displayName || user.name,
              avatar_url: newProfile.avatar_url || user.avatar,
              username: newProfile.username,
              bio: newProfile.bio,
              location: newProfile.location,
              website: newProfile.website,
              birth_date: newProfile.birth_date,
              stats: {
                tracksShared: 0,
                followers: 0,
                following: 0
              }
            }
          }

          console.error('Error fetching profile:', profileError)
          return null
        }

        // Fetch stats (placeholder - would need actual queries later)
        const stats = {
          tracksShared: 0,
          followers: 0,
          following: 0
        }

        // Get connected providers from profiles table
        const connectedProviders = data.connected_providers || {}

        return {
          id: data.id,
          email: data.email || user.email,
          display_name: data.display_name || user.displayName || user.name,
          avatar_url: data.avatar_url || user.avatar,
          username: data.username,
          bio: data.bio,
          location: data.location,
          website: data.website,
          birth_date: data.birth_date,
          stats,
          connected_providers: connectedProviders
        }
      } catch (err) {
        console.error('Error in useProfile:', err)
        return null
      }
    },
    enabled: !!user?.id && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: updates.display_name,
          avatar_url: updates.avatar_url,
          bio: updates.bio,
          location: updates.location,
          website: updates.website,
          birth_date: updates.birth_date
        })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return data
    },
    onSuccess: () => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      refetch()
    }
  })

  return {
    profile,
    isLoading,
    error,
    refetch,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    updateError: updateProfileMutation.error
  }
}


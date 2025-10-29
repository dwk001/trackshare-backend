// Create a new post to the feed
// Posts can be tracks, playlists, or other content types

export async function onRequest(context) {
  const { request, env } = context
  
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await request.json()
    const { type, track, playlist, userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!type) {
      return new Response(JSON.stringify({ error: 'Post type is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Prepare post data
    const postData = {
      user_id: userId,
      type: type,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Add type-specific data
    if (type === 'track' && track) {
      postData.track_data = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album || null,
        artwork: track.artwork || null,
        url: track.url || null,
        provider: track.provider || 'itunes'
      }
    } else if (type === 'playlist' && playlist) {
      postData.playlist_data = playlist
    } else {
      return new Response(JSON.stringify({ error: `Invalid post type or missing ${type} data` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Insert post into Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(postData)
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Failed to create post:', error)
      return new Response(JSON.stringify({ 
        error: 'Failed to create post',
        details: error
      }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const createdPost = await response.json()

    return new Response(JSON.stringify({
      success: true,
      post: createdPost[0] || createdPost
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error creating post:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}


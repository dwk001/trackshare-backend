const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.TRACKSHARE_JWT_SECRET;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

// Helper function to get user ID from token
function getUserId(req) {
  const payload = verifyToken(req);
  return payload ? payload.userId : null;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const userId = getUserId(req);

  try {
    switch (method) {
      case 'GET':
        return await handleGetProfile(req, res, userId);
      case 'POST':
        return await handleCreateProfile(req, res, userId);
      case 'PUT':
        return await handleUpdateProfile(req, res, userId);
      case 'DELETE':
        return await handleDeleteProfile(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/profile - Get user profile (own or public)
async function handleGetProfile(req, res, userId) {
  const { user_id, include_stats = false, include_posts = false } = req.query;
  
  // If no user_id specified, get current user's profile
  const targetUserId = user_id || userId;
  
  if (!targetUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get basic profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        avatar_url,
        bio,
        location,
        website,
        birth_date,
        privacy_settings,
        music_preferences,
        created_at,
        updated_at
      `)
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if user can see private info
    const isOwnProfile = userId === targetUserId;
    const canSeePrivate = isOwnProfile || await canViewPrivateProfile(userId, targetUserId);

    // Filter private data if not authorized
    if (!canSeePrivate) {
      delete profile.email;
      delete profile.birth_date;
      delete profile.privacy_settings;
      delete profile.music_preferences;
    }

    const result = { profile };

    // Add stats if requested
    if (include_stats === 'true') {
      const stats = await getUserStats(targetUserId, canSeePrivate);
      result.stats = stats;
    }

    // Add recent posts if requested
    if (include_posts === 'true') {
      const posts = await getUserRecentPosts(targetUserId, canSeePrivate);
      result.posts = posts;
    }

    res.json({
      success: true,
      ...result,
      is_own_profile: isOwnProfile,
      can_view_private: canSeePrivate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetProfile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// POST /api/profile - Create/initialize profile
async function handleCreateProfile(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { 
    display_name, 
    bio, 
    location, 
    website, 
    birth_date,
    music_preferences 
  } = req.body;

  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    // Create new profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: display_name || 'New User',
        bio: bio || '',
        location: location || '',
        website: website || '',
        birth_date: birth_date || null,
        music_preferences: music_preferences || {},
        privacy_settings: {
          profile_visibility: 'public',
          show_email: false,
          show_birth_date: false,
          show_location: true,
          show_website: true,
          allow_friend_requests: true,
          allow_messages: true
        }
      })
      .select(`
        id,
        email,
        display_name,
        avatar_url,
        bio,
        location,
        website,
        birth_date,
        privacy_settings,
        music_preferences,
        created_at
      `)
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    res.status(201).json({
      success: true,
      profile,
      message: 'Profile created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleCreateProfile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
}

// PUT /api/profile - Update profile
async function handleUpdateProfile(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { 
    display_name, 
    bio, 
    location, 
    website, 
    birth_date,
    music_preferences,
    privacy_settings,
    avatar_url
  } = req.body;

  try {
    // Validate input
    const updates = {};
    
    if (display_name !== undefined) {
      if (display_name.length < 1 || display_name.length > 50) {
        return res.status(400).json({ error: 'Display name must be 1-50 characters' });
      }
      updates.display_name = display_name.trim();
    }
    
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({ error: 'Bio must be 500 characters or less' });
      }
      updates.bio = bio.trim();
    }
    
    if (location !== undefined) {
      if (location.length > 100) {
        return res.status(400).json({ error: 'Location must be 100 characters or less' });
      }
      updates.location = location.trim();
    }
    
    if (website !== undefined) {
      if (website && !isValidUrl(website)) {
        return res.status(400).json({ error: 'Invalid website URL' });
      }
      updates.website = website.trim();
    }
    
    if (birth_date !== undefined) {
      if (birth_date && !isValidDate(birth_date)) {
        return res.status(400).json({ error: 'Invalid birth date' });
      }
      updates.birth_date = birth_date;
    }
    
    if (music_preferences !== undefined) {
      updates.music_preferences = music_preferences;
    }
    
    if (privacy_settings !== undefined) {
      updates.privacy_settings = privacy_settings;
    }
    
    if (avatar_url !== undefined) {
      if (avatar_url && !isValidUrl(avatar_url)) {
        return res.status(400).json({ error: 'Invalid avatar URL' });
      }
      updates.avatar_url = avatar_url;
    }

    updates.updated_at = new Date().toISOString();

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select(`
        id,
        email,
        display_name,
        avatar_url,
        bio,
        location,
        website,
        birth_date,
        privacy_settings,
        music_preferences,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({
      success: true,
      profile,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleUpdateProfile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// DELETE /api/profile - Delete profile (soft delete)
async function handleDeleteProfile(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Soft delete by updating profile to be hidden
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: 'Deleted User',
        bio: '',
        avatar_url: null,
        privacy_settings: {
          profile_visibility: 'private',
          show_email: false,
          show_birth_date: false,
          show_location: false,
          show_website: false,
          allow_friend_requests: false,
          allow_messages: false
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error deleting profile:', updateError);
      return res.status(500).json({ error: 'Failed to delete profile' });
    }

    res.json({
      success: true,
      message: 'Profile deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleDeleteProfile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
}

// Helper functions
async function canViewPrivateProfile(viewerId, profileId) {
  if (!viewerId) return false;
  
  // Check if they're friends
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(requester_id.eq.${viewerId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${viewerId})`)
    .eq('status', 'accepted')
    .single();
    
  return !!friendship;
}

async function getUserStats(userId, includePrivate = false) {
  const stats = {};
  
  // Public stats
  const { count: postsCount } = await supabase
    .from('music_posts')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('privacy', 'public');
    
  stats.public_posts = postsCount || 0;
  
  // Private stats (only if authorized)
  if (includePrivate) {
    const { count: totalPostsCount } = await supabase
      .from('music_posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
      
    const { count: friendsCount } = await supabase
      .from('friendships')
      .select('id', { count: 'exact' })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');
      
    stats.total_posts = totalPostsCount || 0;
    stats.friends_count = friendsCount || 0;
  }
  
  return stats;
}

async function getUserRecentPosts(userId, includePrivate = false) {
  const privacyFilter = includePrivate ? 
    ['public', 'friends', 'private'] : 
    ['public'];
    
  const { data: posts } = await supabase
    .from('music_posts')
    .select(`
      id,
      track_title,
      track_artist,
      track_artwork_url,
      caption,
      like_count,
      comment_count,
      posted_at
    `)
    .eq('user_id', userId)
    .in('privacy', privacyFilter)
    .order('posted_at', { ascending: false })
    .limit(10);
    
  return posts || [];
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

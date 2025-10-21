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
        return await handleGetFriends(req, res, userId);
      case 'POST':
        return await handleSendFriendRequest(req, res, userId);
      case 'PUT':
        return await handleRespondToFriendRequest(req, res, userId);
      case 'DELETE':
        return await handleRemoveFriend(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Friends API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/friends - Get friends list, pending requests, suggestions
async function handleGetFriends(req, res, userId) {
  const { type = 'all' } = req.query; // 'all', 'pending', 'suggestions'

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let result = {};

    if (type === 'all' || type === 'friends') {
      // Get accepted friends
      const { data: friends, error: friendsError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles!friendships_addressee_id_fkey (
            id,
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('requester_id', userId)
        .eq('status', 'accepted');

      const { data: friendsAsAddressee, error: friendsAsAddresseeError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles!friendships_requester_id_fkey (
            id,
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('addressee_id', userId)
        .eq('status', 'accepted');

      if (friendsError || friendsAsAddresseeError) {
        console.error('Error fetching friends:', friendsError || friendsAsAddresseeError);
        return res.status(500).json({ error: 'Failed to fetch friends' });
      }

      // Combine both directions
      const allFriends = [
        ...(friends || []).map(f => ({ ...f, friend: f.profiles })),
        ...(friendsAsAddressee || []).map(f => ({ ...f, friend: f.profiles }))
      ];

      result.friends = allFriends;
    }

    if (type === 'all' || type === 'pending') {
      // Get pending requests (sent and received)
      const { data: sentRequests, error: sentError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles!friendships_addressee_id_fkey (
            id,
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('requester_id', userId)
        .eq('status', 'pending');

      const { data: receivedRequests, error: receivedError } = await supabase
        .from('friendships')
        .select(`
          id,
          status,
          created_at,
          profiles!friendships_requester_id_fkey (
            id,
            display_name,
            avatar_url,
            email
          )
        `)
        .eq('addressee_id', userId)
        .eq('status', 'pending');

      if (sentError || receivedError) {
        console.error('Error fetching pending requests:', sentError || receivedError);
        return res.status(500).json({ error: 'Failed to fetch pending requests' });
      }

      result.pendingSent = (sentRequests || []).map(f => ({ ...f, user: f.profiles }));
      result.pendingReceived = (receivedRequests || []).map(f => ({ ...f, user: f.profiles }));
    }

    if (type === 'suggestions') {
      // Get friend suggestions (users who are not already friends or have pending requests)
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email')
        .neq('id', userId)
        .limit(20);

      if (usersError) {
        console.error('Error fetching users:', usersError);
        return res.status(500).json({ error: 'Failed to fetch suggestions' });
      }

      // Get existing relationships
      const { data: existingRelationships, error: relError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

      if (relError) {
        console.error('Error fetching relationships:', relError);
        return res.status(500).json({ error: 'Failed to fetch relationships' });
      }

      // Filter out users with existing relationships
      const existingUserIds = new Set();
      (existingRelationships || []).forEach(rel => {
        if (rel.requester_id === userId) {
          existingUserIds.add(rel.addressee_id);
        } else {
          existingUserIds.add(rel.requester_id);
        }
      });

      const suggestions = (allUsers || []).filter(user => !existingUserIds.has(user.id));
      result.suggestions = suggestions.slice(0, 10); // Limit to 10 suggestions
    }

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetFriends:', error);
    res.status(500).json({ error: 'Failed to fetch friends data' });
  }
}

// POST /api/friends - Send friend request
async function handleSendFriendRequest(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { user_id: targetUserId } = req.body;

  if (!targetUserId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  if (targetUserId === userId) {
    return res.status(400).json({ error: 'Cannot send friend request to yourself' });
  }

  try {
    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .eq('id', targetUserId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if relationship already exists
    const { data: existingRelationship, error: relError } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${userId})`)
      .single();

    if (relError && relError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing relationship:', relError);
      return res.status(500).json({ error: 'Failed to check existing relationship' });
    }

    if (existingRelationship) {
      if (existingRelationship.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      } else if (existingRelationship.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends with this user' });
      } else if (existingRelationship.status === 'blocked') {
        return res.status(400).json({ error: 'Cannot send friend request to blocked user' });
      }
    }

    // Create friend request
    const { data: friendship, error: createError } = await supabase
      .from('friendships')
      .insert({
        requester_id: userId,
        addressee_id: targetUserId,
        status: 'pending'
      })
      .select(`
        id,
        status,
        created_at,
        profiles!friendships_addressee_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating friend request:', createError);
      return res.status(500).json({ error: 'Failed to send friend request' });
    }

    res.status(201).json({
      success: true,
      friendship: {
        ...friendship,
        user: friendship.profiles
      },
      message: `Friend request sent to ${targetUser.display_name}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleSendFriendRequest:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
}

// PUT /api/friends - Respond to friend request (accept/decline)
async function handleRespondToFriendRequest(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { friendship_id, action } = req.body; // action: 'accept' or 'decline'

  if (!friendship_id || !action) {
    return res.status(400).json({ error: 'Friendship ID and action required' });
  }

  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Must be "accept" or "decline"' });
  }

  try {
    // Check if friendship request exists and user is the addressee
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendship_id)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !friendship) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    // Update friendship status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const { data: updatedFriendship, error: updateError } = await supabase
      .from('friendships')
      .update({ status: newStatus })
      .eq('id', friendship_id)
      .select(`
        id,
        status,
        created_at,
        profiles!friendships_requester_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating friendship:', updateError);
      return res.status(500).json({ error: 'Failed to respond to friend request' });
    }

    res.json({
      success: true,
      friendship: {
        ...updatedFriendship,
        user: updatedFriendship.profiles
      },
      message: `Friend request ${action}ed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleRespondToFriendRequest:', error);
    res.status(500).json({ error: 'Failed to respond to friend request' });
  }
}

// DELETE /api/friends - Remove friend or cancel request
async function handleRemoveFriend(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { friendship_id } = req.query;

  if (!friendship_id) {
    return res.status(400).json({ error: 'Friendship ID required' });
  }

  try {
    // Check if friendship exists and user is involved
    const { data: friendship, error: fetchError } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .eq('id', friendship_id)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .single();

    if (fetchError || !friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Delete the friendship
    const { error: deleteError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendship_id);

    if (deleteError) {
      console.error('Error deleting friendship:', deleteError);
      return res.status(500).json({ error: 'Failed to remove friend' });
    }

    res.json({
      success: true,
      message: 'Friend removed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleRemoveFriend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
}

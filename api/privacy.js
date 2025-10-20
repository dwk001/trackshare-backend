const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

const TRACKSHARE_JWT_SECRET = process.env.TRACKSHARE_JWT_SECRET;

const router = express.Router();

// Middleware to authenticate TrackShare JWT
function authenticateTrackshare(req, res, next) {
  if (!TRACKSHARE_JWT_SECRET) {
    return res.status(500).json({ error: 'TRACKSHARE_JWT_SECRET not configured' });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }

  try {
    const decoded = jwt.verify(token, TRACKSHARE_JWT_SECRET, { algorithms: ['HS256'] });
    req.trackshareAuth = decoded;
    next();
  } catch (error) {
    console.error('TrackShare JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// Helper function to log data access
async function logDataAccess(userId, actionType, resourceType, resourceId = null, details = null) {
  if (!supabase) return;
  
  try {
    await supabase.rpc('log_data_access', {
      p_user_id: userId,
      p_action_type: actionType,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_details: details,
      p_ip_address: null, // Could be added from req.ip
      p_user_agent: null  // Could be added from req.headers['user-agent']
    });
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
}

// Get user's privacy settings
router.get('/privacy', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('privacy_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch privacy settings: ${error.message}`);
    }

    await logDataAccess(userId, 'data_access', 'privacy_settings', data.id);

    return res.json({ privacySettings: data });
  } catch (error) {
    console.error('Failed to fetch privacy settings:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch privacy settings' });
  }
});

// Update user's privacy settings
router.put('/privacy', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const {
      shareListeningActivity,
      shareWithFriends,
      shareWithPublic,
      allowFriendRequests,
      showOnlineStatus,
      dataRetentionDays
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const updateData = {
      share_listening_activity: shareListeningActivity,
      share_with_friends: shareWithFriends,
      share_with_public: shareWithPublic,
      allow_friend_requests: allowFriendRequests,
      show_online_status: showOnlineStatus,
      data_retention_days: dataRetentionDays,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('privacy_settings')
      .upsert({
        user_id: userId,
        ...updateData
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update privacy settings: ${error.message}`);
    }

    await logDataAccess(userId, 'privacy_change', 'privacy_settings', data.id, {
      changes: updateData
    });

    return res.json({ success: true, privacySettings: data });
  } catch (error) {
    console.error('Failed to update privacy settings:', error);
    return res.status(500).json({ error: error.message || 'Failed to update privacy settings' });
  }
});

// Request data export
router.post('/export', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { requestType = 'full_export' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Check if user already has a pending export request
    const { data: existingRequest } = await supabase
      .from('data_export_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'Export request already pending' });
    }

    const { data, error } = await supabase
      .from('data_export_requests')
      .insert({
        user_id: userId,
        request_type: requestType,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create export request: ${error.message}`);
    }

    await logDataAccess(userId, 'data_export', 'export_request', data.id, {
      requestType
    });

    return res.json({ 
      success: true, 
      exportRequest: data,
      message: 'Export request submitted. You will receive an email when ready.'
    });
  } catch (error) {
    console.error('Failed to create export request:', error);
    return res.status(500).json({ error: error.message || 'Failed to create export request' });
  }
});

// Get export request status
router.get('/export/:requestId', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch export request: ${error.message}`);
    }

    await logDataAccess(userId, 'data_access', 'export_request', requestId);

    return res.json({ exportRequest: data });
  } catch (error) {
    console.error('Failed to fetch export request:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch export request' });
  }
});

// Request account deletion
router.post('/delete-account', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { confirmationText = '' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (confirmationText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Confirmation text must be "DELETE MY ACCOUNT"' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Check if user already has a pending deletion request
    const { data: existingRequest } = await supabase
      .from('data_deletion_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'Deletion request already pending' });
    }

    const { data, error } = await supabase
      .from('data_deletion_requests')
      .insert({
        user_id: userId,
        deletion_type: 'account_deletion',
        status: 'pending',
        scheduled_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create deletion request: ${error.message}`);
    }

    await logDataAccess(userId, 'data_deletion', 'deletion_request', data.id, {
      deletionType: 'account_deletion',
      scheduledAt: data.scheduled_at
    });

    return res.json({ 
      success: true, 
      deletionRequest: data,
      message: 'Account deletion scheduled. Your account will be deleted in 30 days unless you cancel.'
    });
  } catch (error) {
    console.error('Failed to create deletion request:', error);
    return res.status(500).json({ error: error.message || 'Failed to create deletion request' });
  }
});

// Cancel account deletion
router.delete('/delete-account/:requestId', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { requestId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { error } = await supabase
      .from('data_deletion_requests')
      .delete()
      .eq('id', requestId)
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to cancel deletion request: ${error.message}`);
    }

    await logDataAccess(userId, 'data_deletion', 'deletion_cancellation', requestId);

    return res.json({ 
      success: true,
      message: 'Account deletion cancelled successfully.'
    });
  } catch (error) {
    console.error('Failed to cancel deletion request:', error);
    return res.status(500).json({ error: error.message || 'Failed to cancel deletion request' });
  }
});

// Get user's data audit log
router.get('/audit-log', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { page = 1, limit = 50 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const offset = (page - 1) * limit;

    const { data, error } = await supabase
      .from('data_audit_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch audit log: ${error.message}`);
    }

    await logDataAccess(userId, 'data_access', 'audit_log');

    return res.json({
      items: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: data.length === limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch audit log:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch audit log' });
  }
});

// Get privacy policy and terms
router.get('/policy', (req, res) => {
  const privacyPolicy = {
    version: '1.0',
    lastUpdated: '2024-01-01',
    dataCollection: {
      minimal: true,
      description: 'We collect minimal data necessary for the service to function',
      collectedData: [
        'Email address (for account creation)',
        'Display name (user-provided)',
        'Music listening activity (only if you choose to share)',
        'Provider tokens (encrypted, for music service integration)'
      ]
    },
    dataUsage: {
      noSelling: true,
      description: 'We do not sell, rent, or trade your personal data',
      purposes: [
        'Provide music sharing functionality',
        'Enable social features',
        'Improve service quality',
        'Comply with legal requirements'
      ]
    },
    dataRetention: {
      userControlled: true,
      defaultRetention: '365 days',
      description: 'You control how long your data is retained',
      options: ['30 days', '90 days', '365 days', 'indefinite']
    },
    userRights: [
      'Access your data',
      'Export your data',
      'Delete your account',
      'Control privacy settings',
      'Opt out of data collection'
    ]
  };

  res.json({ privacyPolicy });
});

module.exports = router;

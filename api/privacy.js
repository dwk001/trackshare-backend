const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRACKSHARE_JWT_SECRET = process.env.TRACKSHARE_JWT_SECRET;

const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Helper function to verify TrackShare JWT token
function authenticateTrackshare(req) {
  if (!TRACKSHARE_JWT_SECRET) {
    return { error: 'TRACKSHARE_JWT_SECRET not configured' };
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return { error: 'Authorization header missing' };
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return { error: 'Invalid Authorization header format' };
  }

  try {
    const decoded = jwt.verify(token, TRACKSHARE_JWT_SECRET, { algorithms: ['HS256'] });
    return { success: true, user: decoded };
  } catch (error) {
    console.error('TrackShare JWT verification failed:', error.message);
    return { error: 'Invalid or expired session token' };
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
      p_ip_address: null,
      p_user_agent: null
    });
  } catch (error) {
    console.error('Failed to log data access:', error);
  }
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const { method, query, body } = req;
    const { action } = query;

    // Route based on action parameter
    switch (action) {
      case 'settings':
        return await handlePrivacySettings(req, res, method);
      case 'export':
        return await handleDataExport(req, res, method);
      case 'delete-account':
        return await handleAccountDeletion(req, res, method);
      case 'audit-log':
        return await handleAuditLog(req, res, method);
      case 'policy':
        return await handlePrivacyPolicy(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Privacy API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle privacy settings
async function handlePrivacySettings(req, res, method) {
  const auth = authenticateTrackshare(req);
  if (auth.error) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Session token missing subject' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch privacy settings: ${error.message}`);
      }

      await logDataAccess(userId, 'data_access', 'privacy_settings', data?.id);

      return res.json({ privacySettings: data });
    } else if (method === 'PUT') {
      const {
        shareListeningActivity,
        shareWithFriends,
        shareWithPublic,
        allowFriendRequests,
        showOnlineStatus,
        dataRetentionDays
      } = req.body;

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
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Privacy settings error:', error);
    return res.status(500).json({ error: error.message || 'Failed to handle privacy settings' });
  }
}

// Handle data export
async function handleDataExport(req, res, method) {
  const auth = authenticateTrackshare(req);
  if (auth.error) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Session token missing subject' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    if (method === 'POST') {
      const { requestType = 'full_export' } = req.body;

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
    } else if (method === 'GET') {
      const { requestId } = req.query;

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
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Data export error:', error);
    return res.status(500).json({ error: error.message || 'Failed to handle data export' });
  }
}

// Handle account deletion
async function handleAccountDeletion(req, res, method) {
  const auth = authenticateTrackshare(req);
  if (auth.error) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Session token missing subject' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    if (method === 'POST') {
      const { confirmationText = '' } = req.body;

      if (confirmationText !== 'DELETE MY ACCOUNT') {
        return res.status(400).json({ error: 'Confirmation text must be "DELETE MY ACCOUNT"' });
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
          scheduled_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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
    } else if (method === 'DELETE') {
      const { requestId } = req.query;

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
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({ error: error.message || 'Failed to handle account deletion' });
  }
}

// Handle audit log
async function handleAuditLog(req, res, method) {
  const auth = authenticateTrackshare(req);
  if (auth.error) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.user?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Session token missing subject' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    if (method === 'GET') {
      const { page = 1, limit = 50 } = req.query;
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
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Audit log error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch audit log' });
  }
}

// Handle privacy policy
async function handlePrivacyPolicy(req, res) {
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
}

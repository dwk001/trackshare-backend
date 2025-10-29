import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Play, 
  Pause,
  ExternalLink,
  UserPlus,
  Users,
  Calendar,
  Trophy,
  TrendingUp,
  BarChart3,
  Search,
  UserMinus,
  Check,
  X
} from 'lucide-react'
import { cn } from '@utils'
import { apiService } from '@services/apiService'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import type { Post, User, FeedType } from '@types'
import { useAuth } from '@hooks/useAuth'

interface SocialFeedProps {
  className?: string
}

const FEED_TABS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp, public: true },
  { id: 'friends', label: 'Friends', icon: Users, public: false },
]

export default function SocialFeed({ className }: SocialFeedProps) {
  const [activeFeed, setActiveFeed] = useState<FeedType>('trending')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [friendTab, setFriendTab] = useState<'all' | 'pending' | 'suggestions'>('all')
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  // Fetch posts for the active feed
  const {
    data: postsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['posts', activeFeed],
    () => apiService.getPosts({ feedType: activeFeed }),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Like post mutation
  const likeMutation = useMutation(
    (postId: string) => apiService.likePost(postId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['posts', activeFeed])
      },
    }
  )

  // Share post mutation
  const shareMutation = useMutation(
    (postId: string) => apiService.sharePost(postId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['posts', activeFeed])
      },
    }
  )

  const posts = postsData?.data || []
  const hasMore = postsData?.pagination?.has_more || false

  const handleFeedChange = (feedType: FeedType) => {
    setActiveFeed(feedType)
  }

  const handleLikePost = (postId: string) => {
    likeMutation.mutate(postId)
  }

  const handleSharePost = (postId: string) => {
    shareMutation.mutate(postId)
  }

  const handlePlayTrack = (track: any) => {
    // TODO: Implement track playing functionality
    console.log('Playing track:', track.title)
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const postDate = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return postDate.toLocaleDateString()
  }

  const renderPostContent = (post: Post) => {
    if (post.type === 'track') {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            {/* Track Artwork */}
            <div className="relative flex-shrink-0">
              <img
                src={post.track?.artwork || post.track?.artworkMedium || '/placeholder-music.jpg'}
                alt={post.track?.title}
                className="w-16 h-16 rounded-lg object-cover"
                loading="lazy"
              />
              <button
                onClick={() => handlePlayTrack(post.track)}
                className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-lg flex items-center justify-center transition-all duration-300"
              >
                <Play className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
              </button>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {post.track?.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                {post.track?.artist}
              </p>
              {post.track?.album && (
                <p className="text-gray-500 dark:text-gray-500 text-xs truncate">
                  {post.track.album}
                </p>
              )}

              {/* Track Actions */}
              <div className="flex items-center space-x-4 mt-2">
                <button
                  onClick={() => handlePlayTrack(post.track)}
                  className="flex items-center space-x-1 text-primary-500 hover:text-primary-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm">Play</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">Open</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (post.type === 'playlist') {
      return (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="flex items-start space-x-4">
            {/* Playlist Cover */}
            <div className="relative flex-shrink-0">
              <img
                src={post.playlist?.coverImage || '/placeholder-playlist.jpg'}
                alt={post.playlist?.name}
                className="w-16 h-16 rounded-lg object-cover"
                loading="lazy"
              />
            </div>

            {/* Playlist Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {post.playlist?.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {post.playlist?.trackCount} tracks
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-xs truncate">
                {post.playlist?.description}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feed Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Social Feed
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discover what your friends are listening to and share your musical journey.
          </p>
        </motion.div>

        {/* Feed Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6"
        >
          <div className="flex overflow-x-auto">
            {FEED_TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleFeedChange(tab.id as FeedType)}
                  className={cn(
                    'flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                    activeFeed === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* Friends Management */}
        {activeFeed === 'friends' && isAuthenticated && (
          <FriendsManagementSection 
            friendTab={friendTab}
            setFriendTab={setFriendTab}
            friendSearchQuery={friendSearchQuery}
            setFriendSearchQuery={setFriendSearchQuery}
          />
        )}

        {/* Posts */}
        {activeFeed === 'trending' && (
          <>
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-500 mb-4">Failed to load posts</p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No posts found. Be the first to share something!
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {posts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Post Header */}
                      <div className="flex items-center justify-between p-6 pb-4">
                        <div className="flex items-center space-x-3">
                          <img
                            src={post.user?.avatar || '/placeholder-avatar.jpg'}
                            alt={post.user?.displayName}
                            className="w-10 h-10 rounded-full object-cover"
                            loading="lazy"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {post.user?.displayName}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(post.createdAt)}
                            </p>
                          </div>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Post Content */}
                      <div className="px-6 pb-4">
                        {post.content && (
                          <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">
                            {post.content}
                          </p>
                        )}
                        {renderPostContent(post)}
                      </div>

                      {/* Post Actions */}
                      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center space-x-6">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className={cn(
                              'flex items-center space-x-2 transition-colors',
                              post.isLiked
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            )}
                          >
                            <Heart className={cn('w-5 h-5', post.isLiked && 'fill-current')} />
                            <span className="text-sm">{post.likeCount || 0}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-500 hover:text-primary-500 transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm">{post.commentCount || 0}</span>
                          </button>
                          <button
                            onClick={() => handleSharePost(post.id)}
                            className="flex items-center space-x-2 text-gray-500 hover:text-primary-500 transition-colors"
                          >
                            <Share2 className="w-5 h-5" />
                            <span className="text-sm">{post.shareCount || 0}</span>
                          </button>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {post.platform && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700">
                              {post.platform}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
                  Load More Posts
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Friends Management Component
function FriendsManagementSection({ 
  friendTab, 
  setFriendTab, 
  friendSearchQuery, 
  setFriendSearchQuery 
}: {
  friendTab: 'all' | 'pending' | 'suggestions'
  setFriendTab: (tab: 'all' | 'pending' | 'suggestions') => void
  friendSearchQuery: string
  setFriendSearchQuery: (query: string) => void
}) {
  const queryClient = useQueryClient()

  // Fetch friends data
  const { data: friendsData, isLoading, refetch } = useQuery(
    ['friends', friendTab, friendSearchQuery],
    async () => {
      if (friendSearchQuery.trim()) {
        // Search users
        const result = await apiService.searchUsers(friendSearchQuery)
        return { suggestions: result.data || [] }
      }
      return apiService.getFriends(friendTab)
    },
    { enabled: true }
  )

  // Send friend request
  const sendRequestMutation = useMutation(
    (userId: string) => apiService.sendFriendRequest(userId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['friends'])
      }
    }
  )

  // Accept/decline request
  const respondMutation = useMutation(
    ({ friendshipId, action }: { friendshipId: string, action: 'accept' | 'decline' }) =>
      action === 'accept' 
        ? apiService.acceptFriendRequest(friendshipId)
        : apiService.declineFriendRequest(friendshipId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['friends'])
      }
    }
  )

  // Remove friend
  const removeFriendMutation = useMutation(
    (friendshipId: string) => apiService.removeFriend(friendshipId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['friends'])
      }
    }
  )

  const friends = friendsData?.friends || []
  const pending = friendsData?.pending || []
  const suggestions = friendsData?.suggestions || []

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={friendSearchQuery}
            onChange={(e) => setFriendSearchQuery(e.target.value)}
            placeholder="Search for friends..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Friend Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFriendTab('all')}
            className={cn(
              'flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              friendTab === 'all'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            All Friends ({friends.length})
          </button>
          <button
            onClick={() => setFriendTab('pending')}
            className={cn(
              'flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              friendTab === 'pending'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Pending ({pending.length})
          </button>
          <button
            onClick={() => setFriendTab('suggestions')}
            className={cn(
              'flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
              friendTab === 'suggestions'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Suggestions ({suggestions.length})
          </button>
        </div>

        {/* Friends List */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {friendTab === 'all' && friends.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No friends yet</p>
              )}
              {friendTab === 'pending' && pending.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No pending requests</p>
              )}
              {friendTab === 'suggestions' && suggestions.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No suggestions available</p>
              )}

              {/* All Friends */}
              {friendTab === 'all' && friends.map((friendship: any) => {
                const friend = friendship.friend || friendship.user
                return (
                  <div key={friendship.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={friend?.avatar_url || '/placeholder-avatar.jpg'}
                        alt={friend?.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{friend?.display_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{friend?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFriendMutation.mutate(friendship.id)}
                      className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                      <span>Unfriend</span>
                    </button>
                  </div>
                )
              })}

              {/* Pending Requests */}
              {friendTab === 'pending' && pending.map((request: any) => {
                const user = request.user || request.friend
                const isOutgoing = request.requester_id === request.currentUserId
                return (
                  <div key={request.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user?.avatar_url || '/placeholder-avatar.jpg'}
                        alt={user?.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{user?.display_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isOutgoing ? 'Request sent' : 'Wants to be friends'}
                        </p>
                      </div>
                    </div>
                    {!isOutgoing && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => respondMutation.mutate({ friendshipId: request.id, action: 'accept' })}
                          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => respondMutation.mutate({ friendshipId: request.id, action: 'decline' })}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Suggestions */}
              {friendTab === 'suggestions' && suggestions.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img
                      src={user?.avatar_url || '/placeholder-avatar.jpg'}
                      alt={user?.display_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{user?.display_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => sendRequestMutation.mutate(user.id)}
                    disabled={sendRequestMutation.isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Friend</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


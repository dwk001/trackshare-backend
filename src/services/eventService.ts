import type { MusicEvent } from '@types'

// Event API configurations
const EVENT_APIS = {
  // AllEvents API - Free tier with good coverage
  allevents: {
    baseUrl: 'https://allevents.in/api/events',
    apiKey: process.env.REACT_APP_ALLEVENTS_API_KEY || '',
    enabled: true
  },
  
  // Ticketmaster Discovery API - Free tier
  ticketmaster: {
    baseUrl: 'https://app.ticketmaster.com/discovery/v2/events.json',
    apiKey: process.env.REACT_APP_TICKETMASTER_API_KEY || '',
    enabled: true
  },
  
  // Eventbrite API - Using user events endpoint
  eventbrite: {
    baseUrl: 'https://www.eventbriteapi.com/v3/users/me/events/',
    apiKey: process.env.REACT_APP_EVENTBRITE_API_KEY || '',
    enabled: true
  }
}

// Music-related categories/keywords
const MUSIC_CATEGORIES = [
  'music', 'concert', 'live music', 'festival', 'band', 'musician',
  'rock', 'pop', 'jazz', 'blues', 'country', 'hip hop', 'electronic',
  'classical', 'folk', 'indie', 'alternative', 'metal', 'punk'
]

// Convert external event data to our MusicEvent format
function normalizeEventData(event: any, source: string): MusicEvent {
  const baseEvent: MusicEvent = {
    id: `${source}_${event.id || event.event_id || Math.random().toString(36)}`,
    title: event.name || event.title || 'Untitled Event',
    artist: event.performer || event.artist || event.organizer?.name || 'Various Artists',
    venue: event.venue?.name || event.location?.name || event.place?.name || 'TBA',
    location: event.venue?.address || event.location?.address || event.place?.address || 'Location TBA',
    city: event.venue?.city || event.location?.city || event.place?.city || 'TBA',
    state: event.venue?.state || event.location?.state || event.place?.state || '',
    country: event.venue?.country || event.location?.country || event.place?.country || 'US',
    date: event.start_time || event.start?.local || event.date || new Date().toISOString(),
    time: event.start_time || event.start?.local || event.time || 'TBA',
    price: event.price || event.cost || event.ticket_price || 'Free',
    genre: event.category || event.genre || 'Music',
    description: event.description || event.summary || '',
    image: event.image || event.logo?.url || event.picture || '',
    url: event.url || event.event_url || event.link || '#',
    source: source,
    ticketsAvailable: event.tickets_available !== false,
    ageRestriction: event.age_restriction || 'All Ages'
  }

  return baseEvent
}

// Search events from AllEvents API
async function searchAllEvents(params: EventSearchParams): Promise<MusicEvent[]> {
  if (!EVENT_APIS.allevents.enabled) return []

  try {
    const searchParams = new URLSearchParams({
      q: params.query || 'music',
      location: params.location || '',
      category: 'music',
      limit: '50'
    })

    const response = await fetch(`${EVENT_APIS.allevents.baseUrl}?${searchParams}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrackShare/1.0'
      }
    })

    if (!response.ok) {
      console.warn('AllEvents API error:', response.status)
      return []
    }

    const data = await response.json()
    const events = data.events || data.data || []
    
    return events
      .filter((event: any) => 
        MUSIC_CATEGORIES.some(category => 
          event.name?.toLowerCase().includes(category) ||
          event.description?.toLowerCase().includes(category) ||
          event.category?.toLowerCase().includes(category)
        )
      )
      .map((event: any) => normalizeEventData(event, 'allevents'))
      .slice(0, 20) // Limit results

  } catch (error) {
    console.error('AllEvents API error:', error)
    return []
  }
}

// Ticketmaster requires API key in env
const TICKETMASTER_API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY

async function searchTicketmasterEvents(params: EventSearchParams): Promise<MusicEvent[]> {
  if (!TICKETMASTER_API_KEY) {
    console.warn('Ticketmaster API key not configured')
    return []
  }

  try {
    const searchParams = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY,
      keyword: params.query || 'music',
      classificationName: 'Music',
      size: '100',
      sort: 'date,asc'
    })
    
    // Add location parameters
    if (params.location) {
      searchParams.set('city', params.location)
    }
    if (params.radius) {
      searchParams.set('radius', params.radius.toString())
      searchParams.set('unit', 'miles')
    }
    if (params.startDate) {
      searchParams.set('startDateTime', `${params.startDate}T00:00:00Z`)
    }
    if (params.endDate) {
      searchParams.set('endDateTime', `${params.endDate}T23:59:59Z`)
    }

    const response = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${searchParams}`)

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`)
    }

    const data = await response.json()
    const events = data._embedded?.events || []
    
    return events.map((event: any) => ({
      id: `ticketmaster_${event.id}`,
      title: event.name,
      artist: event._embedded?.attractions?.[0]?.name || 'Various Artists',
      venue: event._embedded?.venues?.[0]?.name || 'TBA',
      location: `${event._embedded?.venues?.[0]?.city?.name || ''}, ${event._embedded?.venues?.[0]?.state?.stateCode || ''}`.trim(),
      city: event._embedded?.venues?.[0]?.city?.name || '',
      state: event._embedded?.venues?.[0]?.state?.stateCode || '',
      country: event._embedded?.venues?.[0]?.country?.countryCode || 'US',
      date: event.dates?.start?.localDate || '',
      time: event.dates?.start?.localTime || 'TBA',
      price: event.priceRanges?.[0] ? `$${event.priceRanges[0].min}-$${event.priceRanges[0].max}` : 'See Tickets',
      genre: event.classifications?.[0]?.genre?.name || 'Music',
      description: event.info || event.pleaseNote || '',
      image: event.images?.[0]?.url || '',
      url: event.url || '#',
      source: 'ticketmaster',
      ticketsAvailable: event.dates?.status?.code !== 'offsale',
      ageRestriction: event.ageRestrictions?.legalAgeEnforced ? '21+' : 'All Ages',
      attendees: undefined
    }))
  } catch (error) {
    console.error('Ticketmaster API error:', error)
    return []
  }
}

// Search events from Eventbrite API - Using user events endpoint
async function searchEventbriteEvents(params: EventSearchParams): Promise<MusicEvent[]> {
  const EVENTBRITE_API_KEY = import.meta.env.VITE_EVENTBRITE_API_KEY
  
  if (!EVENTBRITE_API_KEY) {
    console.warn('Eventbrite API key not configured')
    return []
  }

  try {
    const searchParams = new URLSearchParams({
      token: EVENTBRITE_API_KEY,
      expand: 'venue,organizer',
      page_size: '50',
      status: 'live'
    })

    const response = await fetch(`https://www.eventbriteapi.com/v3/users/me/events/?${searchParams}`)

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`)
    }

    const data = await response.json()
    const events = data.events || []
    
    // Filter for music-related events
    const musicEvents = events.filter((event: any) => {
      const title = event.name?.text?.toLowerCase() || ''
      const description = event.description?.text?.toLowerCase() || ''
      return MUSIC_CATEGORIES.some(category => 
        title.includes(category) || description.includes(category)
      )
    })
    
    return musicEvents.map((event: any) => ({
      id: `eventbrite_${event.id}`,
      title: event.name?.text || 'Untitled Event',
      artist: event.organizer?.name || 'Various Artists',
      venue: event.venue?.name || 'TBA',
      location: `${event.venue?.address?.city || ''}, ${event.venue?.address?.region || ''}`.trim(),
      city: event.venue?.address?.city || '',
      state: event.venue?.address?.region || '',
      country: event.venue?.address?.country || 'US',
      date: event.start?.local || '',
      time: event.start?.local ? new Date(event.start.local).toLocaleTimeString() : 'TBA',
      price: event.is_free ? 'Free' : 'See Tickets',
      genre: 'Music',
      description: event.description?.text || '',
      image: event.logo?.url || '',
      url: event.url || '#',
      source: 'eventbrite',
      ticketsAvailable: event.status === 'live',
      ageRestriction: 'All Ages',
      attendees: undefined
    }))

  } catch (error) {
    console.error('Eventbrite API error:', error)
    return []
  }
}

// Search events from SeatGeek API
async function searchSeatGeekEvents(params: EventSearchParams): Promise<MusicEvent[]> {
  const SEATGEEK_CLIENT_ID = import.meta.env.VITE_SEATGEEK_CLIENT_ID
  
  if (!SEATGEEK_CLIENT_ID) {
    console.warn('SeatGeek API key not configured')
    return []
  }

  try {
    const searchParams = new URLSearchParams({
      client_id: SEATGEEK_CLIENT_ID,
      q: params.query || 'music',
      'venue.city': params.location || '',
      per_page: '50',
      sort: 'datetime_utc.asc'
    })

    const response = await fetch(`https://api.seatgeek.com/2/events?${searchParams}`)

    if (!response.ok) {
      throw new Error(`SeatGeek API error: ${response.status}`)
    }

    const data = await response.json()
    const events = data.events || []
    
    return events.map((event: any) => ({
      id: `seatgeek_${event.id}`,
      title: event.title || 'Untitled Event',
      artist: event.performers?.[0]?.name || 'Various Artists',
      venue: event.venue?.name || 'TBA',
      location: `${event.venue?.city || ''}, ${event.venue?.state || ''}`.trim(),
      city: event.venue?.city || '',
      state: event.venue?.state || '',
      country: event.venue?.country || 'US',
      date: event.datetime_utc ? new Date(event.datetime_utc).toISOString().split('T')[0] : '',
      time: event.datetime_utc ? new Date(event.datetime_utc).toLocaleTimeString() : 'TBA',
      price: event.stats?.lowest_price ? `$${event.stats.lowest_price}+` : 'See Tickets',
      genre: event.type || 'Music',
      description: event.description || '',
      image: event.performers?.[0]?.image || '',
      url: event.url || '#',
      source: 'seatgeek',
      ticketsAvailable: event.status === 'normal',
      ageRestriction: 'All Ages',
      attendees: event.stats?.listing_count
    }))

  } catch (error) {
    console.error('SeatGeek API error:', error)
    return []
  }
}

// Fallback to mock data when APIs are unavailable
function getMockEvents(): MusicEvent[] {
  const baseDate = new Date()
  const events: MusicEvent[] = []
  
  const mockEventData = [
    {
      title: 'Summer Music Festival',
      artist: 'Various Artists',
      venue: 'Central Park',
      location: '123 Park Ave, New York, NY',
      city: 'New York',
      state: 'NY',
      price: '$45',
      genre: 'Festival',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
      daysOffset: 7
    },
    {
      title: 'Jazz Night',
      artist: 'The Blue Notes',
      venue: 'Blue Note Jazz Club',
      location: '456 Music St, Chicago, IL',
      city: 'Chicago',
      state: 'IL',
      price: '$25',
      genre: 'Jazz',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      daysOffset: 3
    },
    {
      title: 'Rock Concert',
      artist: 'The Thunderbolts',
      venue: 'Madison Square Garden',
      location: '4 Pennsylvania Plaza, New York, NY',
      city: 'New York',
      state: 'NY',
      price: '$75',
      genre: 'Rock',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=300&fit=crop',
      daysOffset: 14
    },
    {
      title: 'Electronic Music Festival',
      artist: 'Various DJs',
      venue: 'Brooklyn Warehouse',
      location: '123 Industrial Blvd, Brooklyn, NY',
      city: 'Brooklyn',
      state: 'NY',
      price: '$60',
      genre: 'Electronic',
      image: 'https://images.unsplash.com/photo-1571266028243-e68f97f8f844?w=400&h=300&fit=crop',
      daysOffset: 21
    },
    {
      title: 'Country Music Night',
      artist: 'Nashville Stars',
      venue: 'Grand Ole Opry',
      location: '2804 Opryland Dr, Nashville, TN',
      city: 'Nashville',
      state: 'TN',
      price: '$80',
      genre: 'Country',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
      daysOffset: 28
    },
    {
      title: 'Hip-Hop Showcase',
      artist: 'Local Rappers',
      venue: 'The Underground',
      location: '789 Music Ave, Los Angeles, CA',
      city: 'Los Angeles',
      state: 'CA',
      price: '$30',
      genre: 'Hip-Hop',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
      daysOffset: 35
    },
    {
      title: 'Louisville Music Festival',
      artist: 'Various Artists',
      venue: 'KFC Yum! Center',
      location: '1 Arena Plaza, Louisville, KY',
      city: 'Louisville',
      state: 'KY',
      price: '$65',
      genre: 'Festival',
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=300&fit=crop',
      daysOffset: 10
    },
    {
      title: 'Indie Rock Night',
      artist: 'The Mercury Sessions',
      venue: 'Mercury Ballroom',
      location: '611 S 4th St, Louisville, KY',
      city: 'Louisville',
      state: 'KY',
      price: '$25',
      genre: 'Rock',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      daysOffset: 5
    },
    {
      title: 'Bluegrass & Bourbon',
      artist: 'Kentucky Strings',
      venue: 'Headliners Music Hall',
      location: '1386 Lexington Rd, Louisville, KY',
      city: 'Louisville',
      state: 'KY',
      price: '$20',
      genre: 'Country',
      image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
      daysOffset: 8
    },
    {
      title: 'Classical Symphony',
      artist: 'City Philharmonic',
      venue: 'Carnegie Hall',
      location: '881 7th Ave, New York, NY',
      city: 'New York',
      state: 'NY',
      price: '$100',
      genre: 'Classical',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      daysOffset: 42
    },
    {
      title: 'Pop Music Concert',
      artist: 'Chart Toppers',
      venue: 'Hollywood Bowl',
      location: '2301 N Highland Ave, Los Angeles, CA',
      city: 'Los Angeles',
      state: 'CA',
      price: '$120',
      genre: 'Pop',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      daysOffset: 49
    }
  ]
  
  mockEventData.forEach((event, index) => {
    const eventDate = new Date(baseDate.getTime() + event.daysOffset * 24 * 60 * 60 * 1000)
    events.push({
      id: `mock_${index + 1}`,
      title: event.title,
      artist: event.artist,
      venue: event.venue,
      location: event.location,
      city: event.city,
      state: event.state,
      country: 'US',
      date: eventDate.toISOString(),
      time: '20:00',
      price: event.price,
      genre: event.genre,
      description: `Live music event featuring ${event.artist} at ${event.venue}.`,
      image: event.image,
      url: '#',
      source: 'mock',
      ticketsAvailable: true,
      ageRestriction: 'All Ages'
    })
  })
  
  return events
}

export interface EventSearchParams {
  query?: string
  location?: string
  radius?: number
  startDate?: string
  endDate?: string
  genre?: string
}

export const eventService = {
  /**
   * Search for music events across multiple APIs
   */
  async searchEvents(params: EventSearchParams): Promise<MusicEvent[]> {
    try {
      // Search all enabled APIs in parallel
      const [alleventsResults, ticketmasterResults, eventbriteResults, seatgeekResults] = await Promise.allSettled([
        searchAllEvents(params),
        searchTicketmasterEvents(params),
        searchEventbriteEvents(params),
        searchSeatGeekEvents(params)
      ])

      // Combine results from all APIs
      const allEvents: MusicEvent[] = []
      
      if (alleventsResults.status === 'fulfilled') {
        allEvents.push(...alleventsResults.value)
      }
      
      if (ticketmasterResults.status === 'fulfilled') {
        console.log('Ticketmaster results:', ticketmasterResults.value.length, 'events')
        allEvents.push(...ticketmasterResults.value)
      } else {
        console.log('Ticketmaster failed:', ticketmasterResults.reason)
      }
      
      if (eventbriteResults.status === 'fulfilled') {
        console.log('Eventbrite results:', eventbriteResults.value.length, 'events')
        allEvents.push(...eventbriteResults.value)
      } else {
        console.log('Eventbrite failed:', eventbriteResults.reason)
      }
      
      if (seatgeekResults.status === 'fulfilled') {
        allEvents.push(...seatgeekResults.value)
      }

      // Remove duplicates based on title and date
      const uniqueEvents = allEvents.filter((event, index, self) => 
        index === self.findIndex(e => 
          e.title === event.title && 
          e.date === event.date &&
          e.venue === event.venue
        )
      )

      // Sort by date (upcoming events first)
      uniqueEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      console.log('Total unique events found:', uniqueEvents.length)
      
      // If no real events found, return mock data
      if (uniqueEvents.length === 0) {
        console.log('No real events found, using mock data')
        return getMockEvents()
      }

      console.log('Returning', uniqueEvents.slice(0, 100).length, 'events')
      return uniqueEvents.slice(0, 100) // Limit total results

    } catch (error) {
      console.error('Event search error:', error)
      return getMockEvents()
    }
  },

  /**
   * Get events by location with radius filtering
   */
  async getEventsByLocation(location: string, radius: number = 15): Promise<MusicEvent[]> {
    return this.searchEvents({
      location,
      radius
    })
  },

  /**
   * Get trending/featured events
   */
  async getTrendingEvents(): Promise<MusicEvent[]> {
    return this.searchEvents({
      query: 'music concert festival',
      radius: 50
    })
  },

  /**
   * Get events by genre
   */
  async getEventsByGenre(genre: string): Promise<MusicEvent[]> {
    return this.searchEvents({
      query: genre,
      radius: 25
    })
  }
}


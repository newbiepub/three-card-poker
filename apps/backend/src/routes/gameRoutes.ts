import { Hono } from 'hono'
import { PlayerService } from '../services/playerService'
import { RoomService } from '../services/roomService'
import { GameService } from '../services/gameService'
import { ScoreService } from '../services/scoreService'
import { SessionService } from '../services/sessionService'
import { RoomCodeService } from '../services/roomCodeService'

const app = new Hono()

// Player registration
app.post('/players/register', async (c) => {
  const { name } = await c.req.json()
  
  try {
    const player = await PlayerService.getOrCreatePlayer(name)
    const stats = await PlayerService.getPlayerStats(player.id)
    const isNewPlayer = player.totalGames === 0
    
    return c.json({
      player,
      stats,
      isNewPlayer
    })
  } catch (error) {
    return c.json({ error: 'Failed to register player' }, 500)
  }
})

// Get player info
app.get('/players/:playerName', async (c) => {
  const playerName = c.req.param('playerName')
  
  const player = await PlayerService.getOrCreatePlayer(playerName)
  const stats = await PlayerService.getPlayerStats(player.id)
  const rank = await ScoreService.getPlayerRank(player.id)
  
  return c.json({ player, stats, rank })
})

// Create room (host)
app.post('/rooms/create', async (c) => {
  const { hostName, roomName, totalRounds, maxPlayers } = await c.req.json()
  
  try {
    // Get or create host player
    const host = await PlayerService.getOrCreatePlayer(hostName)
    
    // Create room
    const room = await RoomService.createRoom(roomName || `${host.name}'s Room`, host.id, maxPlayers)
    
    // Create initial session
    const session = await SessionService.createSession(room.id, host.id, totalRounds || 10)
    
    return c.json({
      room,
      roomCode: room.roomCode,
      session,
      host
    })
  } catch (error) {
    return c.json({ error: 'Failed to create room' }, 500)
  }
})

// Join room by code
app.post('/rooms/join', async (c) => {
  const { roomCode, playerName } = await c.req.json()
  
  try {
    // Validate room code
    if (!RoomCodeService.isValidRoomCode(roomCode)) {
      return c.json({ error: 'Invalid room code format' }, 400)
    }
    
    // Check if can join
    const canJoin = await RoomCodeService.canJoinRoom(roomCode)
    if (!canJoin.canJoin) {
      return c.json({ error: canJoin.reason }, 400)
    }
    
    // Get or create player
    const player = await PlayerService.getOrCreatePlayer(playerName)
    
    // Get room with session
    const room = await RoomService.getRoomByCode(roomCode)
    if (!room) {
      return c.json({ error: 'Room not found' }, 404)
    }
    
    const session = room.currentSession ? await SessionService.getSessionById(room.currentSession.id) : null
    
    // TODO: Add player to room (need room_players table)
    
    return c.json({
      room,
      session,
      player,
      isHost: room.hostId === player.id
    })
  } catch (error) {
    return c.json({ error: 'Failed to join room' }, 500)
  }
})

// Get room by code
app.get('/rooms/:roomCode', async (c) => {
  const roomCode = c.req.param('roomCode')
  
  const room = await RoomService.getRoomByCode(roomCode)
  if (!room) {
    return c.json({ error: 'Room not found' }, 404)
  }
  
  const session = room.currentSession ? await SessionService.getSessionById(room.currentSession.id) : null
  const stats = await RoomService.getRoomStats(room.id)
  
  return c.json({ room, session, stats })
})

// Session control endpoints
app.post('/sessions/:sessionId/start', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { hostId } = await c.req.json()
  
  try {
    // Verify host
    const isHost = await SessionService.isHost(sessionId, hostId)
    if (!isHost) {
      return c.json({ error: 'Only host can start session' }, 403)
    }
    
    await SessionService.startSession(sessionId)
    
    // Get session to find room
    const session = await SessionService.getSessionById(sessionId)
    if (session && session.roomId) {
      // Broadcast game started to all players in the room
      // This is a simple broadcast - in a real app, you'd use the WebSocket server
    }
    
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: 'Failed to start session' }, 500)
  }
})


app.post('/sessions/:sessionId/reset', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { hostId, newTotalRounds } = await c.req.json()
  
  try {
    // Verify host
    const isHost = await SessionService.isHost(sessionId, hostId)
    if (!isHost) {
      return c.json({ error: 'Only host can reset session' }, 403)
    }
    
    const newSession = await SessionService.resetSession(sessionId, newTotalRounds)
    
    return c.json({ session: newSession })
  } catch (error) {
    return c.json({ error: 'Failed to reset session' }, 500)
  }
})

// Get session leaderboard
app.get('/sessions/:sessionId/leaderboard', async (c) => {
  const sessionId = c.req.param('sessionId')
  
  const leaderboard = await SessionService.getSessionLeaderboard(sessionId)
  
  return c.json({ leaderboard })
})

// Get session history
app.get('/sessions/:sessionId/history', async (c) => {
  const sessionId = c.req.param('sessionId')
  
  const history = await SessionService.getSessionHistory(sessionId)
  
  return c.json({ history })
})

// Legacy endpoints
app.get('/rooms', async (c) => {
  const rooms = await RoomService.getActiveRooms()
  return c.json({ rooms })
})

app.get('/leaderboard', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10')
  const leaderboard = await ScoreService.getTopPlayers(limit)
  
  return c.json({ leaderboard })
})

app.get('/players/:playerId/history', async (c) => {
  const playerId = c.req.param('playerId')
  const limit = parseInt(c.req.query('limit') || '20')
  
  const history = await ScoreService.getPlayerScoreHistory(playerId, limit)
  
  return c.json({ history })
})

app.get('/rooms/:roomId/history', async (c) => {
  const roomId = c.req.param('roomId')
  const limit = parseInt(c.req.query('limit') || '20')
  
  const history = await GameService.getRoomGameHistory(roomId, limit)
  
  return c.json({ history })
})

// Track ongoing draw-card operations to prevent race conditions
const drawCardLocks = new Map<string, boolean>()

// Draw a single card for a player (unique across session/round)
app.post('/sessions/:sessionId/draw-card', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { playerId } = await c.req.json()
  const lockKey = `${sessionId}`

  try {
    if (drawCardLocks.get(lockKey)) {
      return c.json({ error: 'Draw already in progress' }, 429)
    }

    drawCardLocks.set(lockKey, true)

    const session = await SessionService.getSessionById(sessionId)
    if (!session) {
      drawCardLocks.delete(lockKey)
      return c.json({ error: 'Session not found' }, 404)
    }

    if (session.status === 'finished') {
      drawCardLocks.delete(lockKey)
      return c.json({ error: 'Session has finished' }, 400)
    }

    const { card, remaining } = await SessionService.drawCardForRound(sessionId, session.currentRound)
    const { hand, score } = await SessionService.appendPlayerCard(
      sessionId,
      playerId,
      session.currentRound,
      card
    )

    if (score !== null) {
      await SessionService.savePlayerHand(
        sessionId,
        playerId,
        session.currentRound,
        hand,
        score
      )
    }

    drawCardLocks.delete(lockKey)
    return c.json({
      card,
      hand,
      score,
      remaining,
      playerId
    })
  } catch (error) {
    console.error('Error drawing card:', error)
    drawCardLocks.delete(lockKey)
    return c.json({ error: 'Failed to draw card' }, 500)
  }
})

// Publish score for a player
app.post('/sessions/:sessionId/publish-score', async (c) => {
  const sessionId = c.req.param('sessionId')
  const { playerId, score, roundNumber } = await c.req.json()
  
  try {
    // Get session
    const session = await SessionService.getSessionById(sessionId)
    if (!session || session.status !== 'playing') {
      return c.json({ error: 'Session not active' }, 400)
    }
    
    // Save score to database
    const scoreRecord = await SessionService.savePlayerScore(
      sessionId,
      playerId,
      roundNumber || session.currentRound,
      score
    )
    
    return c.json({
      success: true,
      scoreRecord
    })
  } catch (error) {
    return c.json({ error: 'Failed to publish score' }, 500)
  }
})

// Track ongoing next round operations to prevent race conditions
const nextRoundLocks = new Map<string, boolean>()

// Update session round
app.post('/sessions/:sessionId/next-round', async (c) => {
  const sessionId = c.req.param('sessionId')
  
  try {
    // Check if next round is already being processed
    if (nextRoundLocks.get(sessionId)) {
      return c.json({ error: 'Next round already in progress' }, 429)
    }
    
    // Acquire lock
    nextRoundLocks.set(sessionId, true)
    
    const session = await SessionService.getSessionById(sessionId)
    if (!session) {
      nextRoundLocks.delete(sessionId)
      return c.json({ error: 'Session not found' }, 404)
    }
    
    await SessionService.recalculateRoundPoints(sessionId, session.currentRound)
    const nextRound = session.currentRound + 1
    
    const updatedSession = await SessionService.updateSessionRound(sessionId, nextRound)

    if (updatedSession.status !== 'finished') {
      await SessionService.resetDeckForRound(sessionId, updatedSession.currentRound)
    }
    
    
    // Release lock
    nextRoundLocks.delete(sessionId)
    
    return c.json({
      session: updatedSession
    })
  } catch (error) {
    console.error('Error updating round:', error)
    // Release lock on error
    nextRoundLocks.delete(sessionId)
    return c.json({ error: 'Failed to update round', details: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

// Get session state (for refresh)
app.get('/sessions/:sessionId/state', async (c) => {
  const sessionId = c.req.param('sessionId')
  
  try {
    const session = await SessionService.getSessionById(sessionId)
    if (!session) {
      return c.json({ error: 'Session not found' }, 404)
    }
    
    const currentRoundScores = await SessionService.getRoundScores(sessionId, session.currentRound)
    const allScores = await SessionService.getAllPlayerScores(sessionId)
    const latestScoreByPlayer = new Map<string, typeof allScores[number]>()
    for (const score of allScores) {
      const existing = latestScoreByPlayer.get(score.playerId)
      if (!existing || score.roundNumber > existing.roundNumber) {
        latestScoreByPlayer.set(score.playerId, score)
      }
    }
    
    return c.json({
      session,
      currentRound: session.currentRound,
      scores: currentRoundScores.map(s => ({
        playerId: s.playerId,
        playerName: s.playerName,
        gameScore: s.gameScore,
        pointsChange: s.pointsChange,
        cumulativeScore: latestScoreByPlayer.get(s.playerId)?.cumulativeScore ?? s.cumulativeScore,
        cards: s.cards ? JSON.parse(s.cards) : null
      })),
      allScores: allScores
    })
  } catch (error) {
    return c.json({ error: 'Failed to get session state' }, 500)
  }
})

// ...

export default app

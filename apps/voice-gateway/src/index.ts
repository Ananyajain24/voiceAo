// src/index.ts

import "dotenv/config"
import express from "express"
import bodyParser from "body-parser"
import { WebhookReceiver } from "livekit-server-sdk"

import { loadEnv } from "./config/env"
import { RoomManager } from "./livekit/room.manager"
import { ParticipantManager } from "./livekit/participant.manager"
import { TrackManager } from "./livekit/track.manager"

// --------------------
// Process state
// --------------------
let shuttingDown = false

// --------------------
// Bootstrap
// --------------------
async function boot() {
  try {
    console.log("[BOOT] Starting Voice Gateway")

    // 1️⃣ Load environment
    const env = loadEnv()

    // 2️⃣ Create managers (NO logic here)
    const roomManager = new RoomManager(
      env.LIVEKIT_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    )

    const participantManager = new ParticipantManager(roomManager)
    const trackManager = new TrackManager()

    // 3️⃣ Setup webhook server
    const app = express()

    // IMPORTANT: must be raw for signature verification
    app.use(bodyParser.raw({ type: "application/webhook+json" }))

    const receiver = new WebhookReceiver(
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    )

    app.post("/livekit/webhook", async (req, res) => {
      try {
        const event = await receiver.receive(
          req.body,
          req.headers["authorization"]
        )

        console.log("[WEBHOOK] Event received:", event.event)

        const callId = event.room?.metadata
          ? JSON.parse(event.room.metadata).callId
          : undefined

        if (!callId) {
          return res.status(200).send("ignored")
        }

        // --------------------
        // Participant lifecycle
        // --------------------
        if (event.event === "participant_joined" && event.participant) {
          await participantManager.onParticipantConnected(callId, {
            identity: event.participant.identity,
            metadata: event.participant.metadata,
          })
        }

        if (event.event === "participant_left" && event.participant) {
          await participantManager.onParticipantDisconnected(callId, {
            identity: event.participant.identity,
            metadata: event.participant.metadata,
          })
        }

        // --------------------
        // Track lifecycle
        // --------------------
        if (event.event === "track_published" && event.participant && event.track) {
          const role = participantManager.resolveRole({
            identity: event.participant.identity,
            metadata: event.participant.metadata,
          })

          trackManager.onTrackPublished(
            {
              sid: event.track.sid,
              kind: event.track.type === 0 ? "audio" : "video",
            },
            {
              identity: event.participant.identity,
              metadata: event.participant.metadata,
            },
            role
          )
        }

        if (event.event === "track_unpublished" && event.track) {
          trackManager.onTrackUnpublished(event.track.sid)
        }

        res.status(200).send("ok")
      } catch (err) {
        console.error("[WEBHOOK] Invalid event", err)
        res.status(400).send("invalid")
      }
    })

    // 4️⃣ Start server
    const PORT = 3000
    app.listen(PORT, () => {
      console.log(`[BOOT] Webhook server listening on :${PORT}`)
    })

    console.log("[BOOT] Voice Gateway ready")
  } catch (err) {
    console.error("[BOOT] Fatal startup error:", err)
    process.exit(1)
  }
}

// --------------------
// Shutdown
// --------------------
async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`[SHUTDOWN] Received ${signal}`)
  process.exit(0)
}

process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("uncaughtException", err => {
  console.error("[FATAL] Uncaught exception", err)
  shutdown("uncaughtException")
})
process.on("unhandledRejection", err => {
  console.error("[FATAL] Unhandled rejection", err)
  shutdown("unhandledRejection")
})

// --------------------
// Start
// --------------------
boot()

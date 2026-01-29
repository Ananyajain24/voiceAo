import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import {
  WebhookEvent,
  WebhookReceiver,
} from "livekit-server-sdk";

import {
  createOrGetRoom,
  closeRoom,
} from "./livekit/room.manager";

import {
  onParticipantConnected,
  onParticipantDisconnected,
} from "./livekit/participant.manager";

import {
  onTrackPublished,
  onTrackUnpublished,
} from "./livekit/track.manager";

const PORT = process.env.PORT || 3001;

// -------------------------------------
// LiveKit Webhook Setup
// -------------------------------------
const receiver = new WebhookReceiver(
  process.env.LIVEKIT_API_KEY!,
  process.env.LIVEKIT_API_SECRET!
);

// -------------------------------------
// HTTP Server
// -------------------------------------
const app = express();
app.use(bodyParser.json());

// -------------------------------------
// Webhook Endpoint
// -------------------------------------
app.post("/livekit/webhook", async (req, res) => {
  let event: WebhookEvent;

  try {
    event = await receiver.receive(
      req.body,
      req.headers["authorization"] as string
    );
  } catch (err) {
    console.error("Invalid webhook:", err);
    res.status(401).send("invalid");
    return;
  }

  const callId =
    event.room?.metadata
      ? JSON.parse(event.room.metadata).callId
      : undefined;

  if (!callId) {
    res.status(200).send("ignored");
    return;
  }

  // ---------------------------------
  // Event Routing
  // ---------------------------------
  switch (event.event) {
    case "room_started":
      await createOrGetRoom(callId);
      break;

    case "participant_joined":
      if (event.participant) {
        onParticipantConnected(
          event.participant,
          callId
        );
      }
      break;

    case "participant_left":
      if (event.participant) {
        await onParticipantDisconnected(
          event.participant,
          callId
        );
      }
      break;

    case "track_published":
      if (event.track && event.participant) {
        onTrackPublished(
          event.track,
          event.participant,
          callId
        );
      }
      break;

    case "track_unpublished":
      if (event.track) {
        onTrackUnpublished(event.track);
      }
      break;

    case "room_finished":
      await closeRoom(callId);
      break;

    default:
      // ignore
      break;
  }

  res.status(200).send("ok");
});

// -------------------------------------
// Startup
// -------------------------------------
app.listen(PORT, () => {
  console.log(
    `Voice Gateway listening on port ${PORT}`
  );
});

// -------------------------------------
// Graceful Shutdown
// -------------------------------------
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down");
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down");
  process.exit(0);
});

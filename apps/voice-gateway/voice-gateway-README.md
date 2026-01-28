# 🎧 Voice Gateway (Audio Gateway)

## Overview

The **Voice Gateway** is the realtime audio and infrastructure layer of the AI Voice Platform.
It is responsible for managing LiveKit rooms, participants, audio tracks, and recordings.

This service is intentionally *dumb but reliable*:
- No AI logic
- No language understanding
- No database writes

Its only job is to make realtime audio **work correctly and observably**.

---

## Responsibilities

- Create and manage LiveKit rooms
- Manage participants and roles
- Subscribe and publish audio tracks
- Start and stop call recordings
- Emit lifecycle events
- Monitor latency and stream health

### Explicitly Out of Scope

- LLM / AI logic
- ASR / TTS
- Tool execution
- Language detection
- Business decisions (handoff, sentiment, intent)

---

## Folder Structure

```
voice-gateway/
├── src/
│   ├── livekit/
│   │   ├── room.manager.ts
│   │   ├── participant.manager.ts
│   │   ├── track.manager.ts
│   │   └── egress.manager.ts
│   │
│   ├── streaming/
│   │   ├── audio.ingress.ts
│   │   ├── audio.egress.ts
│   │   └── latency.monitor.ts
│   │
│   ├── events/
│   │   ├── call.events.ts
│   │   └── handoff.events.ts
│   │
│   └── index.ts
│
├── Dockerfile
└── README.md
```

---

## Runtime Model

### One Call = One Room

Room name:
```
call_<call_id>
```

Participants:
- driver_<call_id>
- bot_<call_id>
- human_<call_id> (optional)

Tracks:
- Driver: mic audio
- Bot: TTS audio
- Human: mic audio

---

## File-Level Responsibilities

### room.manager.ts
Creates and destroys LiveKit rooms.

Pseudocode:
```
createRoom(callId)
if exists → reuse
else → create with metadata
```

Expected behavior:
- No duplicate rooms
- Metadata always contains call_id
- Cleanup always runs

---

### participant.manager.ts
Tracks participants and roles.

Pseudocode:
```
onJoin → identify role → emit event
onLeave → emit event → check termination
```

Expected behavior:
- Driver leaving ends call
- Bot join does not start call

---

### track.manager.ts
Handles audio track subscriptions.

Pseudocode:
```
onTrackPublished
if audio → subscribe → tag role
```

Expected behavior:
- Bot never hears itself
- Audio restarts do not crash

---

### egress.manager.ts
Manages recordings.

Pseudocode:
```
startRecording(callId)
stopRecording(callId)
```

Expected behavior:
- One recording per call
- Separate audio tracks
- Safe shutdown

---

### audio.ingress.ts
Handles incoming audio frames.

Pseudocode:
```
validate frame → forward → monitor loss
```

Expected behavior:
- Drop invalid frames
- No blocking operations

---

### audio.egress.ts
Publishes outgoing audio.

Pseudocode:
```
validate → publish frame
```

Expected behavior:
- No overlapping audio
- Low latency

---

### latency.monitor.ts
Monitors realtime health.

Pseudocode:
```
measure jitter, delay → emit warnings
```

Expected behavior:
- Detect spikes
- Ignore silence

---

### call.events.ts
Emits call lifecycle events.

Events:
- CALL_STARTED
- CALL_ENDED
- PARTICIPANT_JOINED
- PARTICIPANT_LEFT

Expected behavior:
- Idempotent
- Every call has end event

---

### handoff.events.ts
Emits infra-level handoff events.

Events:
- HANDOFF_REQUESTED
- HUMAN_JOINED
- BOT_MUTED

Expected behavior:
- No AI logic
- Emitted once

---

### index.ts
Application entry point.

Responsibilities:
- Boot LiveKit
- Register listeners
- Health checks
- Graceful shutdown

---

## Failure Scenarios to Test

1. Driver disconnects mid-call
2. Bot restarts
3. Human joins late
4. Recording fails
5. Network jitter
6. Duplicate events

System must degrade gracefully and remain observable.

---

## Invariants

- One call → one room
- One recording session per call
- No business logic
- No persistent state writes
- Everything observable

---

## Philosophy

The Voice Gateway should never become clever.

If it does, responsibilities have leaked.

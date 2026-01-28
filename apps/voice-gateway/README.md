# 🎧 Voice Gateway (Audio Gateway) — Detailed Design & Pseudocode

This document goes **one level deeper** than architecture.  
It describes **how each core file should roughly look**, using **structured pseudocode** (not real code), so engineers share the same mental model before implementation.

This is intentional: realtime audio systems fail when people “fill in gaps differently.”

---

## Design Goals

- Deterministic behavior
- No hidden side effects
- Easy to reason about failures
- Observable at every stage
- Boring and reliable

---

## Runtime Invariants (Never Break)

- One call → one LiveKit room
- One room → one recording session
- Driver audio always flows
- Bot never hears itself
- Gateway never decides business logic
- All state is ephemeral

---

## `src/livekit/room.manager.ts`

### Responsibility
Create, fetch, and teardown LiveKit rooms safely.

### Core API Shape
```
createOrGetRoom(callId)
closeRoom(callId)
```

### Pseudocode
```
function createOrGetRoom(callId):
    roomName = "call_" + callId

    if livekit.roomExists(roomName):
        return livekit.getRoom(roomName)

    room = livekit.createRoom({
        name: roomName,
        metadata: { callId },
        maxParticipants: 3,
        enableEgress: true
    })

    return room


function closeRoom(callId):
    roomName = "call_" + callId

    participants = livekit.listParticipants(roomName)
    for p in participants:
        p.disconnect()

    stopRecording(callId)
    livekit.deleteRoom(roomName)
```

### Key Guarantees
- Idempotent room creation
- Cleanup always runs
- No dangling rooms

---

## `src/livekit/participant.manager.ts`

### Responsibility
Identify participants and track role-based lifecycle.

### Core API Shape
```
onParticipantConnected(participant)
onParticipantDisconnected(participant)
```

### Pseudocode
```
function onParticipantConnected(participant):
    role = resolveRole(participant.identity)

    participant.metadata.role = role

    emitEvent("PARTICIPANT_JOINED", {
        callId,
        role,
        participantId
    })

    if role == "driver":
        emitEvent("CALL_STARTED")


function onParticipantDisconnected(participant):
    role = participant.metadata.role

    emitEvent("PARTICIPANT_LEFT", {
        callId,
        role
    })

    if role == "driver":
        emitEvent("CALL_ENDED")
        closeRoom(callId)
```

### Key Guarantees
- Role always resolved
- Driver controls call lifetime
- Bot join does not start call

---

## `src/livekit/track.manager.ts`

### Responsibility
Subscribe to and manage audio tracks.

### Core API Shape
```
onTrackPublished(track, participant)
onTrackUnpublished(track)
```

### Pseudocode
```
function onTrackPublished(track, participant):
    if track.kind != "audio":
        return

    role = participant.metadata.role

    if role == "bot":
        return  // prevent echo

    subscription = track.subscribe()

    routeAudio(subscription, role)


function onTrackUnpublished(track):
    safelyDetachPipeline(track)
```

### Key Guarantees
- Bot never subscribes to its own audio
- Audio pipeline is attach/detach safe

---

## `src/livekit/egress.manager.ts`

### Responsibility
Start and stop call recordings.

### Core API Shape
```
startRecording(callId)
stopRecording(callId)
```

### Pseudocode
```
function startRecording(callId):
    if recordingAlreadyRunning(callId):
        return

    sink = recordingAdapter.getSink(callId)
    livekit.startEgress({ sink })


function stopRecording(callId):
    egress = getEgressHandle(callId)
    if egress:
        egress.stop()
```

### Key Guarantees
- Exactly one egress per call
- Safe stop on failure

---

## `src/streaming/audio.ingress.ts`

### Responsibility
Handle incoming audio frames from LiveKit.

### Core API Shape
```
onAudioFrame(frame, role)
```

### Pseudocode
```
function onAudioFrame(frame, role):
    if frame.sampleRate not supported:
        drop frame
        return

    if frame.isSilent():
        forward(frame)
        return

    forward(frame)
    monitorPacketLoss(frame)
```

### Key Guarantees
- Never blocks realtime loop
- Invalid frames dropped safely

---

## `src/streaming/audio.egress.ts`

### Responsibility
Publish outgoing audio (mainly bot TTS).

### Core API Shape
```
publishAudio(frame)
```

### Pseudocode
```
function publishAudio(frame):
    if frame.format invalid:
        log error
        return

    livekitTrack.publish(frame)
```

### Key Guarantees
- No overlapping frames
- Timing preserved

---

## `src/streaming/latency.monitor.ts`

### Responsibility
Measure realtime health.

### Core API Shape
```
recordFrameTiming(frame)
reportIfThresholdExceeded()
```

### Pseudocode
```
function recordFrameTiming(frame):
    delay = now - frame.timestamp
    updateRollingWindow(delay)


function reportIfThresholdExceeded():
    if avgDelay > threshold:
        emitWarning("HIGH_LATENCY")
```

### Key Guarantees
- No false alarms on silence
- Warnings, not crashes

---

## `src/events/call.events.ts`

### Responsibility
Emit call lifecycle events.

### Core API Shape
```
emitCallEvent(type, payload)
```

### Pseudocode
```
function emitCallEvent(type, payload):
    if eventAlreadyEmitted(type, callId):
        return

    orchestrator.send({
        type,
        payload,
        timestamp
    })
```

### Key Guarantees
- Idempotent
- Ordered

---

## `src/events/handoff.events.ts`

### Responsibility
Emit infra-only handoff events.

### Core API Shape
```
emitHandoffEvent(type)
```

### Pseudocode
```
function emitHandoffEvent(type):
    orchestrator.send({
        type,
        callId
    })
```

### Key Guarantees
- No AI logic
- Single emission

---

## `src/index.ts`

### Responsibility
Service bootstrap and shutdown.

### Pseudocode
```
boot():
    connectToLiveKit()
    registerRoomHandlers()
    registerParticipantHandlers()
    registerTrackHandlers()
    startHealthChecks()


shutdown():
    closeAllRooms()
    stopAllRecordings()
    exitCleanly()
```

### Key Guarantees
- No race conditions on startup
- Clean shutdown

---

## Testing Checklist (Must Pass)

- Duplicate room creation
- Bot restart mid-call
- Driver drops connection
- Human joins late
- Recording fails mid-call
- Network jitter spikes
- Graceful shutdown

---

## Final Philosophy

If you can’t explain what happens in this service **during a failure**, the design isn’t finished.

The Voice Gateway should remain:
- predictable,
- observable,
- boring.

Anything else belongs elsewhere.


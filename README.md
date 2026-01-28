# 🎙️ AI Voice Platform — Real-Time Multilingual Voice Agent with Warm Handoff

## Overview

This project is a **real-time AI voice platform** built for production-grade conversational systems such as customer support, logistics, and call centers.

It supports:
- Live audio streaming via LiveKit
- AI voice agent using Pipecat
- Noise suppression using DeepFilter
- Hinglish and regional language understanding
- Tool calling and backend integrations
- Warm handoff to human agents with preserved context
- Full call recording, transcripts, and analytics

The system is modular, auditable, and designed to scale independently across components.

---

## Core Design Principles

1. Strong separation of concerns  
2. One call equals one LiveKit room  
3. AI agent is stateless and sandboxed  
4. All decisions are logged and auditable  
5. Warm handoff transfers context, not raw transcripts  
6. Language adapts dynamically per call  
7. Frontend never controls infrastructure directly  

---

## High-Level Architecture

Caller (Driver)
 → LiveKit Room
   → Voice Gateway (audio + infra)
   → AI Agent (Pipecat)
       - Noise Suppression
       - ASR
       - Language Detection
       - LLM + Tools
       - TTS
   → Human Agent (on handoff)
 → Orchestrator API (state + storage)
 → Database & Analytics

---

## Repository Structure

```
ai-voice-platform/
├── apps/                # Runtime services & frontends
├── packages/            # Shared domain logic
├── infra/               # Infrastructure & deployment
├── scripts/             # Dev & ops scripts
├── docs/                # Architecture & ADRs
└── README.md
```

---

## apps/

### voice-gateway
Manages LiveKit rooms, audio tracks, and recordings.
- Creates rooms
- Tracks participants
- Handles egress recording
- Emits lifecycle events

No AI or database logic lives here.

---

### ai-agent
Pipecat-based AI voice agent.
- Audio ingestion
- DeepFilter noise suppression
- Streaming ASR
- Language + Hinglish detection
- Intent + tool routing
- TTS audio output

The agent never writes to databases or manages infra.

---

### orchestrator-api
System source of truth.
- Call lifecycle
- Context persistence
- Tool execution
- Handoff orchestration
- Analytics and audits

All state mutations flow through this service.

---

### admin-dashboard
Internal analytics UI.
- Call review
- Transcript inspection
- Failure analysis
- AI decision visibility

Read-only by design.

---

### agent-console
Human agent interface.
- Join LiveKit room
- View summarized context
- Speak to caller after handoff

No access to raw transcripts or prompts.

---

### public-widget
Optional embeddable client SDK for web/mobile.

---

## packages/

### audio
Audio utilities.
- DeepFilter integration
- Frame utilities
- Normalization

---

### nlp
Language intelligence.
- Language detection
- Hinglish classification
- Intent parsing

---

### memory
Conversation memory.
- Context builders
- Rolling summaries
- Snapshot generation

---

### tools
Tool abstraction layer.
- Schemas
- Adapters
- Safe execution wrappers

---

### llm
LLM abstraction.
- Provider adapters
- Prompt management
- Response normalization

---

### config
Shared configuration.

---

### types
Shared TypeScript contracts.

---

## infra/

Contains LiveKit, Redis, Postgres, observability, and deployment configs.
No application logic exists here.

---

## Call Lifecycle

1. Call requested
2. Orchestrator creates call record
3. Voice gateway creates LiveKit room
4. Driver and AI agent join
5. Conversation proceeds
6. Transcripts and events logged
7. Optional warm handoff
8. Call ends
9. Final summary and recordings stored

---

## Warm Handoff

Triggered by:
- User request
- Repeated failures
- High frustration
- Tool errors

Process:
1. Freeze AI speech
2. Generate context snapshot
3. Invite human agent
4. AI announces transfer
5. AI mutes but continues logging

---

## Language Handling

- Continuous detection
- Hinglish treated as first-class
- Responses mirror user language
- Language locked unless confidence drops

---

## Recording & Analytics

Stored artifacts:
1. Raw audio tracks
2. Turn-level transcripts
3. Semantic events

Enables QA, analytics, compliance, and model improvement.

---

## Running Locally

### Prerequisites
- Node.js 18+
- Docker
- pnpm or npm
- LiveKit server

### Install
```bash
pnpm install
```

### Start Infra
```bash
docker-compose up
```

### Start Services
```bash
pnpm dev
```

Recommended order:
1. orchestrator-api
2. voice-gateway
3. ai-agent
4. frontends

---

## Security Model

- AI agent has no DB access
- Tool execution is mediated
- All actions are logged
- Human agents have scoped access

---

## Why This Scales

- Independent service scaling
- Model swaps without infra changes
- Easy language expansion
- Plug-and-play tools
- Built-in observability

---

This repository intentionally prioritizes clarity and boundaries over speed.
Realtime voice systems fail silently when architecture is fuzzy — this design avoids that.

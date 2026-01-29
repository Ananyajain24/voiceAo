import { ParticipantInfo } from "livekit-server-sdk";
import { callEvents } from "../events/call.events.js";
import { closeRoom } from "./room.manager";

function resolveRole(identity: string): "driver" | "bot" | "human" {
  if (identity.startsWith("driver")) return "driver";
  if (identity.startsWith("bot")) return "bot";
  return "human";
}

export function onParticipantConnected(
  participant: ParticipantInfo,
  callId: string
) {
  const role = resolveRole(participant.identity);

  participant.metadata = JSON.stringify({ role });

  callEvents.emit("participant.joined", {
    callId,
    role,
    participantId: participant.identity,
  });

  if (role === "driver") {
    callEvents.emitCallStarted({
      callId,
      roomName: `call_${callId}`,
    });
  }
}

export async function onParticipantDisconnected(
  participant: ParticipantInfo,
  callId: string
) {
  let role: "driver" | "bot" | "human" = "human";

  try {
    if (participant.metadata) {
      role = JSON.parse(participant.metadata).role;
    }
  } catch {}

  callEvents.emit("participant.left", {
    callId,
    role,
    participantId: participant.identity,
  });

  if (role === "driver") {
    callEvents.emitCallEnded({
      callId,
      roomName: `call_${callId}`,
    });

    await closeRoom(callId);
  }
}

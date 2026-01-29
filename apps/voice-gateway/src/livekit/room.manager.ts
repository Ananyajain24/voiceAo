import { RoomServiceClient } from "livekit-server-sdk";
import { ENV } from "../config/env";
import { stopRecording } from "./egress.manager";

const livekit = new RoomServiceClient(
  ENV.LIVEKIT_URL,
  ENV.LIVEKIT_API_KEY,
  ENV.LIVEKIT_API_SECRET
);

// callId → roomName
const activeRooms = new Map<string, string>();

export async function createOrGetRoom(callId: string): Promise<string> {
  const roomName = `call_${callId}`;

  if (activeRooms.has(callId)) {
    return roomName;
  }

  const rooms = await livekit.listRooms();
  const exists = rooms.find(r => r.name === roomName);

  if (!exists) {
    await livekit.createRoom({
      name: roomName,
      metadata: JSON.stringify({ callId }),
      maxParticipants: 3,
    });
  }

  activeRooms.set(callId, roomName);
  return roomName;
}

export async function closeRoom(callId: string) {
  const roomName = activeRooms.get(callId);
  if (!roomName) return;

  try {
    const participants = await livekit.listParticipants(roomName);

    for (const p of participants) {
      await livekit.removeParticipant(roomName, p.identity);
    }

    await stopRecording(callId);
    await livekit.deleteRoom(roomName);
  } finally {
    activeRooms.delete(callId);
  }
}

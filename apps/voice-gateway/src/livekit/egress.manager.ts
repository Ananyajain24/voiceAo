import {
  EgressClient,
  EncodedOutputs,
  EncodedFileType,
  EgressInfo,
} from "livekit-server-sdk";
import { ENV } from "../config/env";

const egressClient = new EgressClient(
  ENV.LIVEKIT_URL,
  ENV.LIVEKIT_API_KEY,
  ENV.LIVEKIT_API_SECRET
);

// callId → egressId
const activeEgress = new Map<string, string>();

// -------------------------------
// Start Recording
// -------------------------------
export async function startRecording(callId: string) {
  if (activeEgress.has(callId)) return;

  const roomName = `call_${callId}`;

  try {
    const egress: EgressInfo =
  await egressClient.startRoomCompositeEgress(
    roomName,
    {
      fileOutputs: [
        {
          fileType: EncodedFileType.MP4,
          filepath: `recordings/${roomName}.mp4`,
        },
      ],
    } as EncodedOutputs,
    "speaker-light"
  );

    activeEgress.set(callId, egress.egressId);
  } catch (err) {
    console.error("Failed to start recording:", err);
  }
}

// -------------------------------
// Stop Recording
// -------------------------------
export async function stopRecording(callId: string) {
  const egressId = activeEgress.get(callId);
  if (!egressId) return;

  try {
    await egressClient.stopEgress(egressId);
  } catch (err) {
    console.error("Failed to stop recording:", err);
  } finally {
    activeEgress.delete(callId);
  }
}

import {
  TrackInfo,
  ParticipantInfo,
  TrackType,
} from "livekit-server-sdk";
import {
  attachAudioIngress,
  detachAudioIngress,
} from "../streaming/audio.ingress";


export function onTrackPublished(
  track: TrackInfo,
  participant: ParticipantInfo,
  callId: string
) {

  if (track.type !== TrackType.AUDIO) return;


  let role: "driver" | "bot" | "human" = "human";

  try {
    if (participant.metadata) {
      const parsed = JSON.parse(participant.metadata);
      role = parsed.role;
    }
  } catch {
    
  }

  if (role === "bot") {
    return;
  }

  const startTs = Date.now();


  attachAudioIngress({
    callId,
    participantId: participant.identity,
    trackSid: track.sid,
    role: role === "driver" ? "driver" : "human",
  });



}

export function onTrackUnpublished(
  track: TrackInfo
) {
  if (track.type !== TrackType.AUDIO) return;

  detachAudioIngress(track.sid);
}

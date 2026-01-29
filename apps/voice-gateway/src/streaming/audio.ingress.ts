import { AudioFrame } from "livekit";
import { latencyMonitor } from "./latency.monitor";


const activeIngress = new Map<
  string,
  {
    callId: string;
    participantId: string;
    role: "driver" | "human";
  }
>();


export function attachAudioIngress(params: {
  callId: string;
  participantId: string;
  trackSid: string;
  role: "driver" | "human";
}) {
  const { trackSid, callId, participantId, role } = params;

 
  if (activeIngress.has(trackSid)) return;

  activeIngress.set(trackSid, {
    callId,
    participantId,
    role,
  });
}


export function detachAudioIngress(trackSid: string) {
  if (!activeIngress.has(trackSid)) return;
  activeIngress.delete(trackSid);
}

export function onAudioFrame(trackSid: string, frame: AudioFrame) {
  const context = activeIngress.get(trackSid);
  if (!context) return;


  if (frame.sampleRate !== 16000 && frame.sampleRate !== 48000) {
    return;
  }


  latencyMonitor.recordFrameTiming(frame);

  forwardFrame(frame, context);
}


function forwardFrame(
  frame: AudioFrame,
  context: {
    callId: string;
    participantId: string;
    role: "driver" | "human";
  }
) {
 

  process.nextTick(() => {
   
  });
}

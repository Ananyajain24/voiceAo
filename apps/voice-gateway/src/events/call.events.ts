import { EventEmitter } from "events";

export type CallStartedEvent = {
  callId: string;
  roomName: string;
};

export type CallEndedEvent = {
  callId: string;
  roomName: string;
  reason?: string;
};

class CallEvents extends EventEmitter {
  emitCallStarted(event: CallStartedEvent) {
    this.emit("call.started", event);
  }

  emitCallEnded(event: CallEndedEvent) {
    this.emit("call.ended", event);
  }

  onCallStarted(
    listener: (event: CallStartedEvent) => void
  ) {
    this.on("call.started", listener);
  }

  onCallEnded(
    listener: (event: CallEndedEvent) => void
  ) {
    this.on("call.ended", listener);
  }
}

export const callEvents = new CallEvents();

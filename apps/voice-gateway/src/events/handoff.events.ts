import { EventEmitter } from "events";

export type HandoffRequestedEvent = {
  callId: string;
  from: "bot";
};

export type HandoffCompletedEvent = {
  callId: string;
  to: "human";
};

class HandoffEvents extends EventEmitter {
  emitHandoffRequested(event: HandoffRequestedEvent) {
    this.emit("handoff.requested", event);
  }

  emitHandoffCompleted(event: HandoffCompletedEvent) {
    this.emit("handoff.completed", event);
  }

  onHandoffRequested(
    listener: (event: HandoffRequestedEvent) => void
  ) {
    this.on("handoff.requested", listener);
  }

  onHandoffCompleted(
    listener: (event: HandoffCompletedEvent) => void
  ) {
    this.on("handoff.completed", listener);
  }
}

export const handoffEvents = new HandoffEvents();

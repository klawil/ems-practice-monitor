import { ServerMonitorActions } from "./state";

export type ClientType = 'monitor' | 'manager';

// Messages from client to server
interface JoinMessage {
  action: 'join';
  clientType: ClientType;
  id: string;
}
interface LeaveMessage {
  action: 'leave',
}

export type ClientWebsocketMessage = JoinMessage | LeaveMessage | ServerMonitorActions;

// Messages from server to client
interface InvalidMessage {
  action: 'invalid';
  message?: string;
}
interface InvalidIdMessage {
  action: 'invalid-id';
}

export type ServerWebsocketMessage = InvalidMessage | InvalidIdMessage
  | ServerMonitorActions;

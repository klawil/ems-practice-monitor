'use server';

import { ClientWebsocketMessage, ClientType, ServerWebsocketMessage } from '@/types/websocket';
import { WebSocket } from 'ws';

export async function GET() {
  const headers = new Headers();
  headers.set('Connection', 'Upgrade');
  headers.set('Upgrade', 'websocket');
  return new Response('Upgrade Required', { status: 426, headers });
}

const monitorManagerCache: {
  [key: string]: {
    monitor: WebSocket;
    manager?: WebSocket;
  };
} = {};

export async function SOCKET(
  client: WebSocket,
) {
  let clientType: ClientType = 'monitor';
  let monitorId: string | null = null;

  function sendMessage(message: ServerWebsocketMessage, recipient?: WebSocket) {
    (recipient || client).send(JSON.stringify(message));
  }

  const handleLeave = () => {
    if (monitorId === null) return;

    switch (clientType) {
      case 'manager':
        console.log(`Manager for ${monitorId} left`);
        delete monitorManagerCache[monitorId]?.manager;
        if (monitorManagerCache[monitorId]) {
          sendMessage({
            action: 'SetConnected',
            state: false,
          }, monitorManagerCache[monitorId].monitor);
        }
        break;
      case 'monitor':
        console.log(`Monitor ${monitorId} left`);
        if (monitorManagerCache[monitorId]?.manager) {
          sendMessage({
            action: 'SetConnected',
            state: false,
          }, monitorManagerCache[monitorId].manager);
        }
        delete monitorManagerCache[monitorId];
        break;
    }

    monitorId = null;
    clientType = 'monitor';
  }
  
  client.on('message', (messageRaw) => {
    try {
      const message = JSON.parse(messageRaw.toString()) as ClientWebsocketMessage;
      console.log(message);
      switch (message.action) {
        case 'join': {
          if (message.id === monitorId) return;
          clientType = message.clientType;
          switch (clientType) {
            case 'monitor': {
              if (typeof monitorManagerCache[message.id] !== 'undefined') {
                sendMessage({
                  action: 'invalid-id',
                });
                return;
              }

              monitorId = message.id;
              monitorManagerCache[message.id] = {
                monitor: client,
              };
              break;
            }
            case 'manager': {
              if (
                typeof monitorManagerCache[message.id] === 'undefined' ||
                typeof monitorManagerCache[message.id].manager !== 'undefined'
              ) {
                sendMessage({
                  action: 'invalid-id',
                });
                break;
              }

              monitorId = message.id;
              clientType = 'manager';
              monitorManagerCache[message.id].manager = client;
              sendMessage({
                action: 'SetConnected',
                state: true,
              }, monitorManagerCache[message.id].monitor);
              sendMessage({
                action: 'SetConnected',
                state: true,
              });
              break;
            }
          }
          break;
        }
        case 'leave': {
          handleLeave();
          break;
        }
        default: {
          if (monitorId === null) break;

          // Find the client to send the message to
          if (typeof monitorManagerCache[monitorId] === 'undefined') {
            monitorId = null;
            return;
          }
          const connectionConf = monitorManagerCache[monitorId];
          if (
            clientType === 'monitor' &&
            !connectionConf.manager
          ) return;

          const destination = connectionConf[
            clientType === 'manager'
              ? 'monitor'
              : 'manager'
          ] as WebSocket;
          sendMessage(message, destination);
        }
      }
    } catch (e) {
      console.error(`Invalid message - ${messageRaw.toString()}`, e);
    }
  });

  client.send('PING');

  return handleLeave;
}

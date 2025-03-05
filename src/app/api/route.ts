'use server';

import { NextRequest, NextResponse } from "next/server";
import { Server } from "socket.io";

export async function SOCKET(
  client: import('ws').WebSocket,
  request: import('http').IncomingMessage,
  server: import('ws').WebSocketServer,
  context: { params: Record<string, string | string[]> },
) {
  for (const other of server.clients) {
    if (client === other || other.readyState !== other.OPEN) continue;
    other.send(
      JSON.stringify({
        author: 'System',
        content: 'A new user joined the chat',
      }),
    );
  }

  client.on('message', (message) => {
    // Forward the message to all other clients
    for (const other of server.clients)
      if (client !== other && other.readyState === other.OPEN)
        other.send(message);
  });

  client.send(
    JSON.stringify({
      author: 'System',
      content: `Welcome to the chat! There ${server.clients.size - 1 === 1 ? 'is 1 other user' : `are ${server.clients.size - 1 || 'no'} other users`} online`,
    }),
  );

  return () => {
    for (const other of server.clients) {
      if (client === other || other.readyState !== other.OPEN) continue;
      other.send(
        JSON.stringify({
          author: 'System',
          content: 'A user left the chat',
        }),
      );
    }
  };
}

export async function GET(req: Request) {
  // if (res.socket.server.io) {
  //   console.log('Socket is already running')
  // } else {
  //   console.log('Socket is initializing')
  //   const io = new Server(res.socket.server)
  //   res.socket.server.io = io
  // }
  // console.log(req);
  console.log('GET');
  return Response.json({
    success: true,
    method: 'GET',
  }, {
    headers: {
      'Content-Security-Policy': 'default-src ws: http:'
    }
  });
  // res.end('test')
}

export async function POST(request: Request) {
  return Response.json({
    success: true,
    method: 'POST',
  });
}

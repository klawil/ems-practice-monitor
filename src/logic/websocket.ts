'use client';

import { ClientWebsocketMessage, ServerWebsocketMessage } from '@/types/websocket';
import { useCallback, useEffect, useRef, useState } from 'react';

function useQueue<T>(initialValue: T[] = []) {
  const queueRef = useRef<T[]>(initialValue);
  const [queue, setQueueMirror] = useState<T[]>(initialValue);

  if (queueRef.current.length !== queue.length) {
    setQueueMirror(queueRef.current);
  }

  const pop = useCallback(() => {
    if (queueRef.current.length === 0) return;

    const [
      item,
      ...rest
    ] = queueRef.current;

    queueRef.current = rest;
    setQueueMirror([ ...rest ]);

    return item;
  }, [queue]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = useCallback((item: T) => {
    queueRef.current.push(item);
    setQueueMirror([ ...queueRef.current ]);
  }, []);

  return {
    add,
    pop,
  };
}

export function useMessaging(
  url: () => string,
) {
  const ref = useRef<WebSocket>(null);
  const {
    add: addMessage,
    pop: popMessage,
  } = useQueue<ServerWebsocketMessage>();
  const cacheRef = useRef<ClientWebsocketMessage[]>([]);
  const target = useRef(url);

  useEffect(() => {
    if (ref.current) return;
    const socket = new WebSocket(target.current());
    ref.current = socket;

    const controller = new AbortController();

    socket.addEventListener(
      'open',
      () => {
        console.log('Socket opened', cacheRef.current.length);
        if (cacheRef.current.length > 0) {
          cacheRef.current.forEach(msg => {
            console.log('Sending cached message:', msg);
            socket.send(JSON.stringify(msg))
          });
        }
        cacheRef.current = [];
      },
      controller,
    );

    socket.addEventListener(
      'message',
      async (event) => {
        const payload =
          typeof event.data === 'string' ? event.data : await event.data.text();
        if (payload === 'PING') return;
        const message = JSON.parse(payload) as ServerWebsocketMessage;
        addMessage(message);
      },
      controller,
    );

    socket.addEventListener(
      'error',
      (event) => {
        console.error(`error`, event);
      },
      controller,
    );

    socket.addEventListener(
      'close',
      (event) => {
        if (event.wasClean) return;
        console.error(`close`, event);
      },
      controller,
    );

    return () => {
      console.log('ABORT');
      controller.abort();
      ref.current = null;
    };
  }, [addMessage]);

  const sendMessage = useCallback((message: ClientWebsocketMessage) => {
    if (!ref.current || ref.current.readyState !== ref.current.OPEN) {
      console.log('Caching message:', message);
      cacheRef.current.push(message);
    } else {
      console.log('Sending message:', message);
      ref.current.send(JSON.stringify(message));
    }
  }, []);

  return [popMessage, sendMessage] as const;
}

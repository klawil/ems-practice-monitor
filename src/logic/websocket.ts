'use client';

import { ClientType, ClientWebsocketMessage, ServerWebsocketMessage } from '@/types/websocket';
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

const startRetryDelay = 5; // in seconds

export function useMessaging(
  url: () => string,
  clientType: ClientType,
  monitorId: string | undefined,
) {
  const ref = useRef<WebSocket>(null);
  const {
    add: addMessage,
    pop: popMessage,
  } = useQueue<ServerWebsocketMessage>();
  const cacheRef = useRef<ClientWebsocketMessage[]>([]);
  const target = useRef(url);

  const [ isConnected, setIsConnected ] = useState(false);
  const [ lastConnEvent, setLastConnEvent ] = useState(0);

  const [ joinMessage, setJoinMesage ] = useState<ClientWebsocketMessage | null>(null);

  const connectToWs = useCallback(() => {
    if (ref.current) return;
    const socket = new WebSocket(target.current());
    ref.current = socket;

    const controller = new AbortController();

    socket.addEventListener(
      'open',
      () => {
        console.log('Socket opened', cacheRef.current.length);
        setLastConnEvent(Date.now());
        setIsConnected(true);
        if (joinMessage !== null) {
          socket.send(JSON.stringify(joinMessage));
        }
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
        setLastConnEvent(Date.now());
        setIsConnected(false);
        ref.current = null;
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
  }, [addMessage, joinMessage]);

  const sendMessage = useCallback((message: ClientWebsocketMessage) => {
    if (!ref.current || ref.current.readyState !== ref.current.OPEN) {
      console.log('Caching message:', message);
      cacheRef.current.push(message);
    } else {
      console.log('Sending message:', message);
      ref.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      return;
    }

    let timeout = setTimeout(() => {});
    if (Date.now() - lastConnEvent < startRetryDelay * 1000) {
      timeout = setTimeout(connectToWs, Date.now() - lastConnEvent + (startRetryDelay * 1000));
    } else {
      connectToWs();
    }

    return () => clearTimeout(timeout);
  }, [ isConnected, lastConnEvent, connectToWs ]);

  useEffect(() => {
    if (typeof monitorId === 'undefined') {
      return;
    }

    const newJoinMessage = {
      action: 'join',
      clientType,
      id: monitorId,
    } as const;
    setJoinMesage(newJoinMessage);

    if (ref.current) {
      sendMessage(newJoinMessage)
    }
  }, [monitorId, clientType, sendMessage]);

  return [
    popMessage,
    sendMessage,
    isConnected,
  ] as const;
}

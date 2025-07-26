

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ApiMessage } from '../types';

// The WebSocket URL endpoint. The token will be added as a query parameter.
const WEBSOCKET_URL = 'ws://localhost:8000/ws';

export const useWebSocket = (token: string | null, onMessage: (message: any) => void) => {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    // --- MOCK LOGIC FOR TEST USER ---
    if (token === 'test-token-123') {
      console.log("WebSocket connection mocked for test user.");
      setIsConnected(true);
      // Clean up mock connection on component unmount or token change
      return () => setIsConnected(false);
    }
    // --- END MOCK LOGIC ---

    if (!token) {
      if (ws.current) {
        ws.current.close(1000, "Token revoked");
      }
      return;
    }

    const connect = () => {
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        console.log("Closing existing WebSocket connection before reconnecting.");
        ws.current.close();
      }
      
      console.log('Attempting to connect to WebSocket...');
      // Pass the token as a query parameter, a common pattern for WebSocket authentication.
      const socket = new WebSocket(`${WEBSOCKET_URL}?token=${token}`);
      ws.current = socket;

      socket.onopen = () => {
        console.log('%cWebSocket connection established.', 'color: #4CAF50; font-weight: bold;');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          onMessageRef.current(message);
        } catch (error) {
          console.error('Failed to parse incoming message:', event.data, error);
        }
      };

      socket.onerror = (event) => {
        console.error('%cWebSocket error occurred. The `close` event that follows often has more details.', 'color: #CC0000; font-weight: bold;', event);
      };

      socket.onclose = (event: CloseEvent) => {
        setIsConnected(false);
        // A "clean" close is code 1000 (Normal Closure), initiated by our own code.
        // Any other code indicates an unexpected closure from the server.
        if (event.code !== 1000) {
          console.error(
              `%cWebSocket connection closed UNEXPECTEDLY.
              - Code: ${event.code}
              - Reason: "${event.reason || 'No reason provided by server.'}"
              - Was Clean: ${event.wasClean}
              - This often happens if the server rejects the token. Please check server logs.`,
              'color: #CC0000; font-weight: bold;'
          );
        } else {
          console.log('%cWebSocket connection closed cleanly by client.', 'color: #4CAF50;');
        }
      };
    };

    connect();

    return () => {
      if (ws.current) {
        // Prevent handlers from firing on unmount for the old socket
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onerror = null;
        ws.current.onclose = null;
        ws.current.close(1000, "Component unmounting");
      }
    };
  }, [token]);

  const sendMessage = useCallback((message: Omit<ApiMessage, 'sender'>) => {
    // --- MOCK LOGIC FOR TEST USER ---
    if (token === 'test-token-123') {
        console.log('Mock sendMessage called. No message sent.', message);
        // The message is already added to the local state by ChatPage, so we just need to avoid sending it.
        return;
    }
    // --- END MOCK LOGIC ---

    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected. Cannot send message.');
    }
  }, [token]);
  
  const sendSignalingMessage = useCallback((to: string, data: object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        const message = {
            to: to,
            data: JSON.stringify(data)
        };
        ws.current.send(JSON.stringify(message));
    } else {
        console.error('WebSocket is not connected. Cannot send signaling message.');
    }
  }, []);

  return { isConnected, sendMessage, sendSignalingMessage };
};

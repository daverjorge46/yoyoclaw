/**
 * Hook to manage the gateway WebSocket connection.
 *
 * This hook initializes the gateway client and provides connection status.
 * It should be used at the app root to establish the connection.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getGatewayClient,
  type GatewayStatus,
  type GatewayEvent,
  type GatewayClientConfig,
} from "@/lib/api";

export interface UseGatewayConnectionOptions {
  /** Gateway WebSocket URL (defaults to ws://127.0.0.1:18789) */
  url?: string;
  /** Authentication token */
  token?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Event handler */
  onEvent?: (event: GatewayEvent) => void;
}

export interface UseGatewayConnectionResult {
  /** Current connection status */
  status: GatewayStatus;
  /** Whether connected */
  isConnected: boolean;
  /** Whether connecting */
  isConnecting: boolean;
  /** Connect to the gateway */
  connect: () => Promise<void>;
  /** Disconnect from the gateway */
  disconnect: () => void;
  /** Connection error if any */
  error: Error | null;
}

export function useGatewayConnection(
  options: UseGatewayConnectionOptions = {}
): UseGatewayConnectionResult {
  const { url, token, autoConnect = true, onEvent } = options;

  const [status, setStatus] = useState<GatewayStatus>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(async () => {
    const config: GatewayClientConfig = {
      url,
      token,
      onStatusChange: (newStatus) => {
        if (mountedRef.current) {
          setStatus(newStatus);
        }
      },
      onEvent,
      onError: (err) => {
        if (mountedRef.current) {
          setError(err);
        }
      },
    };

    const client = getGatewayClient(config);

    try {
      setError(null);
      await client.connect();
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [url, token, onEvent]);

  const disconnect = useCallback(() => {
    const client = getGatewayClient();
    client.stop();
    setStatus("disconnected");
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;

    if (autoConnect) {
      const timer = window.setTimeout(() => {
        void connect();
      }, 0);

      return () => {
        window.clearTimeout(timer);
        mountedRef.current = false;
      };
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoConnect, connect]);

  return {
    status,
    isConnected: status === "connected",
    isConnecting: status === "connecting",
    connect,
    disconnect,
    error,
  };
}

export default useGatewayConnection;

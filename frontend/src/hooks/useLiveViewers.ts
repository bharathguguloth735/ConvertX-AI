import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface LiveStats {
  liveViewers: number;
  totalViews: number;
  isLive: boolean;
}

const STORAGE_KEY = 'docuflow_client_uid';

function getOrCreateClientId(): string {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = 'usr_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'anon_' + Math.random().toString(36).substring(2, 10);
  }
}

export const useLiveViewers = (): LiveStats => {
  // Starts with real 1 (current viewer) until exact server sync
  const [liveViewers, setLiveViewers] = useState<number>(1);
  const [totalViews, setTotalViews] = useState<number>(1);
  const [isLive, setIsLive] = useState<boolean>(true);
  const clientIdRef = useRef<string>(getOrCreateClientId());
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;
    let pingTimer: any = null;
    let reconnectTimer: any = null;
    let fallbackPollTimer: any = null;
    const clientId = clientIdRef.current;

    // REST fetch fallback function
    const fetchRestStats = async () => {
      try {
        const res = await axios.get(`/api/stats/viewers?client_id=${encodeURIComponent(clientId)}`, {
          timeout: 5000,
        });
        if (isMounted && res.data) {
          if (typeof res.data.live_viewers === 'number') {
            setLiveViewers(res.data.live_viewers);
          }
          if (typeof res.data.total_views === 'number') {
            setTotalViews(res.data.total_views);
          }
          setIsLive(true);
        }
      } catch {
        if (isMounted) {
          setIsLive(false);
        }
      }
    };

    // WebSocket real-time connection
    const connectWebSocket = () => {
      if (!isMounted) return;

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect to Vite /api proxy or direct backend
        const wsUrl = `${protocol}//${window.location.host}/api/stats/ws?client_id=${encodeURIComponent(clientId)}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setIsLive(true);

          // Keep socket alive with a periodic ping
          clearInterval(pingTimer);
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (typeof data.live_viewers === 'number') {
              setLiveViewers(data.live_viewers);
            }
            if (typeof data.total_views === 'number') {
              setTotalViews(data.total_views);
            }
            setIsLive(true);
          } catch {
            // Ignore non-json frames (e.g. pong)
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          clearInterval(pingTimer);
          // Try reconnecting after 3 seconds
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch {
        // Fallback to REST polling if WebSocket is blocked
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      }
    };

    // Initial fetch via REST immediately so UI populates without delay
    fetchRestStats();

    // Connect WebSocket for instantaneous real-time updates
    connectWebSocket();

    // Backup heartbeat polling every 20 seconds
    fallbackPollTimer = setInterval(fetchRestStats, 20000);

    return () => {
      isMounted = false;
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      clearInterval(fallbackPollTimer);
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return { liveViewers, totalViews, isLive };
};

export default useLiveViewers;

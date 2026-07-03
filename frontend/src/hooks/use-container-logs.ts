import { useState, useEffect, useRef } from "react";
import { getSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

export interface LogLine {
  stream: "stdout" | "stderr";
  text: string;
  timestamp: string;
}

export function useContainerLogs(deploymentId: string) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!deploymentId) return;

    let isMounted = true;

    async function initSocket() {
      try {
        const session = await getSession();
        const token = session?.accessToken;

        if (!token) {
          setError("No authentication token found");
          return;
        }

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
        const socket = io(`${backendUrl}/logs`, {
          query: { token },
          auth: { token },
          transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          if (isMounted) {
            setIsConnected(true);
            setError(null);
            socket.emit("subscribe-logs", { deploymentId });
          }
        });

        socket.on("log-line", (line: { stream: "stdout" | "stderr"; text: string }) => {
          if (isMounted) {
            setLogs((prev) => [
              ...prev,
              {
                ...line,
                timestamp: new Date().toISOString(),
              },
            ].slice(-1000));
          }
        });

        socket.on("error", (err: { message: string }) => {
          if (isMounted) {
            setError(err.message);
          }
        });

        socket.on("disconnect", () => {
          if (isMounted) {
            setIsConnected(false);
          }
        });

      } catch (err: any) {
        console.error("Failed to connect to logs socket:", err);
        if (isMounted) {
          setError("Connection failed");
        }
      }
    }

    initSocket();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [deploymentId]);

  const clearLogs = () => setLogs([]);

  return { logs, isConnected, error, clearLogs };
}

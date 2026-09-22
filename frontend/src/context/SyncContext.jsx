import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { showToast } from '../utils/swal';

const SyncContext = createContext({
  isConnected: false,
  connectionState: 'Disconnected',
  lastEvent: null,
  syncTick: 0,
  sendEvent: async () => {},
});

export const SyncProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('Disconnected');
  const [lastEvent, setLastEvent] = useState(null);
  const [syncTick, setSyncTick] = useState(0);

  const connectionRef = useRef(null);
  const listenersRef = useRef(new Map());

  // Function to humanize notifications
  const handleEventToast = (event) => {
    if (!event || !event.type) return;

    const titles = {
      TASK_CREATED: 'Tugas baru ditambahkan ke Kanban',
      TASK_UPDATED: 'Data tugas diperbarui',
      TASK_STATUS_CHANGED: 'Status tugas dipindahkan (Kanban)',
      TASK_DELETED: 'Tugas telah dihapus',
      TICKET_CREATED: 'Tiket bantuan baru masuk ke Pool',
      TICKET_ASSIGNED: 'Tiket ditugaskan ke Caretaker',
      TICKET_STATUS_CHANGED: 'Status tiket penanganan diperbarui',
      TIMESHEET_SUBMITTED: 'Log timesheet baru dikirimkan',
      CONFIG_UPDATED: 'Konfigurasi sistem telah diperbarui',
      DB_RESTORED: 'Basis data sistem telah dipulihkan',
    };

    const title = titles[event.type] || `Pembaruan Real-time: ${event.type}`;
    showToast(title, 'info');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        setIsConnected(false);
        setConnectionState('Disconnected');
      }
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/sync', {
        accessTokenFactory: () => localStorage.getItem('pm_token') || '',
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;
    setConnectionState('Connecting');

    connection.on('ConnectedConfirmation', (info) => {
      console.log('[SignalR Hub] Connected:', info);
    });

    connection.on('ReceiveSyncEvent', (evt) => {
      // evt structure: { type, data, timestamp } or { Type, Data, Timestamp }
      const normalized = {
        type: evt.type || evt.Type,
        data: evt.data || evt.Data,
        timestamp: evt.timestamp || evt.Timestamp || new Date().toISOString(),
      };

      setLastEvent(normalized);
      setSyncTick((prev) => prev + 1);
      handleEventToast(normalized);

      // Invoke specific listeners if registered
      listenersRef.current.forEach((cb) => {
        try {
          cb(normalized);
        } catch (e) {
          console.error('[SignalR Listener Error]', e);
        }
      });
    });

    connection.onreconnecting(() => {
      setIsConnected(false);
      setConnectionState('Reconnecting');
    });

    connection.onreconnected(() => {
      setIsConnected(true);
      setConnectionState('Connected');
      showToast('Koneksi sinkronisasi latar belakang pulih.', 'success');
    });

    connection.onclose(() => {
      setIsConnected(false);
      setConnectionState('Disconnected');
    });

    const startConnection = async () => {
      try {
        await connection.start();
        setIsConnected(true);
        setConnectionState('Connected');
      } catch (err) {
        console.warn('[SignalR Connection failed, retrying in 5s]', err);
        setConnectionState('Disconnected');
        setTimeout(() => {
          if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Disconnected) {
            startConnection();
          }
        }, 5000);
      }
    };

    startConnection();

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const sendEvent = useCallback(async (eventType, data) => {
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      try {
        await connectionRef.current.invoke('BroadcastUpdate', eventType, data);
      } catch (err) {
        console.error('[SignalR Invoke Error]', err);
      }
    }
  }, []);

  const subscribe = useCallback((callback) => {
    const id = Symbol();
    listenersRef.current.set(id, callback);
    return () => {
      listenersRef.current.delete(id);
    };
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isConnected,
        connectionState,
        lastEvent,
        syncTick,
        sendEvent,
        subscribe,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

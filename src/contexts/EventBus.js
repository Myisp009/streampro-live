import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;

const EventBusContext = createContext(null);

export const useEventBus = () => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error('useEventBus must be used within EventBusProvider');
  }
  return context;
};

export const EventBusProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    viewers: 0,
    likes: 0,
    orders: 0,
    income: 0,
    peakViewers: 0,
    viewHistory: [],
  });
  const [currentRoom, setCurrentRoom] = useState('');
  const [pushedProduct, setPushedProduct] = useState(null);
  const [liveTime, setLiveTime] = useState(0);
  const [userRole, setUserRole] = useState(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('room-state', (state) => {
      setLiveStatus(state.liveStatus);
      setMessages(state.messages || []);
      setProducts(state.products || []);
      setStats(state.stats || { viewers: 0, likes: 0, orders: 0, income: 0, peakViewers: 0, viewHistory: [] });
      setLiveTime(state.liveTime || 0);
    });

    newSocket.on('live-started', (data) => {
      setLiveStatus('live');
      setLiveTime(data.liveTime || 0);
    });

    newSocket.on('live-ended', () => {
      setLiveStatus('ended');
    });

    newSocket.on('new-message', (message) => {
      setMessages(prev => {
        const newMessages = [...prev, message];
        return newMessages.length > 100 ? newMessages.slice(-100) : newMessages;
      });
    });

    newSocket.on('stats-update', (newStats) => {
      setStats(prev => ({ ...prev, ...newStats }));
    });

    newSocket.on('products-update', (newProducts) => {
      setProducts(newProducts);
    });

    newSocket.on('product-pushed', (product) => {
      setPushedProduct(product);
      setTimeout(() => setPushedProduct(null), 8000);
    });

    newSocket.on('live-time-update', (time) => {
      setLiveTime(time);
    });

    newSocket.on('buy-success', () => {
      // Handle buy success notification
    });

    newSocket.on('buy-failed', (error) => {
      console.error('Buy failed:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (!socket) return;

    switch (event) {
      case 'joinRoom':
        setCurrentRoom(data);
        break;
      case 'join-room':
        setUserRole(data.role);
        socket.emit('join-room', data);
        break;
      case 'startLive':
        socket.emit('start-live');
        break;
      case 'stopLive':
        socket.emit('stop-live');
        break;
      case 'endLive':
        socket.emit('stop-live');
        break;
      case 'sendMessage':
        socket.emit('send-message', data);
        break;
      case 'clearMessages':
        setMessages([]);
        break;
      case 'addProduct':
        socket.emit('add-product', data);
        break;
      case 'toggleProduct':
        socket.emit('toggle-product', data);
        break;
      case 'deleteProduct':
        socket.emit('delete-product', data);
        break;
      case 'pushProduct':
        socket.emit('push-product', data);
        break;
      case 'like':
        socket.emit('like');
        break;
      case 'buy':
        socket.emit('buy-product', data);
        break;
      case 'updateViewers':
        // Handled by server
        break;
      default:
        socket.emit(event, data);
        break;
    }
  }, [socket]);

  const value = {
    socket,
    isConnected,
    liveStatus,
    messages,
    products,
    stats,
    currentRoom,
    pushedProduct,
    liveTime,
    setLiveTime,
    emit,
    userRole,
  };

  return (
    <EventBusContext.Provider value={value}>
      {children}
    </EventBusContext.Provider>
  );
};

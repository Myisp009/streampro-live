import React, { useState, useEffect } from 'react';
import { EventBusProvider, useEventBus } from './contexts/EventBus';
import EntryPage from './components/EntryPage';
import HostDashboard from './components/HostDashboard';
import ViewerPage from './components/ViewerPage';
import { ToastContainer, useToast } from './components/Toast';

const AppContent = () => {
  const [role, setRole] = useState(null); // null, 'host', 'viewer'
  const [localIp, setLocalIp] = useState('localhost');
  const { toasts, addToast, removeToast } = useToast();
  const { emit, currentRoom } = useEventBus();

  // Get local IP for LAN sharing
  useEffect(() => {
    const getLocalIp = async () => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer().then(o => pc.setLocalDescription(o));
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            pc.close();
            return;
          }
          const ipMatch = /([0-9]{1,3}\.){3}[0-9]{1,3}/.exec(ice.candidate.candidate);
          if (ipMatch && ipMatch[0] !== '127.0.0.1') {
            setLocalIp(ipMatch[0]);
            pc.close();
          }
        };
      } catch (e) {
        console.log('Could not get local IP');
      }
    };
    getLocalIp();
  }, []);

  // Handle URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const roleParam = params.get('role');
    
    if (roomParam && roleParam) {
      emit('joinRoom', roomParam);
      emit('join-room', { roomId: roomParam, role: roleParam });
      setRole(roleParam);
    }
  }, [emit]);

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    // Join room via socket
    emit('join-room', { roomId: currentRoom, role: selectedRole });
    // Update URL with room info for sharing
    const params = new URLSearchParams(window.location.search);
    params.set('room', currentRoom);
    params.set('role', selectedRole);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  const handleBack = () => {
    setRole(null);
    // Clear role from URL
    const params = new URLSearchParams(window.location.search);
    params.delete('role');
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <>
      {!role && <EntryPage onSelectRole={handleSelectRole} localIp={localIp} port={window.location.port || '3000'} />}
      {role === 'host' && <HostDashboard onBack={handleBack} addToast={addToast} localIp={localIp} port={window.location.port || '3000'} />}
      {role === 'viewer' && <ViewerPage onBack={handleBack} addToast={addToast} />}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
};

function App() {
  return (
    <EventBusProvider>
      <AppContent />
    </EventBusProvider>
  );
}

export default App;

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { VideoIcon, PlayIcon } from './Icons';
import { useEventBus } from '../contexts/EventBus';

const EntryPage = ({ onSelectRole, localIp, port }) => {
  const [roomId, setRoomId] = useState('ROOM-001');
  const [showQr, setShowQr] = useState(false);
  const { emit } = useEventBus();

  const handleCreateRoom = () => {
    emit('joinRoom', roomId);
    onSelectRole('host');
  };

  const handleJoinRoom = () => {
    emit('joinRoom', roomId);
    onSelectRole('viewer');
  };

  const viewerUrl = `http://${localIp}:${port}/?room=${roomId}&role=viewer`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板！');
  };

  return (
    <div className="entry-page">
      <div className="entry-header">
        <div className="entry-logo">
          <VideoIcon size={40} color="white" />
        </div>
        <h1 className="entry-title">StreamPro</h1>
        <p className="entry-subtitle">私域直播工具 · 品牌商家的直播带货利器</p>
      </div>

      <div className="entry-cards">
        <div className="entry-card" onClick={handleCreateRoom}>
          <div className="entry-card-icon">
            <VideoIcon size={28} />
          </div>
          <h3 className="entry-card-title">创建直播间</h3>
          <p className="entry-card-desc">开启您的私域直播<br />管理商品、互动观众、实时数据</p>
        </div>

        <div className="entry-card" onClick={handleJoinRoom}>
          <div className="entry-card-icon">
            <PlayIcon size={28} />
          </div>
          <h3 className="entry-card-title">观看直播</h3>
          <p className="entry-card-desc">加入直播间<br />观看精彩内容、参与互动、购买商品</p>
        </div>
      </div>

      <div className="entry-input-section">
        <div className="entry-input">
          <input
            type="text"
            placeholder="输入房间号"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button onClick={handleJoinRoom}>进入房间</button>
        </div>
        
        {/* LAN Sharing Info */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#98989d', marginBottom: '12px' }}>
            局域网分享（同WiFi可用）
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => copyToClipboard(viewerUrl)}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '7px',
                color: '#f5f5f7',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📋 复制观众链接
            </button>
            <button
              onClick={() => setShowQr(!showQr)}
              style={{
                padding: '10px 20px',
                background: '#ff6723',
                border: 'none',
                borderRadius: '7px',
                color: 'white',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📱 {showQr ? '隐藏' : '显示'}二维码
            </button>
          </div>
          
          {showQr && (
            <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{
                background: 'white',
                padding: '16px',
                borderRadius: '12px',
                display: 'inline-block'
              }}>
                <QRCodeSVG 
                  value={viewerUrl} 
                  size={160}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p style={{ fontSize: '12px', color: '#636366', marginTop: '12px' }}>
                扫码进入观众端<br/>
                <span style={{ color: '#ff6723' }}>{viewerUrl}</span>
              </p>
            </div>
          )}
          
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#636366' }}>
            <p>💡 提示：电脑开播后，手机扫码或分享链接即可观看</p>
            <p>📡 本机IP: {localIp}:{port}</p>
            <p style={{ color: '#ff6723', marginTop: '8px' }}>
              🔧 服务器部署：前端 + Node后端 (server/)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntryPage;

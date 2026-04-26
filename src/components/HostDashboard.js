import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useEventBus } from '../contexts/EventBus';
import {
  PlayIcon, StopIcon, MicIcon, CameraIcon, SparklesIcon,
  ScreenShareIcon, FlipIcon, EyeIcon, HeartIcon, DollarIcon,
  MessageIcon, TrashIcon, CheckIcon, SendIcon, ArrowLeftIcon,
  PlusIcon, SmartphoneIcon, HeadphonesIcon, LaptopIcon, PackageIcon, TrendingIcon,
  VideoIcon
} from './Icons';

const HostDashboard = ({ onBack, addToast, localIp, port }) => {
  const { liveStatus, messages, products, stats, currentRoom, liveTime, setLiveTime, emit } = useEventBus();
  const [activeTab, setActiveTab] = useState('chat');
  const [showShareModal, setShowShareModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [devices, setDevices] = useState({
    mic: true,
    camera: true,
    beauty: false,
    screen: false,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '' });
  const [pushingProduct, setPushingProduct] = useState(null);
  const canvasRef = useRef(null);
  const chatListRef = useRef(null);
  const danmakuRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (liveStatus === 'live') {
      timerRef.current = setInterval(() => {
        setLiveTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [liveStatus, setLiveTime]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      gradient.addColorStop(0, '#1c1c1e');
      gradient.addColorStop(0.5, '#2c2c2e');
      gradient.addColorStop(1, '#1c1c1e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 103, 35, ${p.alpha})`;
        ctx.fill();
      });

      if (liveStatus === 'live') {
        const time = Date.now() / 1000;
        const glowX = canvas.width / 2 + Math.sin(time) * 100;
        const glowY = canvas.height / 2 + Math.cos(time * 0.7) * 50;

        const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 200);
        glow.addColorStop(0, 'rgba(255, 103, 35, 0.2)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [liveStatus]);

  const addDanmaku = useCallback((text, isProduct = false) => {
    const container = danmakuRef.current;
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'danmaku-item';
    el.textContent = text;
    el.style.top = Math.random() * 60 + 20 + '%';
    el.style.color = isProduct ? '#FF6723' : '#fff';
    el.style.fontWeight = isProduct ? '600' : '400';
    container.appendChild(el);

    setTimeout(() => el.remove(), 8000);
  }, []);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'user' && lastMessage.user !== '主播') {
      addDanmaku(`${lastMessage.user}: ${lastMessage.text}`);
    }
  }, [messages, addDanmaku]);

  const handleStartLive = () => {
    emit('startLive');
    addToast('直播已开始', 'success');
    emit('sendMessage', { user: '系统', text: '直播已开始，欢迎观众！' });
  };

  const handleEndLive = () => {
    emit('endLive');
    addToast('直播已结束', 'info');
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    emit('sendMessage', { user: '主播', text: chatInput });
    setChatInput('');
  };

  const handleClearMessages = () => {
    emit('clearMessages');
    addToast('聊天记录已清空', 'info');
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.price || !newProduct.stock) {
      addToast('请填写完整的商品信息', 'error');
      return;
    }
    const price = parseFloat(newProduct.price);
    const stock = parseInt(newProduct.stock);
    if (price <= 0) {
      addToast('价格必须大于0', 'error');
      return;
    }
    if (stock < 0) {
      addToast('库存不能小于0', 'error');
      return;
    }
    emit('addProduct', { name: newProduct.name, price, stock, img: 'package' });
    setShowAddModal(false);
    setNewProduct({ name: '', price: '', stock: '' });
    addToast('商品添加成功', 'success');
  };

  const handlePushProduct = (product) => {
    if (!product.on) {
      addToast('商品未上架，无法推送', 'error');
      return;
    }
    setPushingProduct(product.id);
    emit('pushProduct', product.id);
    emit('sendMessage', { user: '系统', text: `主播推送了商品：${product.name} ¥${product.price}` });
    addDanmaku(`【商品推送】${product.name} ¥${product.price}`, true);
    addToast('商品已推送给观众', 'success');
    setTimeout(() => setPushingProduct(null), 600);
  };

  const toggleDevice = (key) => {
    setDevices(prev => ({ ...prev, [key]: !prev[key] }));
    if (key === 'flip') {
      addToast('翻转功能开发中', 'info');
    }
  };

  const getProductIcon = (img) => {
    const icons = { phone: SmartphoneIcon, earphone: HeadphonesIcon, laptop: LaptopIcon, package: PackageIcon };
    const Icon = icons[img] || PackageIcon;
    return <Icon size={28} color="#636366" />;
  };

  return (
    <div className="host-dashboard">
      <div className="host-header">
        <div className="host-header-left">
          <button className="host-back-btn" onClick={onBack}>
            <ArrowLeftIcon size={14} />
            返回
          </button>
          <div className="host-status">
            {liveStatus === 'live' && (
              <>
                <span className="host-status-dot live"></span>
                <span style={{ color: '#FF453A' }}>直播中</span>
              </>
            )}
            <span style={{ color: '#636366', marginLeft: 12 }}>房间号: {currentRoom}</span>
          </div>
        </div>
        <div className="host-header-right">
          <button
            onClick={() => setShowShareModal(true)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid rgba(255,103,35,0.5)',
              borderRadius: '7px',
              color: '#ff6723',
              fontSize: '13px',
              cursor: 'pointer',
              marginRight: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📤 分享
          </button>
          <div className="host-stat">
            <EyeIcon />
            <span>{stats.viewers}</span>
          </div>
          <div className="host-stat">
            <HeartIcon />
            <span>{stats.likes.toLocaleString()}</span>
          </div>
          <div className="host-stat">
            <DollarIcon />
            <span>{stats.orders}</span>
          </div>
          <div className="host-timer">{formatTime(liveTime)}</div>
        </div>
      </div>

      <div className="host-main">
        <div className="host-preview">
          <div className="preview-canvas">
            {liveStatus === 'idle' ? (
              <div className="preview-standby">
                <div className="preview-standby-icon">
                  <VideoIcon size={36} color="#636366" />
                </div>
                <span className="preview-standby-text">准备就绪</span>
              </div>
            ) : (
              <>
                <canvas ref={canvasRef} />
                <div ref={danmakuRef} className="preview-danmaku"></div>
              </>
            )}
          </div>

          <div className="host-controls">
            <div className="control-main">
              <button
                className={`control-main-btn ${liveStatus}`}
                onClick={liveStatus === 'idle' ? handleStartLive : liveStatus === 'live' ? handleEndLive : undefined}
                disabled={liveStatus === 'ended'}
              >
                {liveStatus === 'idle' ? <PlayIcon size={24} color="white" /> : liveStatus === 'live' ? <StopIcon size={20} color="white" /> : <StopIcon size={20} color="#636366" />}
              </button>
              <span className="control-main-text">
                {liveStatus === 'idle' ? '开始直播' : liveStatus === 'live' ? '结束直播' : '直播结束'}
              </span>
            </div>

            <div className="control-divider"></div>

            {[
              { key: 'mic', icon: MicIcon, label: '麦克风' },
              { key: 'camera', icon: CameraIcon, label: '摄像头' },
              { key: 'beauty', icon: SparklesIcon, label: '美颜' },
              { key: 'screen', icon: ScreenShareIcon, label: '屏幕共享' },
              { key: 'flip', icon: FlipIcon, label: '翻转' },
            ].map(({ key, icon: Icon, label }) => (
              <div key={key} className="control-device">
                <button
                  className={`control-device-btn ${devices[key] ? 'active' : ''} ${key !== 'beauty' && key !== 'screen' && !devices[key] ? 'off' : ''}`}
                  onClick={() => toggleDevice(key)}
                >
                  <Icon size={20} color={devices[key] ? '#FF6723' : '#636366'} />
                </button>
                <span className="control-device-text">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="host-sidebar">
          <div className="sidebar-tabs">
            {[
              { key: 'chat', icon: MessageIcon, label: '聊天' },
              { key: 'products', icon: PackageIcon, label: '商品' },
              { key: 'analytics', icon: TrendingIcon, label: '数据' },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                className={`sidebar-tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={16} color={activeTab === key ? '#FF6723' : '#98989D'} />
                {label}
              </button>
            ))}
          </div>

          <div className="sidebar-content">
            {activeTab === 'chat' && (
              <>
                <div className="chat-header">
                  <span className="chat-title">实时消息</span>
                  <button className="chat-clear-btn" onClick={handleClearMessages}>
                    <TrashIcon size={14} />
                    清空
                  </button>
                </div>
                <div ref={chatListRef} className="chat-list" style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                  {messages.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <MessageIcon size={28} />
                      </div>
                      <span className="empty-state-text">暂无消息</span>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="chat-message">
                        <div className={`chat-avatar ${msg.type}`}>
                          {msg.type === 'system' ? 'S' : msg.user[0]}
                        </div>
                        <div className="chat-content">
                          <div className="chat-meta">
                            <span className="chat-user">{msg.type === 'system' ? '系统' : msg.user}</span>
                            <span className="chat-time">{msg.time}</span>
                          </div>
                          <div className={`chat-text ${msg.type}`}>{msg.text}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="chat-input-area">
                  <input
                    className="chat-input"
                    placeholder="输入消息..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    maxLength={200}
                  />
                  <button className="chat-send-btn" onClick={handleSendMessage}>
                    <SendIcon size={16} />
                  </button>
                </div>
              </>
            )}

            {activeTab === 'products' && (
              <>
                <div className="products-header">
                  <span className="chat-title">商品管理</span>
                  <button className="products-add-btn" onClick={() => setShowAddModal(true)}>
                    <PlusIcon size={16} />
                    添加商品
                  </button>
                </div>
                <div className="products-list">
                  {products.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon" onClick={() => setShowAddModal(true)} style={{ cursor: 'pointer' }}>
                        <PlusIcon size={28} />
                      </div>
                      <span className="empty-state-text">点击添加商品</span>
                    </div>
                  ) : (
                    products.map((product) => (
                      <div key={product.id} className={`product-card ${pushingProduct === product.id ? 'pushing' : ''}`}>
                        <div className="product-image">{getProductIcon(product.img)}</div>
                        <div className="product-info">
                          <div className="product-name">{product.name}</div>
                          <div className="product-price">¥{product.price}</div>
                          <div className="product-meta">
                            <span>库存: {product.stock}</span>
                            <span>已售: {product.sold}</span>
                          </div>
                        </div>
                        <div className="product-actions">
                          <button
                            className={`product-action-btn toggle ${product.on ? '' : 'off'}`}
                            onClick={() => emit('toggleProduct', product.id)}
                            title={product.on ? '下架' : '上架'}
                          >
                            <CheckIcon size={16} />
                          </button>
                          <button
                            className="product-action-btn push"
                            onClick={() => handlePushProduct(product)}
                            disabled={!product.on}
                            title="推送商品"
                          >
                            <SendIcon size={16} />
                          </button>
                          <button
                            className="product-action-btn delete"
                            onClick={() => emit('deleteProduct', product.id)}
                            title="删除"
                          >
                            <TrashIcon size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {activeTab === 'analytics' && (
              <>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <div className="analytics-card-value">{stats.viewers}</div>
                    <div className="analytics-card-label">当前观看 (峰值: {stats.peakViewers})</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-value">{stats.likes.toLocaleString()}</div>
                    <div className="analytics-card-label">累计点赞</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-value">{stats.orders}</div>
                    <div className="analytics-card-label">订单数</div>
                  </div>
                  <div className="analytics-card">
                    <div className="analytics-card-value">{(stats.orders / Math.max(stats.viewers, 1) * 100).toFixed(1)}%</div>
                    <div className="analytics-card-label">转化率</div>
                  </div>
                </div>

                <div className="analytics-chart">
                  <div className="analytics-chart-title">近10分钟观看趋势</div>
                  <div className="chart-bars">
                    {stats.viewHistory.map((value, i) => {
                      const max = Math.max(...stats.viewHistory);
                      const height = max > 0 ? (value / max) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="chart-bar"
                          style={{ height: `${height}%` }}
                          title={`${value}人`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="analytics-ranking">
                  <div className="analytics-ranking-title">热销排行 TOP5</div>
                  {[...products]
                    .sort((a, b) => b.sold - a.sold)
                    .slice(0, 5)
                    .map((product, i) => (
                      <div key={product.id} className="ranking-item">
                        <div className={`ranking-number ${i < 3 ? 'top' : ''}`}>{i + 1}</div>
                        <div className="ranking-name">{product.name}</div>
                        <div className="ranking-sold">{product.sold}件</div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">添加商品</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <PlusIcon size={16} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">商品名称 *</label>
                <input
                  className="form-input"
                  placeholder="输入商品名称"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label className="form-label">价格 *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="输入价格"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  min="0.01"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">库存 *</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="输入库存"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button className="modal-btn secondary" onClick={() => setShowAddModal(false)}>取消</button>
                <button className="modal-btn primary" onClick={handleAddProduct}>添加</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '380px' }}>
            <div className="modal-header">
              <h3 className="modal-title">📤 分享直播间</h3>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>
                <PlusIcon size={16} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ fontSize: '13px', color: '#98989d', marginBottom: '16px' }}>
                房间号: <strong style={{ color: '#ff6723' }}>{currentRoom}</strong>
              </p>
              
              <div style={{
                background: 'white',
                padding: '16px',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: '16px'
              }}>
                <QRCodeSVG 
                  value={`http://${localIp}:${port}/?room=${currentRoom}&role=viewer`}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              
              <p style={{ fontSize: '12px', color: '#636366', marginBottom: '8px' }}>
                扫码进入观众端
              </p>
              <p style={{ fontSize: '11px', color: '#98989d', wordBreak: 'break-all' }}>
                http://{localIp}:{port}/?room={currentRoom}&role=viewer
              </p>
              
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`http://${localIp}:${port}/?room=${currentRoom}&role=viewer`);
                    addToast('链接已复制！', 'success');
                  }}
                  className="modal-btn primary"
                  style={{ flex: 1 }}
                >
                  📋 复制链接
                </button>
              </div>
              
              <div style={{ marginTop: '16px', fontSize: '12px', color: '#636366' }}>
                <p>💡 提示：观众需连接同一WiFi网络</p>
                <p>📡 本机地址: {localIp}:{port}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;

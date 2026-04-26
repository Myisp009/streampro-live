import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEventBus } from '../contexts/EventBus';
import { HeartIcon, ArrowLeftIcon, XIcon, PackageIcon, SmartphoneIcon, HeadphonesIcon, LaptopIcon, ClockIcon } from './Icons';

const ViewerPage = ({ onBack, addToast }) => {
  const { liveStatus, messages, products, stats, currentRoom, pushedProduct, emit } = useEventBus();
  const [isFollowing, setIsFollowing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [localPushedProduct, setLocalPushedProduct] = useState(null);
  const [showProductDetail, setShowProductDetail] = useState(null);
  const canvasRef = useRef(null);
  const danmakuRef = useRef(null);
  const likeBtnRef = useRef(null);

  // Sync pushed product from context
  useEffect(() => {
    if (pushedProduct) {
      setLocalPushedProduct(pushedProduct);
    }
  }, [pushedProduct]);

  // Canvas animation (same as host)
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

  // Danmaku effect
  const addDanmaku = useCallback((text, color = '#fff') => {
    const container = danmakuRef.current;
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'danmaku-item';
    el.textContent = text;
    el.style.top = Math.random() * 60 + 20 + '%';
    el.style.color = color;
    container.appendChild(el);

    setTimeout(() => el.remove(), 8000);
  }, []);

  // Watch for new messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'user') {
      const isProductPush = lastMessage.text.includes('主播推送了商品');
      if (!isProductPush) {
        addDanmaku(`${lastMessage.user}: ${lastMessage.text}`, lastMessage.user === '主播' ? '#FF6723' : '#fff');
      }
    }
  }, [messages, addDanmaku]);

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    addToast(isFollowing ? '已取消关注' : '关注成功', 'success');
  };

  const handleLike = () => {
    emit('like');
    
    // Create floating hearts
    const btn = likeBtnRef.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const colors = ['#FF453A', '#FF6723', '#BF5AF2', '#30D158', '#0A84FF'];
      
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const heart = document.createElement('div');
          heart.className = 'like-particle';
          heart.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="${colors[Math.floor(Math.random() * colors.length)]}" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
          heart.style.left = rect.left + rect.width / 2 + (Math.random() - 0.5) * 40 + 'px';
          heart.style.top = rect.top + 'px';
          document.body.appendChild(heart);
          setTimeout(() => heart.remove(), 1000);
        }, i * 100);
      }
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const randomNames = ['小明', '小红', '用户' + Math.floor(Math.random() * 1000), '观众' + Math.floor(Math.random() * 100)];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    emit('sendMessage', { user: randomName, text: chatInput });
    setChatInput('');
  };

  const handleBuyProduct = (product) => {
    if (product.stock <= 0) {
      addToast('库存不足', 'error');
      return;
    }
    
    // Debounce check
    if (product._buying) return;
    product._buying = true;
    
    emit('order', { productId: product.id, quantity: 1 });
    addToast(`成功购买 ${product.name}`, 'success');
    
    setTimeout(() => {
      delete product._buying;
    }, 300);
  };

  const getProductIcon = (img) => {
    const icons = { phone: SmartphoneIcon, earphone: HeadphonesIcon, laptop: LaptopIcon, package: PackageIcon };
    const Icon = icons[img] || PackageIcon;
    return <Icon size={28} color="#636366" />;
  };

  const onSaleProducts = products.filter(p => p.on);

  return (
    <div className="viewer-page">
      <canvas ref={canvasRef} className="viewer-canvas" />

      {liveStatus === 'idle' && (
        <div className="viewer-waiting">
          <div className="viewer-waiting-icon">
            <ClockIcon />
          </div>
          <span className="viewer-waiting-text">主播尚未开播，请稍候</span>
        </div>
      )}

      <div ref={danmakuRef} className="viewer-danmaku"></div>

      <div className="viewer-header">
        <div className="viewer-host">
          <div className="viewer-host-avatar">主</div>
          <div className="viewer-host-info">
            <div className="viewer-host-name">主播小明</div>
            <div className="viewer-host-followers">12.5万粉丝</div>
          </div>
          <button
            className={`viewer-follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleFollow}
          >
            {isFollowing ? '已关注' : '关注'}
          </button>
        </div>
        <button className="viewer-back-btn" onClick={onBack}>
          <ArrowLeftIcon size={14} />
          退出
        </button>
      </div>

      {localPushedProduct && (
        <div className="viewer-pushed-product">
          <button className="pushed-product-close" onClick={() => setLocalPushedProduct(null)}>
            <XIcon size={16} />
          </button>
          <div className="pushed-product-content">
            <div className="pushed-product-image">{getProductIcon(localPushedProduct.img)}</div>
            <div className="pushed-product-info">
              <div className="pushed-product-name">{localPushedProduct.name}</div>
              <div className="pushed-product-price">¥{localPushedProduct.price}</div>
              <div className="pushed-product-stock">库存: {localPushedProduct.stock}</div>
            </div>
          </div>
          <button
            className="pushed-product-btn"
            onClick={() => handleBuyProduct(localPushedProduct)}
          >
            立即购买
          </button>
        </div>
      )}

      <div className="viewer-bottom">
        {onSaleProducts.length > 0 && (
          <div className="viewer-products">
            {onSaleProducts.map(product => (
              <div
                key={product.id}
                className="viewer-product-card"
                onClick={() => setShowProductDetail(product)}
              >
                <div className="viewer-product-card-image">{getProductIcon(product.img)}</div>
                <div className="viewer-product-card-name">{product.name}</div>
                <div className="viewer-product-card-price">¥{product.price}</div>
              </div>
            ))}
          </div>
        )}

        <div className="viewer-interaction">
          <div className="viewer-input-wrapper">
            <input
              className="viewer-input"
              placeholder="发弹幕参与互动..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value.slice(0, 100))}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              maxLength={100}
            />
            <button
              className="viewer-input-send"
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
            >
              发送
            </button>
          </div>
          <button ref={likeBtnRef} className="viewer-like-btn" onClick={handleLike}>
            <HeartIcon size={24} filled />
          </button>
        </div>
      </div>

      {showProductDetail && (
        <div className="modal-overlay" onClick={() => setShowProductDetail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ width: '340px' }}>
            <div className="modal-header">
              <h3 className="modal-title">商品详情</h3>
              <button className="modal-close" onClick={() => setShowProductDetail(null)}>
                <XIcon size={16} />
              </button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '120px', height: '120px', background: 'var(--bg-tertiary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                {getProductIcon(showProductDetail.img)}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: 8 }}>{showProductDetail.name}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#FF6723', marginBottom: 8 }}>¥{showProductDetail.price}</div>
              <div style={{ fontSize: '14px', color: '#98989D', marginBottom: 16 }}>
                库存: {showProductDetail.stock} | 已售: {showProductDetail.sold}
              </div>
            </div>
            <button
              className="modal-btn primary"
              style={{ width: '100%' }}
              onClick={() => {
                handleBuyProduct(showProductDetail);
                setShowProductDetail(null);
              }}
            >
              立即购买
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewerPage;

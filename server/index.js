const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 房间数据存储
const rooms = new Map();

// 初始化房间
function initRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      liveStatus: 'idle', // idle, live, ended
      host: null,
      viewers: new Set(),
      messages: [],
      products: [
        { id: 1, name: 'iPhone 15 Pro', price: 7999, stock: 50, sold: 0, on: true, img: 'phone' },
        { id: 2, name: 'AirPods Pro 2', price: 1899, stock: 100, sold: 0, on: true, img: 'earphone' }
      ],
      stats: {
        viewers: 0,
        likes: 0,
        orders: 0,
        sales: 0
      },
      liveTime: 0,
      danmaku: []
    });
  }
  return rooms.get(roomId);
}

// 清理空房间
function cleanupRoom(roomId) {
  const room = rooms.get(roomId);
  if (room && room.viewers.size === 0 && !room.host) {
    rooms.delete(roomId);
    console.log(`Room ${roomId} cleaned up`);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let currentRoom = null;
  let userRole = null;

  // 加入房间
  socket.on('join-room', ({ roomId, role }) => {
    currentRoom = roomId;
    userRole = role;
    const room = initRoom(roomId);
    
    socket.join(roomId);
    
    if (role === 'host') {
      room.host = socket.id;
      console.log(`Host joined room ${roomId}`);
    } else {
      room.viewers.add(socket.id);
      room.stats.viewers = room.viewers.size;
      console.log(`Viewer joined room ${roomId}, total: ${room.stats.viewers}`);
      
      // 通知主播有新观众
      if (room.host) {
        io.to(room.host).emit('viewer-joined', { viewerId: socket.id });
      }
    }
    
    // 发送当前房间状态给新用户
    socket.emit('room-state', {
      roomId,
      liveStatus: room.liveStatus,
      messages: room.messages.slice(-50), // 最近50条消息
      products: room.products,
      stats: room.stats,
      liveTime: room.liveTime
    });
    
    // 广播更新观众数
    io.to(roomId).emit('stats-update', room.stats);
  });

  // 开始直播
  socket.on('start-live', () => {
    if (!currentRoom || userRole !== 'host') return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.liveStatus = 'live';
    room.liveStartTime = Date.now();
    
    io.to(currentRoom).emit('live-started', {
      liveTime: room.liveTime,
      timestamp: Date.now()
    });
    
    // 添加系统消息
    const systemMsg = {
      id: Date.now(),
      user: '系统',
      text: '直播开始啦！欢迎来到直播间',
      type: 'system',
      timestamp: Date.now()
    };
    room.messages.push(systemMsg);
    io.to(currentRoom).emit('new-message', systemMsg);
    
    console.log(`Live started in room ${currentRoom}`);
  });

  // 结束直播
  socket.on('stop-live', () => {
    if (!currentRoom || userRole !== 'host') return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.liveStatus = 'ended';
    
    io.to(currentRoom).emit('live-ended');
    
    // 添加系统消息
    const systemMsg = {
      id: Date.now(),
      user: '系统',
      text: `直播已结束，本次直播时长: ${formatTime(room.liveTime)}`,
      type: 'system',
      timestamp: Date.now()
    };
    room.messages.push(systemMsg);
    io.to(currentRoom).emit('new-message', systemMsg);
    
    console.log(`Live ended in room ${currentRoom}`);
  });

  // 发送消息
  socket.on('send-message', (message) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const msg = {
      id: Date.now(),
      user: message.user || (userRole === 'host' ? '主播' : '观众'),
      text: message.text,
      type: message.type || 'user',
      timestamp: Date.now(),
      socketId: socket.id
    };
    
    room.messages.push(msg);
    if (room.messages.length > 100) {
      room.messages.shift(); // 保留最近100条
    }
    
    io.to(currentRoom).emit('new-message', msg);
    
    // 如果是弹幕，额外发送弹幕事件
    if (message.type === 'danmaku') {
      io.to(currentRoom).emit('danmaku', {
        text: message.text,
        user: msg.user
      });
    }
  });

  // 点赞
  socket.on('like', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.stats.likes++;
    io.to(currentRoom).emit('stats-update', room.stats);
    io.to(currentRoom).emit('like-animation', { socketId: socket.id });
  });

  // 添加商品
  socket.on('add-product', (product) => {
    if (!currentRoom || userRole !== 'host') return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const newProduct = {
      id: Date.now(),
      ...product,
      sold: 0,
      on: true
    };
    
    room.products.push(newProduct);
    io.to(currentRoom).emit('products-update', room.products);
    
    // 通知观众有新商品
    const systemMsg = {
      id: Date.now(),
      user: '系统',
      text: `主播上架了新商品：${product.name}`,
      type: 'system',
      timestamp: Date.now()
    };
    room.messages.push(systemMsg);
    io.to(currentRoom).emit('new-message', systemMsg);
  });

  // 推送商品
  socket.on('push-product', (productId) => {
    if (!currentRoom || userRole !== 'host') return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const product = room.products.find(p => p.id === productId);
    if (!product || !product.on) return;
    
    io.to(currentRoom).emit('product-pushed', product);
    
    // 系统消息
    const systemMsg = {
      id: Date.now(),
      user: '系统',
      text: `主播正在推荐：${product.name} ¥${product.price}`,
      type: 'system',
      timestamp: Date.now()
    };
    room.messages.push(systemMsg);
    io.to(currentRoom).emit('new-message', systemMsg);
    
    // 弹幕效果
    io.to(currentRoom).emit('danmaku', {
      text: `【推荐】${product.name} ¥${product.price}`,
      user: '系统',
      isProduct: true
    });
  });

  // 切换商品上架状态
  socket.on('toggle-product', (productId) => {
    if (!currentRoom || userRole !== 'host') return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const product = room.products.find(p => p.id === productId);
    if (product) {
      product.on = !product.on;
      io.to(currentRoom).emit('products-update', room.products);
    }
  });

  // 删除商品
  socket.on('delete-product', (productId) => {
    if (!currentRoom || userRole !== 'host') return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    room.products = room.products.filter(p => p.id !== productId);
    io.to(currentRoom).emit('products-update', room.products);
  });

  // 购买商品
  socket.on('buy-product', (productId) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;
    
    const product = room.products.find(p => p.id === productId);
    if (!product || !product.on || product.stock <= 0) {
      socket.emit('buy-failed', { reason: '商品已售罄或已下架' });
      return;
    }
    
    product.stock--;
    product.sold++;
    room.stats.orders++;
    room.stats.sales += product.price;
    
    io.to(currentRoom).emit('products-update', room.products);
    io.to(currentRoom).emit('stats-update', room.stats);
    socket.emit('buy-success', { product });
    
    // 通知主播有新订单
    if (room.host) {
      io.to(room.host).emit('new-order', {
        product: product.name,
        price: product.price,
        viewerId: socket.id
      });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        if (userRole === 'host') {
          room.host = null;
          room.liveStatus = 'ended';
          io.to(currentRoom).emit('host-disconnected');
        } else {
          room.viewers.delete(socket.id);
          room.stats.viewers = room.viewers.size;
          io.to(currentRoom).emit('stats-update', room.stats);
        }
        cleanupRoom(currentRoom);
      }
    }
  });
});

// 直播计时器
setInterval(() => {
  rooms.forEach(room => {
    if (room.liveStatus === 'live') {
      room.liveTime++;
      io.to(room.id).emit('live-time-update', room.liveTime);
    }
  });
}, 1000);

app.use(cors());
app.use(express.json());

// API路由
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.values()).map(r => ({
    id: r.id,
    liveStatus: r.liveStatus,
    viewerCount: r.viewers.size,
    hasHost: !!r.host
  }));
  res.json(roomList);
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`StreamPro Server running on port ${PORT}`);
  console.log(`WebSocket: ws://0.0.0.0:${PORT}`);
});

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

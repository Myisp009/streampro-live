# StreamPro 部署指南

## 服务器信息
- IP: 124.222.88.92
- 系统: Ubuntu
- 部署端口: 3000

---

## 快速部署（推荐）

### 1. 打包本地代码
在本地 PowerShell 执行：
```powershell
Compress-Archive -Path "server","build","package.json" -DestinationPath "streampro-deploy.zip"
```

### 2. 上传到服务器
使用任何 FTP 工具或命令：
```bash
scp streampro-deploy.zip root@124.222.88.92:/root/
```

### 3. 登录服务器并部署
```bash
ssh root@124.222.88.92
# 密码: LELExingfu8/

# 解压
cd /root
unzip streampro-deploy.zip

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

---

## 手动部署步骤

### 1. 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 安装依赖
```bash
cd /root/streampro/server
npm install
```

### 3. 启动服务（开发模式）
```bash
npm start
# 服务运行在 http://124.222.88.92:3000
```

### 4. 生产模式（PM2）
```bash
sudo npm install -g pm2
cd /root/streampro/server
pm2 start index.js --name "streampro"
pm2 save
pm2 startup
```

### 5. 开放防火墙
```bash
sudo ufw allow 3000/tcp
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看服务状态 |
| `pm2 logs streampro` | 查看日志 |
| `pm2 restart streampro` | 重启服务 |
| `pm2 stop streampro` | 停止服务 |

---

## 访问地址

部署成功后：
- 主播端: http://124.222.88.92:3000
- 观众端: http://124.222.88.92:3000/?room=ROOM-001&role=viewer

---

## 故障排查

### 端口被占用
```bash
lsof -i :3000
kill -9 <PID>
```

### 防火墙阻止
```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

### 权限问题
```bash
sudo chown -R root:root /root/streampro
```

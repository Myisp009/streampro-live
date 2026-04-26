#!/bin/bash
# StreamPro 部署脚本 for Ubuntu

echo "🚀 开始部署 StreamPro..."

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 创建应用目录
sudo mkdir -p /opt/streampro
cd /opt/streampro

# 克隆或上传代码（假设代码已上传到 /root/streampro）
if [ -d "/root/streampro" ]; then
    sudo cp -r /root/streampro/* /opt/streampro/
fi

# 安装后端依赖
cd /opt/streampro/server
npm install

# 安装 PM2 进程管理器
sudo npm install -g pm2

# 启动服务
pm2 start index.js --name "streampro"
pm2 save
pm2 startup systemd

# 配置防火墙
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

echo "✅ 部署完成！"
echo "🌐 访问地址: http://124.222.88.92:3000"
echo "📊 PM2 管理: pm2 status"
echo "📝 查看日志: pm2 logs streampro"

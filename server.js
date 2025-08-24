const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active rooms
const rooms = new Map();

// 获取本机局域网IP地址
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    
    // 优先查找常见的局域网IP地址段
    const preferredRanges = [
        /^192\.168\./,  // 192.168.x.x
        /^10\./,        // 10.x.x.x
        /^172\.(1[6-9]|2[0-9]|3[01])\./  // 172.16.x.x - 172.31.x.x
    ];
    
    // 遍历所有网络接口
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // 跳过内部接口和IPv6地址
            if (iface.internal || iface.family !== 'IPv4') {
                continue;
            }
            
            // 检查是否符合局域网IP地址范围
            for (const range of preferredRanges) {
                if (range.test(iface.address)) {
                    return iface.address;
                }
            }
        }
    }
    
    // 如果没找到局域网IP，返回第一个非内部IPv4地址
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.internal || iface.family !== 'IPv4') {
                continue;
            }
            return iface.address;
        }
    }
    
    // 如果还是没找到，返回localhost
    return 'localhost';
}

const localIP = getLocalIP();
console.log('Local IP Address:', localIP);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle room creation for screen sharing
  socket.on('create-room', (roomId) => {
    console.log('Creating room:', roomId);
    socket.join(roomId);
    rooms.set(roomId, { host: socket.id, viewers: [] });
    socket.emit('room-created', { roomId, host: localIP });
  });

  // Handle viewer joining a room
  socket.on('join-room', (roomId) => {
    console.log('Viewer joining room:', roomId);
    if (rooms.has(roomId)) {
      socket.join(roomId);
      rooms.get(roomId).viewers.push(socket.id);
      // Notify the host about new viewer
      socket.to(rooms.get(roomId).host).emit('viewer-joined', socket.id);
      socket.emit('room-joined', roomId);
    } else {
      socket.emit('room-not-found', roomId);
    }
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Offer received for room:', data.roomId);
    socket.to(data.roomId).emit('offer', data);
  });

  socket.on('answer', (data) => {
    console.log('Answer received for room:', data.roomId);
    socket.to(data.roomId).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    console.log('ICE candidate received for room:', data.roomId);
    socket.to(data.roomId).emit('ice-candidate', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Clean up rooms if host disconnects
    for (const [roomId, room] of rooms.entries()) {
      if (room.host === socket.id) {
        console.log('Host disconnected, closing room:', roomId);
        socket.to(roomId).emit('host-disconnected');
        rooms.delete(roomId);
      } else {
        // Remove viewer from room
        const viewerIndex = room.viewers.indexOf(socket.id);
        if (viewerIndex !== -1) {
          room.viewers.splice(viewerIndex, 1);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://${localIP}:${PORT}`);
});
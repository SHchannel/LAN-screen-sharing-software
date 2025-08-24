// DOM元素
const roomIdInput = document.getElementById('roomIdInput');
const joinRoomBtn = document.getElementById('joinRoom');
const screenViewer = document.getElementById('screenViewer');
const viewerStatus = document.getElementById('viewerStatus');
const leaveRoomBtn = document.getElementById('leaveRoom');

// WebRTC相关变量
let peerConnection;
let socket;
let currentRoomId;

// 初始化Socket连接
socket = io();

// 从URL参数获取房间号
const urlParams = new URLSearchParams(window.location.search);
const roomIdFromUrl = urlParams.get('room');

if (roomIdFromUrl) {
    roomIdInput.value = roomIdFromUrl;
}

// 加入房间
joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    
    if (!roomId) {
        viewerStatus.textContent = '请输入有效的房间号';
        return;
    }
    
    currentRoomId = roomId;
    socket.emit('join-room', roomId);
});

// 处理房间加入成功
socket.on('room-joined', (roomId) => {
    viewerStatus.textContent = `已加入房间: ${roomId}`;
    joinRoomBtn.disabled = true;
    leaveRoomBtn.disabled = false;
    
    // 创建RTCPeerConnection
    createPeerConnection();
});

// 处理房间未找到
socket.on('room-not-found', (roomId) => {
    viewerStatus.textContent = `未找到房间: ${roomId}`;
});

// 处理主机断开连接
socket.on('host-disconnected', () => {
    viewerStatus.textContent = '主机已断开连接';
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    screenViewer.srcObject = null;
    joinRoomBtn.disabled = false;
    leaveRoomBtn.disabled = true;
});

// 处理WebRTC offer
socket.on('offer', async (data) => {
    if (data.roomId !== currentRoomId) return;
    
    try {
        // 设置远程描述
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        // 创建并发送answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('answer', {
            roomId: currentRoomId,
            answer: peerConnection.localDescription
        });
    } catch (error) {
        console.error('Error handling offer:', error);
        viewerStatus.textContent = '连接出错: ' + error.message;
    }
});

// 处理ICE候选
socket.on('ice-candidate', (data) => {
    if (data.roomId !== currentRoomId) return;
    
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});

function createPeerConnection() {
    // 创建RTCPeerConnection
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    // 处理远程流
    peerConnection.ontrack = (event) => {
        screenViewer.srcObject = event.streams[0];
        viewerStatus.textContent = '正在观看屏幕共享';
    };

    // 处理ICE候选
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: currentRoomId,
                candidate: event.candidate
            });
        }
    };

    // 处理连接状态变化
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
            viewerStatus.textContent = '已连接到屏幕共享';
        } else if (peerConnection.connectionState === 'failed' || 
                   peerConnection.connectionState === 'disconnected') {
            viewerStatus.textContent = '连接断开';
        }
    };
}

// 离开房间
leaveRoomBtn.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    screenViewer.srcObject = null;
    joinRoomBtn.disabled = false;
    leaveRoomBtn.disabled = true;
    viewerStatus.textContent = '已离开房间';
});
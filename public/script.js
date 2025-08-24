// 生成随机房间号
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// DOM元素
const screenPreview = document.getElementById('screenPreview');
const startSharingBtn = document.getElementById('startSharing');
const stopSharingBtn = document.getElementById('stopSharing');
const shareInfo = document.getElementById('shareInfo');
const shareLink = document.getElementById('shareLink');
const copyLinkBtn = document.getElementById('copyLink');
const statusText = document.getElementById('statusText');

// WebRTC相关变量
let peerConnection;
let screenStream;
let socket;
let localIP;

// 初始化Socket连接
socket = io();

// 生成房间号
const roomId = generateRoomId();

// 创建房间
socket.emit('create-room', roomId);

socket.on('room-created', (data) => {
    console.log('Room created:', data);
    statusText.textContent = `房间已创建: ${data.roomId}`;
    
    // 保存本机IP地址
    localIP = data.host;
    
    // 生成并显示分享链接
    const link = `http://${localIP}:3000/viewer.html?room=${data.roomId}`;
    shareLink.value = link;
});

// 开始共享屏幕
startSharingBtn.addEventListener('click', async () => {
    try {
        // 获取屏幕共享流
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always'
            },
            audio: false
        });

        // 显示预览
        screenPreview.srcObject = screenStream;

        // 更新UI状态
        startSharingBtn.disabled = true;
        stopSharingBtn.disabled = false;
        shareInfo.style.display = 'block';
        
        statusText.textContent = '屏幕共享已开始';

        // 监听屏幕共享结束事件
        screenStream.getVideoTracks()[0].onended = () => {
            stopSharing();
        };

    } catch (error) {
        console.error('Error starting screen sharing:', error);
        statusText.textContent = '无法启动屏幕共享: ' + error.message;
    }
});

// 停止共享屏幕
stopSharingBtn.addEventListener('click', stopSharing);

function stopSharing() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    screenPreview.srcObject = null;

    // 更新UI状态
    startSharingBtn.disabled = false;
    stopSharingBtn.disabled = true;
    shareInfo.style.display = 'none';
    statusText.textContent = '屏幕共享已停止';
}

// 复制链接到剪贴板
copyLinkBtn.addEventListener('click', () => {
    shareLink.select();
    document.execCommand('copy');
    copyLinkBtn.textContent = '已复制!';
    setTimeout(() => {
        copyLinkBtn.textContent = '复制链接';
    }, 2000);
});

// 处理WebRTC连接
socket.on('viewer-joined', (viewerId) => {
    console.log('Viewer joined:', viewerId);
    statusText.textContent = `有观众加入观看: ${viewerId}`;
    
    // 创建RTCPeerConnection
    createPeerConnection(viewerId);
    
    // 添加屏幕流到连接
    if (screenStream) {
        screenStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, screenStream);
        });
    }
    
    // 创建并发送offer
    peerConnection.createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            socket.emit('offer', {
                roomId: roomId,
                viewerId: viewerId,
                offer: peerConnection.localDescription
            });
        })
        .catch(error => {
            console.error('Error creating offer:', error);
        });
});

function createPeerConnection(viewerId) {
    // 创建RTCPeerConnection
    peerConnection = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    });

    // 处理ICE候选
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: roomId,
                viewerId: viewerId,
                candidate: event.candidate
            });
        }
    };

    // 处理连接状态变化
    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'failed' || 
            peerConnection.connectionState === 'disconnected') {
            statusText.textContent = '连接断开';
        }
    };
}

// 处理来自查看端的answer
socket.on('answer', (data) => {
    if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
});

// 处理来自查看端的ICE候选
socket.on('ice-candidate', (data) => {
    if (peerConnection) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
});
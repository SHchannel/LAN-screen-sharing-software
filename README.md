# ScreenShare - 屏幕共享应用

这是一个基于WebRTC的屏幕共享应用，允许用户通过浏览器共享屏幕并生成链接供他人查看。

## 功能特点

- 通过浏览器直接共享屏幕，无需安装额外软件
- 生成唯一的观看链接
- 实时屏幕共享
- 支持多用户同时观看

## 技术架构

- HTML5 + CSS3 + JavaScript 前端界面
- WebRTC 屏幕共享技术
- WebSocket 信令服务器用于连接建立
- Node.js 后端服务器

## 文件结构

```
screenshare/
├── server.js              # Node.js 信令服务器
├── package.json           # 项目依赖
├── public/
│   ├── index.html         # 共享端主界面
│   ├── viewer.html        # 观看端界面
│   ├── style.css          # 样式文件
│   ├── script.js          # 共享端JavaScript逻辑
│   └── viewer.js          # 观看端JavaScript逻辑
```

## 安装和运行

1. 安装依赖：
   ```
   npm install
   ```

2. 启动服务器：
   ```
   node server.js
   ```
   或者（如果安装了nodemon）：
   ```
   npm run dev
   ```

3. 访问应用：
   - 共享端: http://localhost:3000
   - 查看端: 共享端画面生成的链接

## 使用说明

1. 共享端：
   - 打开 http://localhost:3000
   - 点击"开始共享屏幕"按钮
   - 系统会自动生成一个观看链接
   - 将链接分享给需要观看的人

2. 查看端：
   - 打开共享方提供的链接
   - 等待屏幕共享连接建立
   - 即可观看共享的屏幕

## 注意事项

1. 屏幕共享功能需要在支持WebRTC的现代浏览器中使用（如Chrome、Firefox、Edge等）
2. 首次使用屏幕共享时，浏览器会提示您选择要共享的屏幕或窗口
3. 为了获得最佳体验，建议在局域网内使用此应用
4. 如果需要在公网使用，可能需要配置STUN/TURN服务器
5. 如果没有安装Node-js，请在"https://nodejs.org/en/download"下载Node-js

## 技术细节

1. 使用WebRTC技术实现实时屏幕共享
2. 通过Socket.IO实现信令交换
3. 自动生成唯一的房间号用于连接
4. 支持多个观看者同时观看同一个屏幕共享

## 故障排除

1. 如果无法建立连接，请检查：
   - 确保服务器正在运行
   - 检查防火墙设置
   - 确认浏览器支持并启用了WebRTC

2. 如果屏幕无法显示：
   - 检查是否正确选择了要共享的屏幕/窗口
   - 确认浏览器权限设置

const WebSocket = require('ws');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Account = require('./models/account');
const Logs = require('./models/log');

mongoose.connect('mongodb+srv://sieunhan283:sieunhan283@cluster0.wo1bl.mongodb.net/iot')
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });

const wss = new WebSocket.Server({ port: 3000 });

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Gửi mức nước và nhiệt độ theo chu kỳ nếu người dùng đã đăng nhập
  const interval = setInterval(async () => {
    try {
      // Kiểm tra xem người dùng đã đăng nhập chưa
      if (ws.user) {
        const waterLevel = getWaterLevel();  // Hàm giả lập lấy mức nước
        const temperature = getTemperature();  // Hàm giả lập lấy nhiệt độ

        // Gửi mức nước và nhiệt độ cho client
        ws.send(JSON.stringify({
          type: 'realTimeData',
          waterLevel: waterLevel,
          temperature: temperature
        }));
      }
    } catch (err) {
      console.error('Error sending real-time data:', err);
    }
  }, 1000);  // Cập nhật mỗi giây

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'login') {
        await handleLogin(ws, data);  // Gọi hàm đăng nhập và gán ws.user ngay sau khi đăng nhập thành công
      } else {
        if (!data.token) {
          ws.send(JSON.stringify({ type: 'error', message: 'Token is required' }));
          return;
        }

        const decoded = await verifyToken(data.token);
        if (!decoded) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token' }));
          return;
        }

        // Lưu thông tin người dùng vào ws.user khi đăng nhập thành công
        ws.user = decoded;

        switch (data.type) {
          case 'manualPump':
            await handleManualPump(ws, data);
            break;
          case 'autoPump':
            await handleAutoPump(ws, data);
            break;
          case 'setWaterLevel':
            await handleSetWaterLevel(ws, data);
            break;
          case 'getLogs':
            await handleGetLogs(ws);
            break;
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown request type' }));
        }
      }
    } catch (err) {
      console.error('Error handling message:', err);
      ws.send(JSON.stringify({ type: 'error', message: 'An error occurred while processing the request' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(interval);  // Dừng việc gửi dữ liệu khi client ngắt kết nối
  });
});

async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    return decoded;
  } catch (err) {
    return null;
  }
}

async function handleLogin(ws, data) {
  try {
    const account = await Account.findOne({ username: data.username });

    if (!account || account.password !== data.password) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid credentials' }));
      return;
    }

    const token = jwt.sign({ accountId: account._id }, 'your-secret-key', { expiresIn: '1h' });

    ws.send(JSON.stringify({ type: 'loginSuccess', token }));

    // Gán thông tin người dùng vào ws.user ngay sau khi đăng nhập thành công
    ws.user = { accountId: account._id, username: account.username };

  } catch (err) {
    console.error('Error during login:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Database error' }));
  }
}

async function handleManualPump(ws, data) {
  try {
    const action = data.action;

    if (action === 'start') {
      console.log('Starting the pump...');
      ws.send(JSON.stringify({ type: 'manualPumpStatus', status: 'Pump started' }));
    } else if (action === 'stop') {
      console.log('Stopping the pump...');
      ws.send(JSON.stringify({ type: 'manualPumpStatus', status: 'Pump stopped' }));
    } else {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid action' }));
    }
  } catch (err) {
    console.error('Error during manual pump operation:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Error during pump operation' }));
  }
}

async function handleAutoPump(ws, data) {
  try {
    const { minLevel, maxLevel } = data;

    console.log(`Auto pump set to min: ${minLevel}%, max: ${maxLevel}%`);

    let currentWaterLevel = 30;
    if (currentWaterLevel <= minLevel) {
      console.log('Starting the pump...');
      ws.send(JSON.stringify({ type: 'autoPumpStatus', status: 'Pump started' }));
    } else if (currentWaterLevel >= maxLevel) {
      console.log('Stopping the pump...');
      ws.send(JSON.stringify({ type: 'autoPumpStatus', status: 'Pump stopped' }));
    }

  } catch (err) {
    console.error('Error during auto pump operation:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Error during auto pump operation' }));
  }
}

async function handleSetWaterLevel(ws, data) {
  try {
    const { distanceToBottom, distanceToTop, currentWaterLevel } = data;

    const maxDistance = distanceToBottom - distanceToTop;
    const waterPercentage = ((maxDistance - currentWaterLevel) / maxDistance) * 100;

    console.log(`Current water level: ${waterPercentage}%`);

    ws.send(JSON.stringify({ type: 'waterLevel', percentage: waterPercentage }));
  } catch (err) {
    console.error('Error during water level calculation:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Error calculating water level' }));
  }
}

async function handleGetLogs(ws) {
  try {
    const logs = await Logs.find().sort({ timestamp: -1 });

    ws.send(JSON.stringify({ type: 'logs', data: logs }));
  } catch (err) {
    console.error('Error retrieving logs:', err);
    ws.send(JSON.stringify({ type: 'error', message: 'Error retrieving logs' }));
  }
}

// Hàm giả lập lấy mức nước
function getWaterLevel() {
  return Math.floor(Math.random() * 100);  // Giả lập mức nước từ 0 đến 100%
}

// Hàm giả lập lấy nhiệt độ
function getTemperature() {
  return (Math.random() * 30 + 15).toFixed(2);  // Giả lập nhiệt độ từ 15 đến 45 độ C
}

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws'); // Import WebSocket

const authRoutes = require('./routes/auth');
const sensorRoutes = require('./routes/sensors');
const pumpRoutes = require('./routes/pump');
const logsRoutes = require('./routes/logs');

const app = express();
const PORT = 3000;

mongoose.connect('mongodb+srv://sieunhan283:sieunhan283@cluster0.wo1bl.mongodb.net/iot', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.use(cors());
app.use(bodyParser.json());

app.use('/auth', authRoutes);
app.use('/sensors', sensorRoutes);
// app.use('/pump', pumpRoutes);
app.use('/logs', logsRoutes);

const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const wss = new WebSocket.Server({ server });

let arduinoSocket = null;

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('Arduino connected via WebSocket');
    arduinoSocket = ws;

    ws.on('close', () => {
        console.log('Arduino disconnected');
        arduinoSocket = null;
    });

    ws.on('message', (message) => {
        console.log(`Message from Arduino: ${message}`);
    });
});

// HTTP Route for Manual Pump Control
app.post('/pump/manual', (req, res) => {
    const { action } = req.body; // Expect "ON" or "OFF"
    console.log(`action: ${action}`)
    // Send command to Arduino
    if (arduinoSocket != null) {
        arduinoSocket.send(JSON.stringify({
            "type": "manual",
            "message": action
        }))
    }

    res.json({
        "message": "success",
        "status": action
    });
});

app.post('pump/auto', authMiddleware, async (req, res) => {

    if (arduinoSocket == null) {
        res.json({
            "message": "Ardunio device haven't connected"
        })
        return;
    }

    arduinoSocket.send(JSON.stringify({
        "type": "auto",
        "message": ""
    }))
    res.json({
        "message": "success"
    })
});

app.post('/update-water-level', authMiddleware, async (req, res) => {
    if (arduinoSocket == null) {
        res.json({
            "message": "Ardunio device haven't connected"
        })
        return;
    }
    const { tankHeight } = req.body;

    arduinoSocket.send(JSON.stringify({
        "type": "tankHeight",
        "message": tankHeight
    }))

    res.json({
        "message": "success",
        "tankHeight": tankHeight
    })
});




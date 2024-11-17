const express = require('express');
const SensorData = require('../models/SensorData');

const authMiddleware = require('../middleware/authMiddleware')
const router = express.Router();

const handleTurnOnPump = (state) => {
    if (state == "ON") {
        // Bật máy bơm lên
    } else if (state == "OFF") {
        // Tắt máy bơm đi
    }
}

// Điều khiển bơm
router.post('/manual', authMiddleware, async (req, res) => {
    const { action } = req.body; // ON hoặc OFF
    if (!['ON', 'OFF'].includes(action)) return res.status(400).json({ message: 'Invalid action' });

    //   const newState = await SensorData.create({ pumpState: action, timestamp: new Date() });
    handleTurnOnPump()
    res.json({
        "message": "success",
        "status": action
    });
});

// Bơm tự động
router.post('/auto', authMiddleware, async (req, res) => {
    const { minLevel, maxLevel } = req.body;

    if (minLevel >= maxLevel)
        return res.status(400).json({ message: 'minLevel must be less than maxLevel' });

    const latestData = await SensorData.find().sort({ timestamp: -1 }).limit(1);
    const currentWaterLevel = latestData[0]?.waterLevel || 0;

    let pumpState = 'OFF';
    if (currentWaterLevel <= minLevel) pumpState = 'ON';
    if (currentWaterLevel >= maxLevel) pumpState = 'OFF';

    // const newState = await SensorData.create({ pumpState, timestamp: new Date() });
    // res.json(newState);

    res.json({
        "message": "success",
        "minLevel": minLevel,
        "maxLevel": maxLevel
    });
});

module.exports = router;

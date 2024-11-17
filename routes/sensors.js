const express = require('express');
const SensorData = require('../models/SensorData');
const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router();

// Lấy dữ liệu cảm biến
router.get('/', authMiddleware, async (req, res) => {
    const latestData = await SensorData.find().sort({ timestamp: -1 }).limit(1);
    if (!latestData.length) return res.status(404).json({ message: 'No data found' });

    res.json(latestData[0]);
});

// Cập nhật mực nước (theo phép tính)
router.post('/update-water-level', authMiddleware, async (req, res) => {
    const { distanceToBottom, distanceToTop, currentDistance } = req.body;

    if (!distanceToBottom || !distanceToTop || !currentDistance)
        return res.status(400).json({ message: 'Missing parameters' });

    const waterLevel = ((distanceToBottom - currentDistance) / (distanceToBottom - distanceToTop)) * 100;
    res.json({ waterLevel: Math.round(waterLevel) });
});

module.exports = router;

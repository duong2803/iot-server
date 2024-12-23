const express = require('express');
const SensorData = require('../models/SensorData');
const { Parser } = require('json2csv');

const authMiddleware = require('../middleware/authMiddleware')

const router = express.Router();

// Xem logs
router.get('/', authMiddleware, async (req, res) => {
    const logs = await SensorData.find().sort({ timestamp: -1 });
    res.json(logs);
});

// // Logs thời gian thực
// router.get('/realtime', authMiddleware, async (req, res) => {
//     try {
//         const latestLog = await SensorData.findOne().sort({ timestamp: -1 });
//         if (!latestLog) {
//             return res.status(404).json({ message: 'No data found' });
//         }
//         res.json(latestLog);
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error });
//     }
// });


router.post('/addlog', async (req, res) => {
    try {
        const { waterLevel, temperature, pumpState } = req.body;

        if (waterLevel === undefined || temperature === undefined) {
            return res.status(400).json({ message: 'waterLevel and temperature are required' });
        }

        const newLog = new SensorData({
            waterLevel,
            temperature,
            pumpState, 
            timestamp: new Date(), 
        });

        // Save the document to the database
        const savedLog = await newLog.save();

        // Respond with the saved document
        res.status(201).json(savedLog);
    } catch (error) {
        // Handle errors
        res.status(500).json({ message: 'Failed to add log', error });
    }
});


// Xuất file CSV
router.get('/export', authMiddleware, async (req, res) => {
    const { startTime, endTime } = req.query;

    const logs = await SensorData.find({
        timestamp: { $gte: new Date(startTime), $lte: new Date(endTime) },
    });

    const fields = ['timestamp', 'waterLevel', 'temperature', 'pumpState'];
    const parser = new Parser({ fields });
    const csv = parser.parse(logs);

    res.header('Content-Type', 'text/csv');
    res.attachment('logs.csv');
    res.send(csv);
});

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

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
app.use('/pump', pumpRoutes);
app.use('/logs', logsRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

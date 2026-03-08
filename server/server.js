require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./configs/db');

const app = express();
const server = http.createServer(app);

// Socket.io — used by camera module for live frame streaming
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/users',         require('./routes/userRoutes'));
app.use('/api/manufacturers', require('./routes/manufacturerRoutes'));
app.use('/api/suppliers',     require('./routes/supplierRoutes'));
app.use('/api/retailers',     require('./routes/retailerRoutes'));
app.use('/api/trucks',        require('./routes/truckRoutes'));
app.use('/api/iot-modules',   require('./routes/iotModuleRoutes'));
app.use('/api/deliveries',    require('./routes/deliveryRoutes'));
app.use('/api/events',        require('./routes/deliveryEventRoutes'));
app.use('/api/batches',       require('./routes/batchRoutes'));
app.use('/api/certificates',  require('./routes/halalCertificateRoutes'));
app.use('/api/sensors',       require('./routes/sensorRoutes'));
app.use('/api/camera',        require('./routes/cameraRoutes'));
app.use('/api/alerts',        require('./routes/alertRoutes'));
app.use('/api/reports',       require('./routes/reportRoutes'));
app.use('/api/products',      require('./routes/productRoutes'));
app.use('/api/rfid-tags',     require('./routes/rfidTagRoutes'));

// Start MQTT client (sensors + delivery events)
require('./mqtt');

// Start camera stream ingestion (per active IoT module)
require('./camera').init(io);

// Socket.io connection log
io.on('connection', socket => {
  console.log('[WS] Client connected');
  socket.on('disconnect', () => console.log('[WS] Client disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`ColdWire server running on port ${PORT}`));
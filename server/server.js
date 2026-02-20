require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./configs/db');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/users',        require('./routes/userRoutes'));
app.use('/api/manufacturers',require('./routes/manufacturerRoutes'));
app.use('/api/suppliers',    require('./routes/supplierRoutes'));
app.use('/api/retailers',    require('./routes/retailerRoutes'));
app.use('/api/trucks',       require('./routes/truckRoutes'));
app.use('/api/iot-modules',  require('./routes/iotModuleRoutes'));
app.use('/api/deliveries',   require('./routes/deliveryRoutes'));
app.use('/api/events',       require('./routes/deliveryEventRoutes'));
app.use('/api/batches',      require('./routes/batchRoutes'));
app.use('/api/certificates', require('./routes/halalCertificateRoutes'));
app.use('/api/sensors',      require('./routes/sensorRoutes'));
app.use('/api/camera',       require('./routes/cameraRoutes'));
app.use('/api/alerts',       require('./routes/alertRoutes'));
app.use('/api/reports',      require('./routes/reportRoutes'));
app.use('/api/products',     require('./routes/productRoutes'));

// Start MQTT client
require('./mqtt');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ColdWire server running on port ${PORT}`));

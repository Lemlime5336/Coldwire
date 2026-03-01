const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    const db = mongoose.connection.db;

    // Environmental logs indexes
    await db.collection('environmentalsensings').createIndex({ delivery_id: 1 });
    await db.collection('environmentalsensings').createIndex({ truck_id: 1, timestamp: -1 });
    await db.collection('environmentalsensings').createIndex({ iot_module_id: 1 });

    // Delivery events indexes
    await db.collection('deliveryevents').createIndex({ delivery_id: 1, timestamp: 1 });
    await db.collection('deliveryevents').createIndex({ truck_id: 1, timestamp: -1 });
    await db.collection('deliveryevents').createIndex({ event_type: 1 });

    // Deliveries indexes
    await db.collection('deliveries').createIndex({ manufacturer_id: 1, status: 1 });
    await db.collection('deliveries').createIndex({ driver_id: 1 });
    await db.collection('deliveries').createIndex({ truck_id: 1 });
    await db.collection('deliveries').createIndex({ created_at: -1 });

    // Alerts indexes
    await db.collection('alerts').createIndex({ truck_id: 1, last_update: -1 });
    await db.collection('alerts').createIndex({ delivery_id: 1, resolved: 1 });
    await db.collection('alerts').createIndex({ iot_module_id: 1 });

    // Users indexes
    await db.collection('users').createIndex({ UserEmail: 1 }, { unique: true });
    await db.collection('users').createIndex({ manufacturer_id: 1 });

    // Products & batches indexes
    await db.collection('products').createIndex({ batch_id: 1 });
    await db.collection('batches').createIndex({ delivery_id: 1 });

    // Driver assignments indexes
    await db.collection('driver_assignments').createIndex({ driver_id: 1, end_time: -1 });
    await db.collection('driver_assignments').createIndex({ truck_id: 1, end_time: -1 });

    console.log('MongoDB indexes ensured.');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;

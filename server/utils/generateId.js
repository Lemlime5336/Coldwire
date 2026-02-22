const Counter = require('../models/Counter');

const generateId = async (prefix, modelName) => {
  const counter = await Counter.findByIdAndUpdate(
    modelName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const padded = String(counter.seq).padStart(5, '0');
  return `${prefix}-${padded}`;
};

module.exports = generateId;
const RFIDTag = require('../models/RFIDTag');
const generateId = require('../utils/generateId');

// GET /api/rfid-tags
const getTags = async (req, res) => {
  try {
    const filter = {};
    if (req.query.available === 'true') filter.InUse = false;
    const tags = await RFIDTag.find(filter).sort({ TagID: 1 });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/rfid-tags
const createTag = async (req, res) => {
  try {
    const { UID } = req.body;
    if (!UID) return res.status(400).json({ message: 'UID is required.' });

    const existing = await RFIDTag.findOne({ UID: UID.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'A tag with this UID already exists.' });

    const TagID = await generateId('RFID', 'RFIDTag');
    const tag = await RFIDTag.create({ TagID, UID: UID.toUpperCase() });
    res.status(201).json(tag);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/rfid-tags/:id/toggle
const toggleTagActive = async (req, res) => {
  try {
    const tag = await RFIDTag.findById(req.params.id);
    if (!tag) return res.status(404).json({ message: 'Tag not found.' });
    tag.IsActive = !tag.IsActive;
    await tag.save();
    res.json({ IsActive: tag.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTags, createTag, toggleTagActive };
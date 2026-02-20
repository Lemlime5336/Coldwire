const IoTModule = require('../models/IoTModule');

const getModules = async (req, res) => {
  try {
    const modules = await IoTModule.find();
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createModule = async (req, res) => {
  try {
    const module = await IoTModule.create(req.body);
    res.status(201).json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleModuleActive = async (req, res) => {
  try {
    const module = await IoTModule.findOne({ IMID: req.params.id });
    if (!module) return res.status(404).json({ message: 'IoT Module not found.' });
    module.IsActive = !module.IsActive;
    await module.save();
    res.json({ IsActive: module.IsActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getModules, createModule, toggleModuleActive };

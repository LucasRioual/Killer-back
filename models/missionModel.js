const mongoose = require('mongoose');

const missionSchema = mongoose.Schema({
  message: { type: String, required: true },
  tag: { type: String, required: true },
});

module.exports = mongoose.model('Mission', missionSchema);
const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  gameCode: { type: String, required: true },
  statut: { type: String, required: true},
  hostId: { type: String, required: true },
  startTime: Date,
  numberMission: {type: Number},
  timer: {type: Number},
  tagMission: {type: String},
  listMission: [String],
  timeline: [{userName: String, numberKill: Number, mission: String, killerName: String, time: Date}],
});

module.exports = mongoose.model('Game', gameSchema);
const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  code: { type: String, required: true },
  statut: { type: String, required: true },
  hostSurname: { type: String, required: true },
  listPlayer: [{surname: String, socketId: String, expoToken: String, target:String, mission: String, statut: String }], 
  listNewPlayer: [{surname: String, socketId: String, expoToken: String, target:String, mission: String, statut: String }],
  setting: {time: Number , join: Boolean, changeMission: Number},
  tagMission: [String],
  listMission: [String],
});

module.exports = mongoose.model('Game', gameSchema);
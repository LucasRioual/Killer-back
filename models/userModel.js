const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  userName: { type: String, required: true },
  socketId: { type: String},
  expoToken: { type: String },
  gameCode: { type: String},
  statut: { type: String, required: true, default: "none" },
  target : { type: String},
  mission : { type: String},
  aliveTime : { type: Number, default: 0},
  kills : [String],
  numberMission: {type: Number},

});

module.exports = mongoose.model('User', userSchema);
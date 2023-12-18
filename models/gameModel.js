const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  code: { type: String, required: true },
  status: { type: String, required: true },
  hostId: { type: String, required: true },
  listPlayer: [{ userId: String, surname: String, socketId: String, target:String, mission: String }], // Tableau d'objets
});

module.exports = mongoose.model('Game', gameSchema);
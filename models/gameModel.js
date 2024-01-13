const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  code: { type: String, required: true },
  status: { type: String, required: true },
  hostSurname: { type: String, required: true },
  listPlayer: [{surname: String, socketId: String, expoToken: String, target:String, mission: String }], // Tableau d'objets
});

module.exports = mongoose.model('Game', gameSchema);
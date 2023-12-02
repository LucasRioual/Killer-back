const mongoose = require('mongoose');

const gameSchema = mongoose.Schema({
  code: { type: Number, required: true },
  status: { type: String, required: true },
  hostId: { type: String, required: true },
  listPlayer: [{ userId: String, surname: String }], // Tableau d'objets
});

module.exports = mongoose.model('Game', gameSchema);
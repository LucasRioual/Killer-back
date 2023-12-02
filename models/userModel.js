const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  surname: { type: String, required: true },
  
});

module.exports = mongoose.model('User', userSchema);
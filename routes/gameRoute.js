const express = require('express');
const router = express.Router();

const gameCtrl = require('../controllers/gameCtrl');


router.post('/', gameCtrl.createGame);
router.get('/:code', gameCtrl.getPlayers);
router.post('/:code', gameCtrl.addPlayer);
router.delete('/:code/:userId', gameCtrl.removePlayer);
router.get('/:code/start', gameCtrl.startGame);


module.exports = router;
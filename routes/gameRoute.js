const express = require('express');
const router = express.Router();

const gameCtrl = require('../controllers/gameCtrl');


router.post('/', gameCtrl.createGame);
router.get('/:code', gameCtrl.getPlayers);
router.get('/:code/start', gameCtrl.startGame);
router.get('/:code/:username', gameCtrl.getNewMission);


module.exports = router;
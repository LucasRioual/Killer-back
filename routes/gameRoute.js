const express = require('express');
const router = express.Router();

const gameCtrl = require('../controllers/gameCtrl');


router.post('/:userId', gameCtrl.createGame);
router.get('/start/:code', gameCtrl.startGame);
router.get('/mission/:userId', gameCtrl.getNewMission);
router.get('/classement/:code', gameCtrl.getTimeline);
router.post('/kill/:userId', gameCtrl.sendKillAccept);



module.exports = router;
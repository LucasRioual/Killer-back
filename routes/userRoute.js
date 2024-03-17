const express = require('express');
const router = express.Router();

const userCtrl = require('../controllers/userCtrl');


router.post('/:userName', userCtrl.createUser);
router.put('/:id', userCtrl.modifyUserName);
router.get('/:id', userCtrl.getGameCode);
router.get('/players/:gameCode', userCtrl.getPlayers);
router.delete('/:gameCode/:id', userCtrl.deleteUserFromGame);
router.get('/gameInfo/:gameCode/:id', userCtrl.getGameInfo);
router.get('/stat/:id', userCtrl.getStat);



module.exports = router;
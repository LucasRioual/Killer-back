const express = require('express');
const router = express.Router();

const userCtrl = require('../controllers/userCtrl');


router.post('/', userCtrl.createUser);
router.get('/:id', userCtrl.getSurname);
router.put('/:id', userCtrl.updateUserSurname);


module.exports = router;
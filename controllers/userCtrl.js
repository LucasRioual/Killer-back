const User = require('../models/userModel.js');
const Mission = require('../models/missionModel.js');
const Game = require('../models/gameModel.js');


exports.createUser = async (req, res, next) => {
  try {
    const userName = req.params.userName;
    const expoToken = req.body.expoToken;
    const user =  new User({
        userName: userName,
        expoToken: expoToken
  
      });
      await user.save();
      return res.json({ success: true, userId: user._id });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
 

};

exports.modifyUserName = async (req, res, next) => {
  try{
    const userName = req.body.userName;
    const userId = req.params.id;
    const expoToken = req.body.expoToken;
    const user = await User.findOne({ _id: userId });
    if (user) {
      user.userName = userName;
      user.expoToken = expoToken;
      await user.save();
      res.json({ success: true, userId: user._id });
    }
    else {
      const newUser = new User({userName: userName, expoToken: expoToken});
      await newUser.save();
      res.json({ success: true, userId: newUser._id })
    }
  }
  catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
  
};

  exports.getGameCode = (req, res, next) => {
  User.findOne({ _id: req.params.id}).then(
    (user) => {
      res.json({ success: true, statut: user.statut, gameCode: user.gameCode });
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.getPlayers = async (req, res, next) => { //Récupère la liste des joueurs d'une partie
  try {
    const gameCode = req.params.gameCode;
    const users = await User.find({ gameCode: gameCode });
    const game = await Game.findOne({ gameCode: gameCode });
    if(game === null) {
      res.status(404).json({ success: false, statut: 'none', listPlayer: []});
      return;
    }
    //get userName of each user 
    let listPlayers = [];
    users.forEach(user => {
      listPlayers.push(user.userName);
    });
    res.json({ success: true, statut: game.statut, listPlayer: listPlayers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteUserFromGame = async (req, res) => {

};

exports.getGameInfo = async (req, res) => {
  try{
    const userId = req.params.id;
    const gameCode = req.params.gameCode;
    const user = await User.findOne({ _id: userId });
    const game = await Game.findOne({ gameCode: gameCode });
    res.json({ success: true, mission: user.mission, target: user.target, numberMission: user.numberMission, timer: game.timer, userStatut: user.statut});
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
  

};

exports.getStat = async (req, res) => {
  try{
    const userId = req.params.id
    const user = await User.findOne({_id: userId});
    const game = await Game.findOne({ gameCode: user.gameCode });
    const timeline = game.timeline;
    const index  = timeline.findIndex((u) => u.userName === user.userName) + 1;
    res.json({listKills: user.kills, aliveTime: user.aliveTime, position : index, gameStatut : game.statut, statut : user.statut })
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
  

};
  
  
  
    


const Game = require('../models/gameModel.js');
const Mission = require('../models/missionModel.js');
const User = require('../models/userModel.js');
const Notification = require('./notifications');
const Timer = require('./timer');


let io;

exports.initializeIo = (socketIoInstance) => {
  io = socketIoInstance;
};


const sendEndNotification = async (gameCode) => {
  const users = await User.find({ gameCode: gameCode });
  users.forEach(async user => {
    const title = "Fin de la partie";
    const body = "Le classement est disponible";
    await Notification.sendPushNotification(user.expoToken, title, body);
  }
  );
}



const generateUniqueCode = () => {
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
};


exports.createGame = async (req, res, next) => { // Création d'une partie et renvoi du code de la partie

  try{
    const generatedCode = generateUniqueCode();
    
    const game = new Game({
      gameCode: generatedCode,
      hostId: req.params.userId,
      numberMission: req.body.changeMission,
      statut: 'wait',
      tagMission: req.body.tagMission,
      timer: req.body.timer,
    });
    await game.save();
    return res.json({ success: true, gameCode: game.gameCode });
  }
  catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
    });
  
    
  };
}

 

exports.getNewMission = async (req, res, next) => {
  try{
    const userId = req.params.userId;
    const user = await User.findOne({_id: userId});
    const game = await Game.findOne({ gameCode: user.gameCode });
    const mission =  await getMission(game.listMission, game.tagMission);
    user.mission = mission.message;
    user.numberMission -= 1;
    game.listMission.push(mission._id);
    await user.save();
    await game.save();
    return res.json({ success: true, mission: user.mission });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
  
}



const getMission = async (listMissionId, tags) => {
  // Récupérer les missions correspondant aux tags
  const matchingDocuments = await Mission.find({
    tag: { $in: tags },
    _id: { $nin: listMissionId }
  });
  
  const randomIndex = Math.floor(Math.random() * matchingDocuments.length);
  const documents = matchingDocuments[randomIndex];

  if (documents) {
    return documents;
  } else {
    console.log("Aucune nouvelle mission disponible.");
    return null; 
  }
};

const getTarget = async (user, users) => {
  const index = users.findIndex((u) => u.userName === user.userName);
  if (index === users.length - 1) {
    return users[0].userName;
  }
  return users[index + 1].userName;

}


const startTimer = (game, initialTime) => {

  Timer.timerId = setInterval( async () => {
    const now = new Date();
    const timer = initialTime - (now - game.startTime)/1000;
    game.timer = timer;
    if(timer < 0){ //fin du jeu avec le timer
      game.statut = 'end';
      const remainsPlayer = await User.find({gameCode: game.gameCode, statut:'alive' }).sort({kills : 1}); //Tous les joueurs restants en vie
      remainsPlayer.forEach(async (user, index) => {
        const statUser = {userName: user.userName, numberKill: user.kills.length, mission: "none", killerName: "none", time: now };
        game.timeline.push(statUser);
        if(index === remainsPlayer.length - 1){
          user.statut = 'winner';
        }
        else{
          user.statut = 'timeout';
        }
        await user.save();
      });
      clearInterval(Timer.timerId);
      io.to(game.gameCode).emit('end_game');
      sendEndNotification(game.gameCode);
      //Envoyer à tout le monde que la partie est terminée
    }
    io.to(game.gameCode).emit('timer', timer);
    game.save();
  }, 60000);
}
  

exports.startGame = async (req, res, next) => {  //Attribution des cibles et des missions plus initialisation des paramètres de jeu
  try {
    const game = await Game.findOne({ gameCode: req.params.code });
    const users = await User.find({ gameCode: req.params.code }); // Tous les joueurs de la partie
    game.statut = 'start';
    game.startTime = new Date();
    const tagMission = game.tagMission;

    for (let user of users) {
      user.statut = 'alive';
      const target = await getTarget(user, users);
      const mission = await getMission(game.listMission, tagMission);
      game.listMission.push(mission._id);
      user.target = target;
      user.mission = mission.message;
      user.numberMission = game.numberMission;
      user.kills = [];

      await user.save();
    }
    
    await game.save();
    io.to(game.gameCode).emit('start_game');
    res.json({ success: true });
    const initialTime = game.timer;
    startTimer(game, initialTime);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
}

exports.sendKillAccept = async (req, res, next) => {
  try {
    const userId = req.params.userId;
    const user = await User.findOne ({ _id: userId });
      user.statut = 'dead';
      const killer = await User.findOne({ gameCode: user.gameCode, target: user.userName });
      killer.target = user.target;
      killer.mission = user.mission;
      killer.kills.push(user.userName);
      const now = new Date();
      const stat = {userName: user.userName, numberKill: user.kills.length, mission: user.mission, killerName: killer.userName, time: now };
      const game = await Game.findOne({ gameCode: user.gameCode });
      game.timeline.push(stat);
      user.aliveTime = now - game.startTime;
      user.target = null;
      user.mission = null;
      const numberPlayerAlive = await User.countDocuments({ gameCode: user.gameCode, statut: 'alive' });
      if(numberPlayerAlive === 1){
        const statKiller = {userName: killer.userName, numberKill: killer.kills.length, mission: "none", killerName: "none", time: now };
        killer.statut = 'winner';
        game.timeline.push(statKiller);
        game.statut = 'end';
        clearInterval(Timer.timerId);
        await killer.save();
        io.to(user.gameCode).emit('end_game');
        sendEndNotification(user.gameCode);
        
      }
      else{
        io.to(killer.socketId).emit('response_target', true);
      }
      await user.save();
      await killer.save();
      await game.save();
      return res.json({ success: true});
    
  }
  catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
}

exports.getTimeline = async (req, res, next) => {
  try{
    const gameCode = req.params.code;
    const game = await Game.findOne({ gameCode: gameCode });
    return res.json({ success: true, timeline: game.timeline });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
}

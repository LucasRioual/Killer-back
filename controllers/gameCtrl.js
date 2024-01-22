
const Game = require('../models/gameModel.js');
const Mission = require('../models/missionModel.js');
let io; // Assurez-vous que io est accessible dans tout le module

exports.initializeIo = (socketIoInstance) => {
  io = socketIoInstance;
};

//Lorsqu'un joueur rejoins le salon


const generateUniqueCode = () => {
  const characters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
};


exports.createGame = (req, res, next) => {
  
    const generatedCode = generateUniqueCode();
    console.log("Création d'une partie");
    
    const game = new Game({
      code: generatedCode,
      statut: 'wait',
      hostSurname: req.body.surname,
    });
    //game.listPlayer.push({userId:req.body.hostId, surname: req.body.surname});
    game.save().then(
      (savedGame) => {
        res.json({ success: true, code: savedGame.code });
        
      }
    ).catch(
      (error) => {
        res.status(400).json({
          error: error
        });
      }
    );
  };

  exports.getPlayers = (req, res, next) => {
  Game.findOne({
    code: req.params.code
  }).then(
    (game) => {
      res.json({ success: true, listPlayer: game.listPlayer, statut: game.statut });
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: 'La partie n\'existe pas.'
      });
    }
  );
};



const getMission =  async () => {
  
  const documents = await Mission.aggregate([{ $sample: { size: 1 } }]); 
  const mission = documents[0]; 
  console.log(mission.message);
  return mission.message;
 
  
};

exports.getNewMission = async (req, res, next) => {
  const game = await Game.findOne({ code: req.params.code });
  if (!game) {
    return res.status(404).json({
      error: 'Game not found.',
    });
  }
  const player = game.listPlayer.find((player) => player.surname === req.params.username);
  if (!player) {
    return res.status(404).json({
      error: 'Player not found.',
    });
  }
  player.mission = await getMission();
  await game.save();
  return res.json({ success: true, mission: player.mission });
}

  

exports.startGame = async (req, res, next) => {
  console.log('startGame');
  try {
    const game = await Game.findOne({ code: req.params.code });

    if (!game) {
      return res.status(404).json({
        error: 'Game not found.',
      });
    }

    game.statut = 'start';

    const listPlayer = game.listPlayer;

    // Utilisez Promise.all pour paralléliser les appels à getMission
    await Promise.all(listPlayer.map(async (player, index) => {
      player.target = index < listPlayer.length - 1 ? listPlayer[index + 1].surname : listPlayer[0].surname;
      player.mission = await getMission();
    }));

    await game.save();

    console.log('Nouvelle liste', game.listPlayer);
    io.to(game.code).emit('startGame', game.listPlayer);
    res.json({ success: true });
  } catch (error) {
    console.log('Erreur');
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};

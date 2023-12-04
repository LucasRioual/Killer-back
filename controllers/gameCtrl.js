const Game = require('../models/gameModel.js');
let io; // Assurez-vous que io est accessible dans tout le module

exports.initializeIo = (socketIoInstance) => {
  io = socketIoInstance;
};

//Lorsqu'un joueur rejoins le salon


const generateUniqueCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
};



exports.createGame = (req, res, next) => {
  
    const generatedCode = generateUniqueCode();
    
    const game = new Game({
      code: generatedCode,
      status: 'wait',
      hostId: req.body.hostId,
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

  //Initialisation de la connexion socket
  //socket.join(code)
  //io.to(code).emit("sendListPlayer", listPlayer);
  exports.getPlayers = (req, res, next) => {
  Game.findOne({
    code: req.params.code
  }).then(
    (game) => {
      res.json({ success: true, listPlayer: game.listPlayer });
    }
  ).catch(
    (error) => {
      res.status(404).json({
        error: error
      });
    }
  );
};

exports.addPlayer = (req, res, next) => {

  if (!req.params.code || !req.body.userId) {
    return res.status(400).json({
      error: 'Code and userId are required in the request.',
    });
  }

  Game.findOne({
    code: req.params.code
  })
    .then((game) => {
      console.log(game);
      if (!game) {
        console.log('Pas de game')
;        return res.status(404).json({
          error: 'Game not found.',
        });
      }

      const newPlayer = { userId: req.body.userId, surname: req.body.surname };
      // Ajouter le joueur à la liste
      game.listPlayer.push(newPlayer);
      // Enregistrez la mise à jour dans la base de données
       game.save().then(() => {
      
        if(game){
          io.to(game.code).emit("sendListPlayer", game.listPlayer);
          // Ne renvoie la réponse que si tout s'est bien passé
          res.json({ success: true });

        }
        
      
    })
  })
    .catch((error) => {
      console.log("Erreur");
      console.error('Error:', error);
      // Gérez l'erreur sans renvoyer une réponse réussie ici
      res.status(500).json({
        error: error.message,
      });
    });
};

exports.removePlayer = (req, res, next) => {
  // Vérifiez si les paramètres requis sont présents dans la requête
  if (!req.params.code || !req.body.userId) {
    return res.status(400).json({
      error: 'Code and userId are required in the request.',
    });
  }

  // Recherchez le jeu par code
  Game.findOne({ code: req.params.code })
    .then((game) => {
      if (!game) {
        // Si le jeu n'est pas trouvé, renvoyez une réponse appropriée
        return res.status(404).json({
          error: 'Game not found.',
        });
      }

      // Filtrer la liste des joueurs pour supprimer celui avec le userId spécifié
      game.listPlayer = game.listPlayer.filter(player => player.userId !== req.body.userId);

      // Enregistrez la mise à jour dans la base de données
      return game.save();
    })
    .then((game) => {
      if (game) {
        // Émettez l'événement pour mettre à jour la liste des joueurs
        io.to(game.code).emit("sendListPlayer", game.listPlayer);
        // Renvoie la réponse uniquement si tout s'est bien passé
        res.json({ success: true });
      }
    })
    .catch((error) => {
      console.error('Error:', error);
      // Gérez l'erreur sans renvoyer une réponse réussie ici
      res.status(500).json({
        error: error.message,
      });
    });
};

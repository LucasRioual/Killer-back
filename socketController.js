// socketController.js
const socketIo = require('socket.io');
const gameCtrl = require('./controllers/gameCtrl');
const Mission = require('./models/missionModel.js');
const Game = require('./models/gameModel.js');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

const initializeSocket = (server) => {
  const io = socketIo(server);

  // Initialisez io dans gameCtrl
  gameCtrl.initializeIo(io);

  io.on('connection', (socket) => {
    console.log(' ⚡ Nouvelle connexion WebSocket');

  socket.on('connectRoom', (data) => {
    console.log('startSocket', data);
    socket.join(data.code); 
    console.log(data.expoToken);
    Game.findOne({
      code: data.code
    })
      .then((game) => {
        
        const existingPlayer = game.listPlayer.find(player => player.surname === data.surname);
        if(existingPlayer){
          existingPlayer.socketId = socket.id;
          if(existingPlayer.statut === 'confirm'){
            console.log('confirm');
            console.log('Liste des joueurs quand je me connecte', game.listPlayer);
            if(game.listPlayer.length >= 2){
              const userSurname = game.listPlayer.find(player => player.target === data.surname).surname;
              console.log(userSurname);
              console.log(socket.id);
              console.log(game.listPlayer);
              io.to(socket.id).emit('sendConfirmKill',userSurname);

            }
            
          }
          if (existingPlayer.surname === game.hostSurname) {
            io.to(socket.id).emit("isHost");
            if(game.listNewPlayer.length > 0){
              for (let i = 0; i < game.listNewPlayer.length; i++) {
                io.to(socket.id).emit('NewPlayer',game.listNewPlayer[i].surname);
              }
              
            }
          }
          io.to(socket.id).emit('countdown', game.setting.time);
          io.to(socket.id).emit('sendTargetAndMission', existingPlayer.target, existingPlayer.mission);
          game.save();
          

        }
        else{
          const newPlayer = {surname: data.surname, socketId: socket.id, expoToken: data.expoToken, statut: 'alive', mission: null, target: null };
          const gameStatut = game.statut;
            if (gameStatut === 'start') {
              console.log('Nouveau joueur en attente', newPlayer);
              const hostSocket = game.listPlayer.find(player => player.surname === game.hostSurname).socketId;
              const hostExpoToken = game.listPlayer.find(player => player.surname === game.hostSurname).expoToken;
              game.listNewPlayer.push(newPlayer);
              socket.to(hostSocket).emit('NewPlayer',newPlayer.surname);
              sendPushNotification(hostExpoToken, newPlayer.surname + ' veut rejoindre la partie', `Acceptes-tu ?`);

            }
            else{
              game.listPlayer.push(newPlayer);
            }
            game.save().then(() => {  
            
              io.to(data.code).emit("sendListPlayer", game.listPlayer.map(player => player.surname));
              
        })
         

        }
        
    })
  });

  socket.on('confirmNewPlayer', async (newPlayerSurname, gameCode) => {
    try {
      const game = await Game.findOne({ code: gameCode });
      if (!game) {
        // Handle the case where the game with the given code is not found
        return;
      }
      const newPlayer = game.listNewPlayer.find(player => player.surname === newPlayerSurname);
      if (!newPlayer) {
        // Handle the case where the new player is not found
        return;
      }
      console.log('confirmNewPlayer', newPlayer);
      const mission = await getMission(game.tagMission, game.listMission);
      newPlayer.mission = mission.message
      game.listMission.push(mission._id);
      console.log('mission', game.listMission);
      const randomIndex = Math.floor(Math.random() * game.listPlayer.length);
      newPlayer.target = game.listPlayer[randomIndex].target;
      game.listPlayer[randomIndex].target = newPlayer.surname;
  
      game.listPlayer.push(newPlayer);
      game.listNewPlayer = game.listNewPlayer.filter(player => player !== newPlayer);
      await game.save();
      io.to(game.listPlayer[randomIndex].socketId).emit("sendTargetAndMission", game.listPlayer[randomIndex].target, game.listPlayer[randomIndex].mission);
      io.to(newPlayer.socketId).emit('startGame', newPlayer.target, newPlayer.mission, game.setting.changeMission);
      io.to(newPlayer.socketId).emit('countdown', game.setting.time);
    } catch (error) {
      console.error('Error in confirmNewPlayer:', error);
    }
  });

  socket.on('cancelNewPlayer', (newPlayerSurname, gameCode) => {
    console.log('cancelNewPlayer', newPlayerSurname); 
    Game.findOne(
      { code: gameCode }
      ).then((game) => {
        const newPlayerSocket = game.listNewPlayer.find(player => player.surname === newPlayerSurname).socketId;
        game.listNewPlayer = game.listNewPlayer.filter(player => player.surname !== newPlayerSurname);
        game.save().then(() => {
          console.log(newPlayerSocket);
          io.to(newPlayerSocket).emit("refuseNewPlayer");
        });
      })
      .catch((error) => {
        console.error('Error:', error);
      });

  });
  

  socket.on('leaveGame', (code, surname) => {
    console.log('leaveGame', code, surname);
    Game.findOne({
      code: code
    })
    .then((game) => {
      // Recherche du joueur qui a le surname fourni
      const murderPlayer = game.listPlayer.find(player => player.target === surname);
      const playerToLeave = game.listPlayer.find(player => player.surname === surname);
      console.log(murderPlayer, playerToLeave);
        murderPlayer.target = playerToLeave.target;
        murderPlayer.mission = playerToLeave.mission;
        // Supprimer le joueur qui part de la liste des joueurs
        game.listPlayer = game.listPlayer.filter(player => player.surname !== surname);
        socket.leave(code);
        if(playerToLeave.surname === game.hostSurname){
          game.hostSurname = murderPlayer.surname;
          io.to(murderPlayer.socketId).emit("isHost");
        }
        game.save().then(() => {
          console.log(game.listPlayer)
          io.to(murderPlayer.socketId).emit("sendTargetAndMission", murderPlayer.target, murderPlayer.mission);
        });
      
    }) 
    .catch((error) => {
      console.error('Erreur lors du traitement de leaveGame:', error);
    });
  });
 
  
  

  socket.on('removePlayer', (data) => {
    Game.findOneAndUpdate(
      { code: data.code },
      { $pull: { listPlayer: { surname: data.surname } } },
      { new: true } // Pour renvoyer le document mis à jour
    )
      .then((game) => {
        io.to(data.code).emit('sendListPlayer', game.listPlayer.map(player => player.surname));
      })
      .catch((error) => {
        console.error('Error:', error);
      });
      socket.leave(data.code);
    });

    socket.on('removeGame', (code) => {
      Game.findOneAndDelete({ code: code })
        .then(() => {
          io.to(code).emit('endGame');
        })
        .catch((error) => {
          console.error('Error:', error);
        });
      });

    socket.on('confirmKill', (gameCode) => {
      
      //Mettre à jour le statut de la target
        Game.findOne(
            { code: gameCode }
            ).then((game) => {
              const listPlayer = game.listPlayer;
              console.log(listPlayer);
              console.log(socket.id);
              const killerPlayer = listPlayer.find((player) => player.socketId === socket.id);
              const targetPlayer = listPlayer.find((player) => player.surname === killerPlayer.target);
              io.to(targetPlayer.socketId).emit('sendConfirmKill',killerPlayer.surname);
              sendPushNotification(targetPlayer.expoToken, 'Es-tu mort ?', `Confirme ta mort pour que ton assassin puisse continuer à jouer !`);
              targetPlayer.statut = 'confirm';
            game.save().then(() => {
                console.log('statut du joueur mis à jour',game.listPlayer);
            }
            );
        });
    });

    socket.on('killed', (gameCode) => { //le kill est confirmé
      Game.findOne(
        { code: gameCode }
        ).then((game) => {
          const listPlayer = game.listPlayer;
          const target = listPlayer.find((player) => player.socketId === socket.id);
          console.log('target',target);
          const killer = listPlayer.find((player) => player.target === target.surname);
          killer.target = target.target;
          killer.mission = target.mission;
          target.statut = 'dead';
          game.save().then(() => {
            if(game){
              
                socket.to(killer.socketId).emit("isKilledConfirm", killer.target, killer.mission);
              
              
            }
        })
    });
  });

  socket.on('notKilled', (gameCode) => { //le kill n'est pas confirmé')
    
    // Modifier le statut du joueur 
    Game.findOne(
      { code: gameCode }
      ).then((game) => {
      const listPlayer = game.listPlayer;
      const target = listPlayer.find((player) => player.socketId === socket.id);
      const killer = listPlayer.find((player) => player.target === target.surname);
      socket.to(killer.socketId).emit('isNotKilledConfirm');
      target.statut = 'alive';
      game.save().then(() => {
          console.log('statut du joueur mis à jour',game.listPlayer);
      });
    }
  );
  });

  socket.on('hostStartGame', async (code) => {
    console.log('startGame');
    let countdown;
    let listTag;
  try {
    const game = await Game.findOne({ code: code });
    game.statut = 'start';
    listTag = game.tagMission;
    const listPlayer = game.listPlayer;
    await Promise.all(listPlayer.map(async (player, index) => {
      player.target = index < listPlayer.length - 1 ? listPlayer[index + 1].surname : listPlayer[0].surname;
       const mission = await getMission(listTag, game.listMission);
       player.mission = mission.message;
       game.listMission.push(mission._id);
        console.log('mission', game.listMission);
    }));
    console.log('gameSetting', game.setting);
    countdown = game.setting.time;
    await game.save();
    console.log('Nouvelle liste', game.listPlayer);
    for (let i = 0; i < game.listPlayer.length; i++) {
      io.to(game.listPlayer[i].socketId).emit('startGame', game.listPlayer[i].target, game.listPlayer[i].mission, game.setting.changeMission);
    };
    io.to(code).emit('countdown', countdown);
    setInterval(() => {
      countdown = countdown - 60;
      io.to(code).emit('countdown', countdown);
      game.setting.time = countdown;
      game.save();
    }, 60000);
  } catch (error) {
    console.log('Erreur');
    console.error('Error:', error);
  }

  });

    socket.on('disconnect', () => {
      console.log('Déconnexion WebSocket');
    });
  });
};

const sendPushNotification = async (pushToken, title, body) => {
    let messages = [];
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Invalid push token: ${pushToken}`);
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
    });
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        let receipts = await expo.sendPushNotificationsAsync(chunk);
        console.log(receipts);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const getMission = async (tags, listMissionId) => {
    // Récupérer les missions correspondant aux tags
    const matchingDocuments = await Mission.find({
      tag: { $in: tags },
      _id: { $nin: listMissionId }
    });
    
    const randomIndex = Math.floor(Math.random() * matchingDocuments.length);
    const documents = matchingDocuments[randomIndex];
    
    
  
    console.log('Documents', documents);
  
  
    if (documents) {
      console.log(documents.message);
      return documents;
    } else {
      console.log("Aucune nouvelle mission disponible.");
      return null; // Ou toute autre valeur ou indication que vous préférez
    }
  };

module.exports = { initializeSocket };

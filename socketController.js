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
            //Regarder si il y a des nouveaux joueurs
            if(game.listNewPlayer.length > 0){
              console.log('Il y a des nouveaux joueurs', game.listNewPlayer);
              for (let i = 0; i < game.listNewPlayer.length; i++) {
                io.to(socket.id).emit('NewPlayer',game.listNewPlayer[i].surname);
              }
              
            }
          }
          

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
         

        }
        game.save().then(() => {  
            io.to(data.code).emit("sendListPlayer", game.listPlayer);
            
      })
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
  
      newPlayer.mission = await getMission();
      const randomIndex = Math.floor(Math.random() * game.listPlayer.length);
      newPlayer.target = game.listPlayer[randomIndex].target;
      game.listPlayer[randomIndex].target = newPlayer.surname;
  
      game.listPlayer.push(newPlayer);
      game.listNewPlayer = game.listNewPlayer.filter(player => player !== newPlayer);
      await game.save();
      io.to(gameCode).emit("sendListPlayer", game.listPlayer);
      io.to(newPlayer.socketId).emit('startGame', game.listPlayer);
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
        // Enregistrez les modifications dans la base de données
        game.save().then(() => {
          console.log(game.listPlayer)
          // Émettre un événement pour informer les clients des mises à jour
          io.to(code).emit("sendListPlayer", game.listPlayer);
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
  
        io.to(data.code).emit('sendListPlayer', game.listPlayer);
      })
      .catch((error) => {
        console.error('Error:', error);
      });
      socket.leave(data.code);
      const socketsInRoom = io.sockets.adapter.rooms.get(data.code);
      console.log(`Sockets connectés à la salle ${data.code}:`, socketsInRoom);
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

    socket.on('confirmKill', (socketTarget, userSurname, expoTokenTarget, gameCode) => {
      socket.to(socketTarget).emit('sendConfirmKill',userSurname);
      sendPushNotification(expoTokenTarget, 'Es-tu mort ?', `Confirme ta mort pour que ton assassin puisse continuer à jouer !`);
      //Mettre à jour le statut de la target
        Game.findOne(
            { code: gameCode }
            ).then((game) => {
            const listPlayer = game.listPlayer;
            const index = listPlayer.findIndex((player) => player.socketId === socketTarget);
            listPlayer[index].statut = 'confirm';
            game.save().then(() => {
                console.log('statut du joueur mis à jour',game.listPlayer);
            }
            );
        });
    });

    socket.on('killed', (gameCode, socketKiller, target, mission) => { //le kill est confirmé
      console.log('killed', socketKiller, gameCode, target, mission)
      Game.findOne(
        { code: gameCode }
        ).then((game) => {
          const listPlayer = game.listPlayer;
          const indexKiller = listPlayer.findIndex((player) => player.socketId === socketKiller);
          const indexTarget = listPlayer.findIndex((player) => player.socketId === socket.id);
          listPlayer[indexKiller].target = listPlayer[indexTarget].target;
          listPlayer[indexKiller].mission = listPlayer[indexTarget].mission;
          listPlayer[indexTarget].statut = 'dead';
          game.save().then(() => {
            if(game){
              socket.to(socketKiller).emit("isKilledConfirm", game.listPlayer);
            }
        })
    });
  });

  socket.on('notKilled', (socketKiller, gameCode) => { //le kill n'est pas confirmé')
    socket.to(socketKiller).emit('isNotKilledConfirm');
    // Modifier le statut du joueur 
    Game.findOne(
      { code: gameCode }
      ).then((game) => {
      const listPlayer = game.listPlayer;
      const index = listPlayer.findIndex((player) => player.socketId === socket.id);
      listPlayer[index].statut = 'alive';
      game.save().then(() => {
          console.log('statut du joueur mis à jour',game.listPlayer);
      });
    }
  );
  });

  socket.on('hostStartGame', async (code) => {
    console.log('startGame');
  try {
    const game = await Game.findOne({ code: code });
    game.statut = 'start';
    const listPlayer = game.listPlayer;
    await Promise.all(listPlayer.map(async (player, index) => {
      player.target = index < listPlayer.length - 1 ? listPlayer[index + 1].surname : listPlayer[0].surname;
      player.mission = await getMission();
    }));
    await game.save();
    console.log('Nouvelle liste', game.listPlayer);
    io.to(game.code).emit('startGame', game.listPlayer);
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

  const getMission =  async () => {
  
    const documents = await Mission.aggregate([{ $sample: { size: 1 } }]); 
    const mission = documents[0]; 
    console.log(mission.message);
    return mission.message;
   
    
  };

module.exports = { initializeSocket };
const http = require('http');
const app = require('./app');
const socketIo = require('socket.io');
const port = 10411;
const server = http.createServer(app);
const io = socketIo(server);
const gameCtrl = require('./controllers/gameCtrl');
const Game = require('./models/gameModel.js');
const { Expo } = require('expo-server-sdk');
const expo = new Expo();

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
        }
        else{
          const newPlayer = {surname: data.surname, socketId: socket.id, expoToken: data.expoToken };
        game.listPlayer.push(newPlayer);

        }
        game.save().then(() => {
          if(game){
            io.to(data.code).emit("sendListPlayer", game.listPlayer);
          }
      })
    })
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
        if (!game) {
          // Si le jeu n'est pas trouvé, renvoyez une réponse appropriée
          return res.status(404).json({
            error: 'Game not found.',
          });
        }
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



    socket.on('confirmKill', (socketTarget, userSurname, expoTokenTarget) => {
      socket.to(socketTarget).emit('sendConfirmKill',userSurname);
      //Envoyer une notification
      sendPushNotification(expoTokenTarget, 'Es-tu mort ?', `Confirme ta mort pour que ton assassin puisse continuer à jouer !`);
    });

    socket.on('killed', (gameCode, socketKiller, target, mission) => { //le kill est confirmé
      console.log('killed', socketKiller, gameCode, target, mission)
      Game.findOne(
        { code: gameCode }
        ).then((game) => {
          const listPlayer = game.listPlayer;
          const index = listPlayer.findIndex((player) => player.socketId === socketKiller);
          listPlayer[index].target = target;
          listPlayer[index].mission = mission;
          game.save().then(() => {
            if(game){
              socket.to(socketKiller).emit("isKilledConfirm", game.listPlayer);
            }
        })
    });
  });

  socket.on('notKilled', (socketKiller) => { //le kill n'est pas confirmé')
    socket.to(socketKiller).emit('isNotKilledConfirm');
  }
  );
      




  socket.on('disconnect', () => {
    console.log('Déconnexion WebSocket');
  });


});


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

server.listen(port, '0.0.0.0', () => {
  console.log('Server is running on port 3000');
});
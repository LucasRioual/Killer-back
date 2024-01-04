const http = require('http');
const app = require('./app');
const socketIo = require('socket.io');
const port = 3000;
const server = http.createServer(app);
const io = socketIo(server);
const gameCtrl = require('./controllers/gameCtrl');
const Game = require('./models/gameModel.js');

// Initialisez io dans gameCtrl
gameCtrl.initializeIo(io);



io.on('connection', (socket) => {

  console.log(' ⚡ Nouvelle connexion WebSocket');

  socket.on('connectRoom', (data) => {
    console.log('startSocket', data);
    socket.join(data.code); 
    const socketsInRoom = io.sockets.adapter.rooms.get(data.code);
    console.log(`Sockets connectés à la salle ${data.code}:`, socketsInRoom);
    Game.findOne({
      code: data.code
    })
      .then((game) => {
        const newPlayer = { userId: data.userId, surname: data.surname, socketId: socket.id };
        game.listPlayer.push(newPlayer);
        game.save().then(() => {
          if(game){
            io.to(data.code).emit("sendListPlayer", game.listPlayer);
          }
      })
    })
  });

  socket.on('removePlayer', (data) => {
    Game.findOneAndUpdate(
      { code: data.code },
      { $pull: { listPlayer: { userId: data.userId } } },
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



    socket.on('confirmKill', (socketTarget, userSurname) => {
      socket.to(socketTarget).emit('sendConfirmKill',userSurname);
      //Envoyer une notification
    });

    socket.on('killed', (gameCode, socketKiller, target, mission) => {
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
              socket.to(socketKiller).emit("sendListPlayer", game.listPlayer);
            }
        })
    });
  });
      




  socket.on('disconnect', () => {
    console.log('Déconnexion WebSocket');
  });


});

server.listen(port, '0.0.0.0', () => {
  console.log('Server is running on port 3000');
});
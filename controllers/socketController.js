// socketController.js
const socketIo = require('socket.io');
const gameCtrl = require('./gameCtrl.js');
const Mission = require('../models/missionModel.js');
const Game = require('../models/gameModel.js');
const User = require('../models/userModel.js');
const Notification = require('./notifications');
const Timer = require('./timer');


const initializeSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  gameCtrl.initializeIo(io);

  io.on('connection', (socket) => {


    socket.on('join_room', async (gameCode, userId) => {
      try {
        socket.join(gameCode);
        const user = await User.findOne({ _id: userId });
        user.socketId = socket.id;
        user.gameCode = gameCode;
        await user.save();
        io.to(gameCode).emit('new_player', user.userName);
      } catch (error) {
        console.error('Error:', error);
      }
    });

    socket.on('leave_game', async (userId) => {
      try {
        const user = await User.findOne({ _id: userId });
        socket.leave(user.gameCode);
        if (user.statut === 'alive') {
          const killer = await User.findOne({ gameCode: user.gameCode, target: user.userName });
          if (killer) {
            //Si il reste que ces deux joueurs : terminer la partie
            const numberPlayerAlive = await User.countDocuments({ gameCode: user.gameCode, statut: 'alive' });
            if (numberPlayerAlive === 2) { // Fin de partie
              const game = await Game.findOne({ gameCode: user.gameCode });
              const statKiller = {userName: killer.userName, numberKill: killer.kills.length, mission: "none", killerName: "none", time: new Date() };
              killer.statut = 'winner';
              game.timeline.push(statKiller);
              game.statut = 'end';
              clearInterval(Timer.timerId);
              await killer.save();
              await game.save();
              io.to(user.gameCode).emit('end_game');
              const users = await User.find({ gameCode: user.gameCode });
              users.forEach(async user => {
                const title = "Fin de la partie";
                const body = "Le classement est disponible";
                await Notification.sendPushNotification(user.expoToken, title, body);
              });
            }
            else{
              killer.target = user.target;
              killer.mission = user.mission;
              await killer.save();
              socket.to(killer.socketId).emit('target_leave');
              Notification.sendPushNotification(killer.expoToken, user.userName + ' a quitté la partie', `Tu reçois une nouvelle mission et une nouvelle mission`);
            }
            
          }
        }
        user.gameCode = null;
        user.statut = 'none';
        user.kills = [];
        user.target = null;
        user.mission = null;
        await user.save();
      } catch (error) {
        console.error('Error:', error);
      }
    });

    socket.on('kill_confirm', async (userId) => {
      try {
        const user = await User.findOne({ _id: userId });
        const target = await User.findOne({ gameCode: user.gameCode, userName: user.target });
        target.statut = 'confirmation';
        await target.save();
        socket.to(target.socketId).emit('kill_confirm_client');
        Notification.sendPushNotification(target.expoToken, 'Tu es mort !', `Tu passeras le bonjour à St Pierre de ma !`);
      } catch (error) {
        console.error('Error:', error);
      }
    });

    socket.on('kill_refuse', async (userId) => {
      try {
        const user = await User.findOne({ _id: userId });
        const killer = await User.findOne({ gameCode: user.gameCode, target: user.userName });
        user.statut = 'alive';
        await user.save();
        socket.to(killer.socketId).emit('response_target', false);
      } catch (error) {
        console.error('Error:', error);
      }
    });

    socket.on('leave_game_salon', async (userId) => {
      try {
        const user = await User.findOne({ _id: userId });
        socket.to(user.gameCode).emit('player_leave', user.userName);
        socket.leave(user.gameCode);
        user.gameCode = null;
        user.kills = [];
        await user.save();
      } catch (error) {
        console.error('Error:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log('Déconnexion WebSocket');
    });

  });
};

module.exports = { initializeSocket };


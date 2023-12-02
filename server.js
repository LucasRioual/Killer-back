const http = require('http');
const app = require('./app');
const socketIo = require('socket.io');
const port = 3000;
const server = http.createServer(app);
const io = socketIo(server);
const gameCtrl = require('./controllers/gameCtrl');

// Initialisez io dans gameCtrl
gameCtrl.initializeIo(io);

io.on('connection', (socket) => {
  console.log('Nouvelle connexion WebSocket');

  socket.on('sendCode', (code) => {
    console.log(`Reçu un code : ${code}`);
    socket.join(code); // Rejoindre la salle correspondant au code
    // Afficher les sockets connectés à la salle
    const socketsInRoom = io.sockets.adapter.rooms.get(code);
    console.log(`Sockets connectés à la salle ${code}:`, socketsInRoom);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('Server is running on port 3000');
});
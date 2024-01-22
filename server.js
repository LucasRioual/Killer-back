const http = require('http');
const app = require('./app');

const port = 10411;
const server = http.createServer(app);

const { initializeSocket } = require('./socketController');



initializeSocket(server);



server.listen(port, '0.0.0.0', () => {
  console.log('Server is running on port 3000');
});
const express = require('express');
const app = express();
const cors = require('cors');
const gameRoutes = require('./routes/gameRoute');
const userRoutes = require('./routes/userRoute');

const mongooseConnect = require('./mongooseConnect');
mongooseConnect.connectMongoDB();

app.use(cors());

app.use(express.json());

app.use('/api/game', gameRoutes);
app.use('/api/user', userRoutes);





module.exports = app;
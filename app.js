const express = require('express');
const app = express();

const gameRoutes = require('./routes/gameRoute');
const userRoutes = require('./routes/userRoute');

const mongooseConnect = require('./mongooseConnect');
mongooseConnect.connectMongoDB();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    next();
});

app.use(express.json());

app.use('/api/game', gameRoutes);
app.use('/api/users', userRoutes);





module.exports = app;
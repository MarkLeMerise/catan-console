const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

var http = require('http').Server(app);
var io = require('socket.io')(http);

let gameParams = {};
let turn = { count: 0 };
let turnTimer = null;

app.use(express.urlencoded({ extended: true }));

app.get('/game/actions/create', (req, res) => {
     res.sendFile(path.join(__dirname + '/html/game-create.html'))
});

app.get('/game/status', (req, res) => res.send({
    gameParams,
    turn
}));

app.post('/game', (req, res) => {
    res.send('🎲 Game created');
    updateGameSettings(req.body);
    res.redirect('/game?dungeon-master');
});

app.post('/game/settings', (req, res) => {
    res.send('⚙️ Settings updated');
    updateGameSettings(req.body);
});

app.get('/game', (req, res) => res.sendFile(path.join(__dirname + '/html/game.html')));

app.post('/game/turn', (req, res) => {
    res.send('👍 Turn started');

    if (turnTimer) {
        completeTurn(turn);
    }

    turn.count += 1;
    turn.length = getRandomInt(gameParams.minTurnLength, gameParams.maxTurnLength);
    turn.startedAt = Date.now();
    turn.timeLeft = turn.length;

    io.emit('turn.start', turn);

    turnTimer = setInterval(() => {
        turn.timeLeft -= 1;

        io.emit('turn.tick', turn);

        if (turn.timeLeft === 0) {
            completeTurn(turn);
        }
    }, 1000);
});

http.listen(port, '0.0.0.0');

io.on('connection', socket => {
    console.log('a user connected');
});

function updateGameSettings(rawSettings) {
    gameParams.minTurnLength = parseInt(rawSettings.minTurnLength, 10);
    gameParams.maxTurnLength = parseInt(rawSettings.maxTurnLength, 10);
    gameParams.name = rawSettings.gameName;

    io.emit('game.status', {
        gameParams,
        turn
    });
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function completeTurn(turn) {
    clearInterval(turnTimer);
    turnTimer = null;

    io.emit('turn.complete', {
        ...turn,
        turnEndedAt: Date.now()
    });
}
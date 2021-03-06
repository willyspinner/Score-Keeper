//Entry Point for the web app
let express = require("express");
let io = require('socket.io')();
let app = express();
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let methodOverride = require("method-override");
let path = require('path');
let serverPort = 8000;

//Allowing JS and CSS to run somoothly and setting up a public directory for the css
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', 'views');
app.set('view engine', 'ejs');

//Connecting to database
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost/ScoreKeeper", { useMongoClient: true });

let PlayerSchema = new mongoose.Schema({
    parentGameId: mongoose.Schema.Types.ObjectId,
    idInGame: Number,
    points: Number,
});

let Player = mongoose.model('Player', PlayerSchema);

let GameSchema = new mongoose.Schema({
    players: [{
        ref: "Player",
        type: mongoose.Schema.Types.ObjectId,
    }],
    created: {
        type: Date,
        default: Date.now,
    }
}, { usePushEach: true });

let Game = mongoose.model('Game', GameSchema);
let currentGameID; // A way to keep track of current gameID ? Got a better idea implement it

//BodyParser set up
app.use(bodyParser.urlencoded({ extended: true }));

//MethodOverride set up
app.use(methodOverride("_method"));

//Routes
app.get('/', function(req, res) {
    res.render('index', {});
});

app.post('/', function(req, res) {
    //populate the DB
    let players = Number(req.body.players);
    Game.create({
        players: [],
    }, function(error, newGame) {
        if (error) {
            console.log(error);
        } else {
            currentGameID = newGame._id;
            for (let i = 1; i <= players; i++) {
                Player.create({
                    parentGameId: currentGameID,
                    idInGame: i,
                    points: 0
                }, function(error, newPlayer) {
                    if (error) {
                        console.log(error);
                    } else {
                        newGame.update({
                            //Thanks @ https://stackoverflow.com/a/48333797/8176981
                            $push: {
                                players: newPlayer._id
                            }
                        }, function(error, newGame) {
                            if (error) {
                                console.log(error);
                            }
                        });
                    }
                });
            }
        }

    });
});

let server = app.listen(serverPort, function() {
    console.log("Server is running on " + serverPort);
});

io.attach(server);
let sockets = []
io.on('connection', function(socket) {
          console.log('a client connected.')
          sockets.push(socket);
          console.log(`${sockets.length} players`)
          socket.on('scoreUpdate', function(data) {
                    socket.broadcast.emit('scoreUpdate',data)
                    let userId = Number(data.userId);
                    let scoreUpdate = Number(data.scoreUpdate);
                    console.log(currentGameID);
                    Player.update({
                      parentGameId: currentGameID,
                      idInGame: userId,
                    }, {
                      $inc: {
                          points: scoreUpdate,
                      },
                    },
                    function(error, updatedPlayer) {
                      if (error) {
                          console.log(error);
                      }
                    });
          });
});

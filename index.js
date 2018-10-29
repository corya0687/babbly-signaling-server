var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var serverPort = 5001
let socketIdToNames = {};

app.get('/', function(req, res){
  res.sendFile(__dirname + '/test.html');
});

http.listen(serverPort, function(){
  console.log('listening on *:' + serverPort);
});

//  WebRTC Signaling
function socketIdsInRoom(roomId) {
  var socketIds = io.nsps['/'].adapter.rooms[roomId].sockets;
  if (socketIds) {
    var collection = [];
    for (var key in socketIds) {
      if(socketIds.hasOwnProperty(key)) {
        console.log('socket ids in room, %s', key)
        collection.push(key);
      }
    }
    return collection;
  } else {
    return [];
  }
}

io.on('connection', function(socket){
  console.log('Connection');
  socket.on('disconnect', function(){
    console.log('Disconnect %s', socketIdToNames[socket.id]);
    delete socketIdToNames[socket.id];
    let remains = [];
    for (let key in socketIdToNames) {
      if(socketIdToNames.hasOwnProperty(key)) {
        console.log('socket ids in room, %s', key)
        remains.push(key);
      }
    }
    console.log('remaining socket id\'s open ------> %s', remains.toString())
    if (socket.room) {
      var room = socket.room;
      io.to(room).emit('leave', socket.id);
      socket.leave(room);
    }
  });

  /**
   * Callback: list of {socketId, name: name of user}
   */
  socket.on('join', function(joinData, callback){ //Join room
    console.log('join RoomId -----------> %s',joinData.roomId)
    console.log('join name -----------> %s',joinData.name)
    let roomId = joinData.roomId;
    let name = joinData.name;
    socket.join(roomId);
    socket.room = roomId;
    socketIdToNames[socket.id] = name;
    var socketIds = socketIdsInRoom(roomId);
    let friends = socketIds.map((socketId) => {
      return {
        socketId: socketId,
        name: socketIdToNames[socketId]
      }
    }).filter((friend) => friend.socketId != socket.id);
    callback(friends);
    //broadcast
    friends.forEach((friend) => {
      console.log('friend socket id -----> %s',friend.socketId)
      console.log('friend name -----> %s',friend.name)
      console.log('sockets-------------------------------')
      for(k in io.sockets) { if(io.sockets.hasOwnProperty[k]) {console.log(k, io.sockets[k])}}
      // console.log('connected sockets-------------------------------')
      // for(k in io.sockets) { if(io.sockets.connected.hasOwnProperty[k]) {console.log(k, io.sockets.connected[k])}}
      io.sockets.connected[friend.socketId].emit("join", {
        socketId: socket.id, name
      });
    });
    console.log('Join: ', joinData);
  });

  socket.on('exchange', function(data){
    console.log('exchange', data);
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    console.log('sockets: ---> %s', io.sockets )
    console.log('sockets connected: ---> %s', io.sockets.connected )
    to.emit('exchange', data);
  });

  socket.on("count", function(roomId, callback) {
    var socketIds = socketIdsInRoom(roomId);
    callback(socketIds.length);
  });

});

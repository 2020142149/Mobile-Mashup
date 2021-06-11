const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const moment = require('moment');
const formatMessage = require('./utils/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');
const app = express();
const server = http.createServer(app);
const io = socketio(server);



const sqlite = require('sqlite');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'USERINFO.db');
let db = new sqlite3.Database('USERINFO.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
        console.error(dbPath);
    } else {
        console.log('Connected to the database.');
    }
}); // db sqlite3 db에 연결

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'ChatCord Bot';

// Run when client connects
io.on('connection', socket => {

  socket.on('joinRoom', ({ username, room }) => {

    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    io.to(user.room).emit('message', formatMessage(user.username, msg));
    db.run(`INSERT INTO userdata(USERNAME, MESSAGE, ROOM) values('${user.username}', '${msg}', '${user.room}')`);
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    db.close((err) =>{
      if(err){
        console.error(err.message);
      }
      console.log('Close the database connection.');
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });


  }); // db 닫는 코드!!
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

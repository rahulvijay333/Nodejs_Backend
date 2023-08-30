const socketIO = require('socket.io');

const socketConnect = (server) => {

    const io = socketIO(server, {
        cors: {
            origin: '',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log('Connection sucess');
        socket.on('setup', (userId) => {

            socket.join(userId);
        })

        socket.on('join chat', (room) => {

            socket.join(room);
        })

        socket.on('new message', (newMessage) => {

            console.log('new message received');

            socket.broadcast.emit('new messages', newMessage);

            if (!newMessage.conversation.participants) {
                return;
            }
            newMessage.conversation.participants.forEach((participant) => {
                console.log('Participant:', participant);
                if (newMessage.senderModel === 'Doctor') {


                    socket.to(participant.patient)


                    socket.in(participant.patient._id).emit('message recieved', newMessage);
                } else {



                    socket.in(participant.doctor._id).emit('message recieved', newMessage);
                }
            })
        })

        socket.on('new call', (callLink) => {
            console.log(callLink);
            socket.in(callLink.patientId).emit('doctor call', callLink.personalLink);
        });

        socket.on('disconnect', () => {
            console.log('Hello');
            console.log('A user disconnected');
        });

    });
}

module.exports = socketConnect


const express = require('express');
const https = require('https'); // Import the 'https' module
const fs = require('fs'); // Import the 'fs' module for file operations
const app = express();

// Load environment variables from a .env file
require('dotenv').config();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// MongoDB connection
let { connectDB } = require('./db/connection');

// CORS
const cors = require('cors');
app.use(cors());

// Parsing cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Handling files
const fileupload = require('express-fileupload');
app.use(fileupload({ useTempFiles: true, tempFileDir: '/temp/' }));

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Hello');
});

// Routes and other middleware (add your routes here)
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes = require('./routes/doctor');
const adminRoutes = require('./routes/admin');
const appointmemntRoutes = require('./routes/appointment');
const chatRoutes = require('./routes/chat');
const messageRoutes = require('./routes/message');
const notificationRoutes = require('./routes/notifications');
const socketConnect = require('./socket/socket');

app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/appointment', appointmemntRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/notification', notificationRoutes);


// Establishing connection to the database
const connect = async () => {
  try {
    await connectDB();

    // Load your SSL certificate (fullchain) and private key
    const privateKey = fs.readFileSync('keystore/privkey.pem', 'utf8'); // Your private key file
    const certificate = fs.readFileSync('keystore/fullchain.pem', 'utf8'); // Your fullchain certificate file

    const credentials = { key: privateKey, cert: certificate };

    // Create an HTTPS server
    const server = https.createServer(credentials, app);

    server.listen(PORT, () => {
      console.log(`App is running @ ${PORT}`);
    });

    return server;
  } catch (err) {
    console.error(err);
  }
};

connect().then((server) => {
  socketConnect(server);
}).catch((err) => {
  console.error(err);
});

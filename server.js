const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  const userAgent = req.headers['user-agent'];
  const isPC = userAgent.includes('Windows') || userAgent.includes('Macintosh');
  res.render('index', { isPC });
});

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  console.log('File upload request received:', req.file);
  io.emit('file-updated'); // Notify all clients of file upload
  res.status(200).send('File uploaded successfully');
});

// Get local IP address
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (let iface in interfaces) {
    for (let alias of interfaces[iface]) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
};

// Generate QR code endpoint
app.get('/generate-qr', (req, res) => {
  const ip = getLocalIpAddress();
  const url = `http://${ip}:${PORT}`;

  QRCode.toDataURL(url, (err, qrCode) => {
    if (err) {
      console.error('Error generating QR code:', err);
      return res.status(500).send('Error generating QR Code');
    }
    res.send(qrCode);
  });
});

// List uploaded files endpoint
app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).send('Error reading files');
    res.json(files);
  });
});

let pcConnected = false;
let mobileConnected = false;
let pcSocketId = null;
let mobileSocketId = null;

// Socket.io connection
io.on('connection', (socket) => {
  socket.on('identify', (type) => {
    if (type === 'pc') {
      if (!pcConnected) {
        console.log('PC client connected');
        pcConnected = true;
        pcSocketId = socket.id;
        socket.emit('client-type', 'pc');
      } else {
        socket.emit('pc-required', 'A PC is already connected. Only one PC can be connected at a time.');
        socket.disconnect(true);
      }
    } else if (type === 'mobile') {
      if (pcConnected) {
        console.log('Mobile client connected');
        mobileConnected = true;
        mobileSocketId = socket.id;
        socket.emit('client-type', 'mobile');
        io.emit('status', { connected: true });
      } else {
        socket.emit('pc-required', 'A PC must be connected first.');
        socket.disconnect(true);
      }
    }
  });

  socket.on('file-sent', (fileInfo) => {
    if (pcSocketId) {
      io.to(pcSocketId).emit('file-received', fileInfo);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    if (socket.id === pcSocketId) {
      pcConnected = false;
      pcSocketId = null;
      io.emit('status', { connected: false });
      if (mobileSocketId) {
        io.to(mobileSocketId).emit('pc-disconnected');
        mobileConnected = false;
        mobileSocketId = null;
      }
    } else if (socket.id === mobileSocketId) {
      mobileConnected = false;
      mobileSocketId = null;
      io.emit('status', { connected: false });
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
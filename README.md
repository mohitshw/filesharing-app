A file transfer app

# Quick - Local File Transfer Application

Quick is a fast and secure file transfer application that allows seamless file sharing between devices over a local network.

## Features

- **Local Network Transfer**: Fast file transfer over local WiFi network
- **QR Code Scanning**: Easy connection between devices using QR codes
- **Real-time Progress**: Live transfer status updates
- **No Internet Required**: Works completely offline on local network
- **Multiple File Support**: Transfer multiple files simultaneously
- **User-Friendly Interface**: Simple and intuitive design

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
```

2. Install dependencies:
```bash
npm install
```

## Usage

**1. Start the application:**
```bash
npm start
```

**2. The application will start running on your PC**
**3. Scan the displayed QR code using your mobile device**
**4. Select files on your mobile device to transfer**
**5. Files will be automatically received on your PC**


## Technology Stack

- **Frontend**: Electron, Socket.IO Client
- **Backend**: Express.js, Socket.IO
- **File Handling**: Multer
- **QR Code**: QRCode.js
- **Build Tools**: Electron Builder, Vite

## System Requirements

- Node.js 14.0 or higher
- Compatible operating system (Windows, macOS, Linux)
- Local network connection between devices

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


## Support

For support, please open an issue in the repository or contact the maintainers.

## Security

This application operates on local networks only. However, please ensure your network is secure before transferring sensitive files.
>>>>>>> 137aa47 (Basic template & directory)

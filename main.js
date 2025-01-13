const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const tcpPortUsed = require('tcp-port-used');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets/logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.setMenu(null);
  const startUrl = process.env.ELECTRON_START_URL || `http://localhost:3000`;
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://localhost:3000; " +
          "script-src 'self' 'unsafe-inline' http://localhost:3000; " +
          "connect-src http://localhost:3000 ws://localhost:3000; " +
          "style-src 'self' 'unsafe-inline';" +
          "img-src 'self' data: http://localhost:3000;"
        ]
      }
    })
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startServer() {
  tcpPortUsed.check(3000, '127.0.0.1')
    .then(function(inUse) {
      if (inUse) {
        console.log('Port 3000 is in use, killing the process...');
        require('child_process').exec('npx kill-port 3000', (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          spawnServerProcess();
        });
      } else {
        spawnServerProcess();
      }
    }, function(err) {
      console.error('Error on check:', err.message);
    });
}

function spawnServerProcess() {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'server.js')
    : path.join(__dirname, 'server.js');
  
  serverProcess = spawn('node', [serverPath]);
  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server error: ${data}`);
  });
}

app.on('ready', () => {
  startServer();
  setTimeout(createWindow, 1000); // Give the server a second to start
});

app.on('window-all-closed', function () {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
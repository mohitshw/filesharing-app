document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const statusContainer = document.getElementById('statusContainer');
    const statusIndicator = document.getElementById('statusIndicator');
    const instructions = document.getElementById('instructions');
    const instructions2 = document.getElementById('instructions2');
    const qrCodeImg = document.getElementById('qrCode');
    const fileListPC = document.getElementById('fileListPC');
    const fileListMobile = document.getElementById('fileListMobile');
    const fileInput = document.getElementById('fileInput');
    const sendButton = document.getElementById('sendButton');
    const retryButton = document.getElementById('retryButton');
    const retry = document.getElementById('retry');

    const fab = document.getElementById('fab');

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    let isPC = false;

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    const updateStatusIndicator = (connected) => {
        statusContainer.classList.toggle('connected', connected);
        statusContainer.classList.toggle('disconnected', !connected);
        statusIndicator.textContent = `Status: ${connected ? 'Connected' : 'Disconnected'}`;
        [instructions, instructions2, qrCodeImg].forEach(el => {
            if (el) el.style.display = connected ? 'none' : 'block';
        });
        if (isPC) {
            if (fileListPC) fileListPC.style.display = connected ? 'block' : 'none';
        } else {
            if (fileListMobile) fileListMobile.style.display = connected ? 'block' : 'none';
            if (fab) fab.style.display = connected ? 'block' : 'none';
        }
        if (retryButton) retryButton.style.display = connected ? 'none' : 'block';
        if (retry) retry.style.display = connected ? 'none' : 'block';
    };

    socket.on('status', (data) => {
        updateStatusIndicator(data.connected);
    });

    socket.on('client-type', (type) => {
        console.log(`${type.toUpperCase()} client connected`);
        isPC = type === 'pc';
        if (isPC && qrCodeImg) {
            fetch('/generate-qr')
                .then(response => response.text())
                .then(data => {
                    qrCodeImg.src = data;
                })
                .catch(error => console.error('Error fetching QR code:', error));
        }
    });

    socket.on('pc-required', (message) => {
        alert(message);
    });

    socket.on('pc-disconnected', () => {
        alert('PC disconnected. Please reconnect.');
        updateStatusIndicator(false);
    });

    if (retryButton) {
        retryButton.addEventListener('click', () => {
            socket.emit('identify', 'mobile');
        });
    }

    if (fab) {
        fab.onclick = () => {
            fileInput.click();
        };
    }

    function createFileListItem(fileName, status, isSending = true, fileSize = 0) {
        const listItem = document.createElement('li');
        listItem.className = 'fileItem';

        const icon = document.createElement('span');
        icon.className = 'fileIcon';
        icon.innerHTML = '📄';

        const fileNameSpan = document.createElement('span');
        fileNameSpan.className = 'fileName';
        fileNameSpan.textContent = fileName;

        const statusSpan = document.createElement('span');
        statusSpan.className = 'status';
        statusSpan.textContent = status;

        const infoIcon = document.createElement('span');
        infoIcon.className = 'icon-info';
        infoIcon.textContent = 'ⓘ';
        infoIcon.onclick = () => showFileDetails(listItem);

        listItem.appendChild(icon);
        listItem.appendChild(fileNameSpan);
        listItem.appendChild(statusSpan);
        listItem.appendChild(infoIcon);

        listItem.dataset.fileSize = fileSize;

        return listItem;
    }

    function updateFileProgress(listItem, percentage) {
        listItem.dataset.progress = percentage;

        if (document.getElementById('fileDetailsPopup').style.display === 'block') {
            const popupFileName = document.getElementById('popupFileName').textContent;
            const itemFileName = listItem.querySelector('.fileName').textContent;
            if (popupFileName === itemFileName) {
                updatePopupContent(listItem);
            }
        }
    }

    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const files = Array.from(fileInput.files);
            files.forEach(file => {
                const listItem = createFileListItem(file.name, 'Sending...', true, file.size);
                fileListMobile.appendChild(listItem);

                const formData = new FormData();
                formData.append('file', file);

                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/upload', true);

                xhr.upload.onprogress = function (e) {
                    if (e.lengthComputable) {
                        const percentage = (e.loaded / e.total) * 100;
                        updateFileProgress(listItem, percentage);
                    }
                };

                xhr.onload = function () {
                    if (xhr.status === 200) {
                        listItem.querySelector('.status').textContent = 'Successfully sent';
                        updateFileProgress(listItem, 100);
                        socket.emit('file-sent', { name: file.name, size: file.size });
                    } else {
                        listItem.querySelector('.status').textContent = 'Failed to send';
                    }
                };

                xhr.onerror = function () {
                    listItem.querySelector('.status').textContent = 'Failed to send';
                };

                xhr.send(formData);
            });
        });
    }

    socket.on('file-received', fileInfo => {
        const listItem = createFileListItem(fileInfo.name, 'Received', false, fileInfo.size);
        fileListPC.appendChild(listItem);
    });

    socket.on('connect', () => {
        reconnectAttempts = 0;
        const userAgent = window.navigator.userAgent;
        const deviceType = userAgent.includes('Windows') || userAgent.includes('Macintosh') ? 'pc' : 'mobile';
        isPC = deviceType === 'pc';
        socket.emit('identify', deviceType);
    });

    socket.on('disconnect', () => {
        updateStatusIndicator(false);
        attemptReconnect();
    });

    function attemptReconnect() {
        if (reconnectAttempts < maxReconnectAttempts) {
            setTimeout(() => {
                console.log('Attempting to reconnect...');
                socket.connect();
                reconnectAttempts++;
            }, 2000);
        } else {
            console.log('Max reconnect attempts reached.');
            alert('Unable to reconnect. Please refresh the page.');
        }
    }

    function showFileDetails(listItem) {
        updatePopupContent(listItem);
        document.getElementById('fileDetailsPopup').style.display = 'block';
    }

    function updatePopupContent(listItem) {
        const fileName = listItem.querySelector('.fileName').textContent;
        const status = listItem.querySelector('.status').textContent;
        const progress = listItem.dataset.progress || 0;
        const roundedProgress = Math.round(parseFloat(progress));
        const fileSize = formatFileSize(parseInt(listItem.dataset.fileSize) || 0);

        document.getElementById('popupFileName').textContent = fileName;
        document.getElementById('popupProgress').style.width = `${roundedProgress}%`;
        document.getElementById('popupDetails').textContent = `${roundedProgress}% | ${fileSize} | ${status}`;
        if (status === 'Failed to send' || status === 'Failed to receive') {
            document.getElementById('popupDetails').classList.add('failed');
        } else {
            document.getElementById('popupDetails').classList.remove('failed');
        }
    }

    window.closePopup = function () {
        document.getElementById('fileDetailsPopup').style.display = 'none';
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('qr-video');
    const videoContainer = document.getElementById('video-container');
    const startScanBtn = document.getElementById('start-scan-btn');
    const rescanBtn = document.getElementById('rescan-btn');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const resultContainer = document.getElementById('result-container');
    const backToAdminBtn = document.getElementById('back-to-admin-btn');
    
    let scanning = false;
    let currentStream = null; // Para armazenar a stream da câmera

    startScanBtn.addEventListener('click', () => {
        startScanBtn.classList.add('hidden');
        videoContainer.classList.remove('hidden');
        scanning = true;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", advanced: [{ zoom: 2.0 }] } })
            .then(function(stream) {
                currentStream = stream; // Armazena a stream
                video.srcObject = stream;
                video.setAttribute("playsinline", true);
                video.play();
                requestAnimationFrame(tick);
            })
            .catch(function(err) {
                console.error("Error accessing camera: ", err);
                alert("Não foi possível acessar a câmera. Verifique as permissões.");
                prepareForNewScan(); // Prepara para um novo scan se a câmera falhar
            });
    });

    function tick() {
        if (!scanning) return; // Parar de chamar tick se não estiver escaneando

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const canvasElement = document.createElement('canvas');
            const canvas = canvasElement.getContext('2d');
            canvasElement.height = video.videoHeight;
            canvasElement.width = video.videoWidth;
            canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                scanning = false; // Interrompe o scan imediatamente após detectar
                handleQrCode(code.data);
                return; // Impede que requestAnimationFrame(tick) seja chamado novamente aqui
            }
        }
        requestAnimationFrame(tick); // Continua escaneando se não detectou ou não está pronto
    }

    async function handleQrCode(hash) {
        // Para a stream da câmera quando o QR Code é detectado
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        videoContainer.classList.add('hidden'); // Esconde a área do vídeo

        try {
            const response = await fetch(`/api/validar/${hash}`, {
                method: 'POST',
            });

            const data = await response.json();

            if (!response.ok) {
                showResult('Erro na Validação', data.detail, 'error');
            } else {
                showResult('QR Code Válido!', `Cliente ${data.nome} validado com sucesso!`, 'success');
            }

        } catch (error) {
            console.error("Fetch error:", error);
            showResult('Erro', 'Não foi possível se comunicar com o servidor.', 'error');
        } finally {
            rescanBtn.classList.remove('hidden'); // Exibe o botão de escanear novamente
        }
    }
    
    function showResult(title, message, type) {
        resultTitle.textContent = title;
        resultMessage.textContent = message;
        resultTitle.style.color = type === 'success' ? '#5cb85c' : '#d9534f';
        resultContainer.classList.remove('hidden');
    }

    function prepareForNewScan() {
        scanning = false; // Garante que o scan está parado
        if (currentStream) { // Desliga a câmera se ainda estiver ligada
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
        videoContainer.classList.add('hidden'); // Esconde o vídeo
        resultContainer.classList.add('hidden'); // Esconde o resultado
        rescanBtn.classList.add('hidden'); // Esconde o botão de escanear novamente
        startScanBtn.classList.remove('hidden'); // Mostra o botão "Abrir Câmera"
    }

    // Event listener para o botão "Escanear Novamente"
    rescanBtn.addEventListener('click', () => {
        prepareForNewScan();
    });

    backToAdminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
});
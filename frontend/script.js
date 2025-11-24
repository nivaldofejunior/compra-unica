document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('cadastro-form');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeImg = document.getElementById('qrcode-img');
    const errorMsg = document.getElementById('error-msg');
    const statusMsg = document.getElementById('status-msg');

    // Funções de máscara manual
    const cpfInput = document.getElementById('cpf');
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });

    const celularInput = document.getElementById('celular');
    celularInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
        e.target.value = value;
    });
    
    const dataInput = document.getElementById('data_nascimento');
    dataInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{2})(\d)/, '$1/$2');
        value = value.replace(/(\d{2})(\d)/, '$1/$2');
        e.target.value = value;
    });

    const API_URL = ''; // URL Relativa para a API

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorMsg.classList.add('hidden');
        qrcodeContainer.classList.add('hidden');
        
        const rawCpf = cpfInput.value.replace(/\D/g, '');
        const rawCelular = celularInput.value.replace(/\D/g, '');
        const rawData = dataInput.value.split('/').reverse().join('-');

        const data = {
            nome: document.getElementById('nome').value,
            cpf: rawCpf,
            celular: rawCelular,
            data_nascimento: rawData,
        };

        try {
            const response = await fetch(`${API_URL}/clientes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const cliente = await response.json();

            if (response.status === 201) {
                statusMsg.textContent = 'Cadastro realizado com sucesso!';
            } else if (response.status === 208) {
                const status = cliente.utilizado 
                    ? `Este QR Code já foi utilizado em ${new Date(cliente.data_utilizacao).toLocaleString('pt-BR')}.`
                    : 'Este QR Code ainda é válido.';
                statusMsg.textContent = `Você já está cadastrado! ${status}`;
            } else {
                throw new Error(cliente.detail || 'Ocorreu um erro ao cadastrar.');
            }
            
            qrcodeImg.src = `${API_URL}/qrcode/${cliente.qrcode_hash}`;
            qrcodeContainer.classList.remove('hidden');
            form.classList.add('hidden');

        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
        }
    });
});
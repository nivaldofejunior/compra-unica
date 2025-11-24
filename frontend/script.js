document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('cadastro-form');
    const closedPromoContainer = document.getElementById('closed-promo-container');
    const promoTitle = document.getElementById('promo-title');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeImg = document.getElementById('qrcode-img');
    const errorMsg = document.getElementById('error-msg');
    const statusMsg = document.getElementById('status-msg');

    // Funções de máscara manual
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }

    const celularInput = document.getElementById('celular');
    if (celularInput) {
        celularInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value;
        });
    }
    
    const dataInput = document.getElementById('data_nascimento');
    if (dataInput) {
        dataInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{2})(\d)/, '$1/$2');
            value = value.replace(/(\d{2})(\d)/, '$1/$2');
            e.target.value = value;
        });
    }

    const API_URL = 'https://4f4816236afa.ngrok-free.app'; // URL para a API

    async function verificarStatusPromocao() {
        try {
            const response = await fetch(`${API_URL}/promocao-info/`);
            if (!response.ok) {
                throw new Error('Não foi possível carregar as informações da promoção.');
            }
            const info = await response.json();
            if (promoTitle) {
                promoTitle.textContent = info.titulo_promocao;
            }

            if (info.data_limite_promocao) {
                const dataLimite = new Date(info.data_limite_promocao);
                const agora = new Date();
                if (agora > dataLimite) {
                    if (form) form.classList.add('hidden');
                    if (closedPromoContainer) closedPromoContainer.classList.remove('hidden');
                    return;
                }
            }
            if (form) form.classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao verificar status da promoção:', error);
            if (promoTitle) promoTitle.textContent = 'Erro ao carregar promoção';
        }
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (errorMsg) errorMsg.classList.add('hidden');
            if (qrcodeContainer) qrcodeContainer.classList.add('hidden');
            
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
                    if(statusMsg) statusMsg.textContent = 'Cadastro realizado com sucesso!';
                } else if (response.status === 208) {
                    const status = cliente.utilizado 
                        ? `Este QR Code já foi utilizado em ${new Date(cliente.data_utilizacao).toLocaleString('pt-BR')}.`
                        : 'Este QR Code ainda é válido.';
                    if(statusMsg) statusMsg.textContent = `Você já está cadastrado! ${status}`;
                } else {
                    throw new Error(cliente.detail || 'Ocorreu um erro ao cadastrar.');
                }
                
                if (qrcodeImg) qrcodeImg.src = `${API_URL}/qrcode/${cliente.qrcode_hash}`;
                if (qrcodeContainer) qrcodeContainer.classList.remove('hidden');
                if (form) form.classList.add('hidden');

            } catch (error) {
                if (errorMsg) {
                    errorMsg.textContent = error.message;
                    errorMsg.classList.remove('hidden');
                }
            }
        });
    }

    await verificarStatusPromocao();
});
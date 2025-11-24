import { aplicarMascara, mascaraCPF, mascaraCelular, mascaraData } from './mask.js';

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('cadastro-form');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const qrcodeImg = document.getElementById('qrcode-img');
    const errorMsg = document.getElementById('error-msg');
    const statusMsg = document.getElementById('status-msg');
    const promoTitleElement = document.getElementById('promo-title');

    // Aplicando máscaras
    const cpfInput = document.getElementById("cpf");
    const celularInput = document.getElementById("celular");
    const dataInput = document.getElementById("data_nascimento");

    aplicarMascara(cpfInput, mascaraCPF);
    aplicarMascara(celularInput, mascaraCelular);
    aplicarMascara(dataInput, mascaraData);

    const API_BASE_URL = 'https://d5f8e8aecadb.ngrok-free.app'; // Ajuste para a URL da API em produção

    async function loadPromotionInfo() {
        try {
            const response = await fetch(`${API_BASE_URL}/promocao-info/`);
            if (!response.ok) {
                throw new Error('Erro ao carregar informações da promoção.');
            }
            const data = await response.json();
            // Assumindo que o titulo_promocao vem no formato "Promoção Pizza por R$ 0,25"
            // Dividimos para aplicar o estilo apenas ao preço.
            const [mainTitle, pricePart] = data.titulo_promocao.split(' por ');
            promoTitleElement.innerHTML = `<span>${mainTitle} por</span> <span class="price">${pricePart || ''}</span>`;
        } catch (error) {
            console.error('Erro ao carregar info da promoção:', error);
            promoTitleElement.textContent = 'Erro ao carregar promoção';
            errorMsg.textContent = 'Não foi possível carregar as informações da promoção. Tente novamente mais tarde.';
            errorMsg.classList.remove('hidden');
        }
    }

    // Carregar informações da promoção ao iniciar
    loadPromotionInfo();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        errorMsg.classList.add('hidden');
        qrcodeContainer.classList.add('hidden');

        const dataNascimentoValue = dataInput.value;
        const dataParts = dataNascimentoValue.split('/');
        const dia = parseInt(dataParts[0], 10);
        const mes = parseInt(dataParts[1], 10);
        const ano = parseInt(dataParts[2], 10);

        // Validação de Idade (Frontend)
        const dataNascimentoObj = new Date(ano, mes - 1, dia);
        const hoje = new Date();
        const idadeMinima = 15;
        const dataLimite = new Date(hoje.getFullYear() - idadeMinima, hoje.getMonth(), hoje.getDate());

        if (dataNascimentoObj > dataLimite) {
            errorMsg.textContent = `Você precisa ter no mínimo ${idadeMinima} anos para se cadastrar.`;
            errorMsg.classList.remove('hidden');
            return;
        }

        // Validação completa de CPF (Frontend)
        const cpfNumeros = cpfInput.value.replace(/\D/g, '');
        if (cpfNumeros.length !== 11) {
            errorMsg.textContent = 'CPF deve conter 11 dígitos numéricos.';
            errorMsg.classList.remove('hidden');
            return;
        }

        // Lógica de validação dos dígitos verificadores do CPF
        function validarDigitosCPF(cpfStr) {
            let sum = 0;
            let remainder;

            if (cpfStr == "00000000000" ||
                cpfStr == "11111111111" ||
                cpfStr == "22222222222" ||
                cpfStr == "33333333333" ||
                cpfStr == "44444444444" ||
                cpfStr == "55555555555" ||
                cpfStr == "66666666666" ||
                cpfStr == "77777777777" ||
                cpfStr == "88888888888" ||
                cpfStr == "99999999999") {
                return false;
            }

            for (let i = 1; i <= 9; i++) {
                sum = sum + parseInt(cpfStr.substring(i - 1, i)) * (11 - i);
            }
            remainder = (sum * 10) % 11;

            if ((remainder == 10) || (remainder == 11)) {
                remainder = 0;
            }
            if (remainder != parseInt(cpfStr.substring(9, 10))) {
                return false;
            }

            sum = 0;
            for (let i = 1; i <= 10; i++) {
                sum = sum + parseInt(cpfStr.substring(i - 1, i)) * (12 - i);
            }
            remainder = (sum * 10) % 11;

            if ((remainder == 10) || (remainder == 11)) {
                remainder = 0;
            }
            if (remainder != parseInt(cpfStr.substring(10, 11))) {
                return false;
            }
            return true;
        }

        if (!validarDigitosCPF(cpfNumeros)) {
            errorMsg.textContent = 'CPF inválido.';
            errorMsg.classList.remove('hidden');
            return;
        }

        const data = {
            nome: document.getElementById('nome').value,
            cpf: cpfNumeros,
            celular: celularInput.value.replace(/\D/g, ''),
            data_nascimento: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/clientes/`, {
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
            } else if (response.status === 400 && cliente.detail === "Limite máximo de clientes atingido para esta promoção.") {
                errorMsg.textContent = 'Desculpe, o limite máximo de clientes para esta promoção foi atingido.';
                errorMsg.classList.remove('hidden');
                return;
            }
            else {
                throw new Error(cliente.detail || 'Ocorreu um erro ao cadastrar.');
            }
            
            qrcodeImg.src = `${API_BASE_URL}/qrcode/${cliente.qrcode_hash}`;
            qrcodeContainer.classList.remove('hidden');
            form.classList.add('hidden');

            // Recarregar informações da promoção para atualizar o contador (se houver)
            loadPromotionInfo();

        } catch (error) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
        }
    });
});
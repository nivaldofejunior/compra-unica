document.addEventListener('DOMContentLoaded', async () => {
    const configForm = document.getElementById('config-form');
    const configIdInput = document.getElementById('config-id');
    const tituloPromocaoInput = document.getElementById('titulo_promocao');
    const limiteClientesInput = document.getElementById('limite_clientes');
    const dataLimitePromocaoInput = document.getElementById('data_limite_promocao');
    const messageContainer = document.getElementById('message-container');

    const API_BASE_URL = 'https://4f4816236afa.ngrok-free.app' // Substituir pela URL do ngrok ou domínio

    async function showMessage(message, type) {
        messageContainer.textContent = message;
        messageContainer.className = '';
        messageContainer.classList.add('message-' + type);
        messageContainer.classList.remove('hidden');
        setTimeout(() => {
            messageContainer.classList.add('hidden');
        }, 5000);
    }

    async function fetchConfiguracao() {
        try {
            const response = await fetch(`${API_BASE_URL}/configuracao/`);
            if (!response.ok) {
                throw new Error('Erro ao buscar configurações.');
            }
            const config = await response.json();
            configIdInput.value = config.id;
            tituloPromocaoInput.value = config.titulo_promocao;
            limiteClientesInput.value = config.limite_clientes;
            if (config.data_limite_promocao) {
                // Formata a data para o formato datetime-local (YYYY-MM-DDTHH:MM)
                const date = new Date(config.data_limite_promocao);
                const formattedDate = date.toISOString().slice(0, 16);
                dataLimitePromocaoInput.value = formattedDate;
            }
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            showMessage('Erro ao carregar configurações: ' + error.message, 'error');
        }
    }

    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const configId = configIdInput.value;
        const titulo_promocao = tituloPromocaoInput.value;
        const limite_clientes = parseInt(limiteClientesInput.value, 10);
        const data_limite_promocao_valor = dataLimitePromocaoInput.value;
        const data_limite_promocao = data_limite_promocao_valor ? new Date(data_limite_promocao_valor).toISOString() : null;

        if (data_limite_promocao_valor && new Date(data_limite_promocao_valor) < new Date()) {
            showMessage('A data limite da promoção não pode ser uma data passada.', 'error');
            return;
        }

        if (isNaN(limite_clientes) || limite_clientes < 1) {
            showMessage('O limite de clientes deve ser um número positivo.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/configuracao/${configId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo_promocao, limite_clientes, data_limite_promocao }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Erro ao salvar configurações.');
            }

            showMessage('Configurações salvas com sucesso!', 'success');
            await fetchConfiguracao();
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            showMessage('Erro ao salvar configurações: ' + error.message, 'error');
        }
    });


    fetchConfiguracao();
});
document.addEventListener('DOMContentLoaded', async () => {
    const configForm = document.getElementById('config-form');
    const configIdInput = document.getElementById('config-id');
    const tituloPromocaoInput = document.getElementById('titulo_promocao');
    const limiteClientesInput = document.getElementById('limite_clientes');
    const resetClientesBtn = document.getElementById('reset-clientes-btn');
    const goToValidacaoBtn = document.getElementById('go-to-validacao-btn');
    const logoutBtn = document.getElementById('logout-btn'); // Adiciona a referência ao novo botão
    const messageContainer = document.getElementById('message-container');
    const clientTableBody = document.querySelector('#client-table tbody');
    const totalClientesSpan = document.getElementById('total-clientes');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const currentPageSpan = document.getElementById('current-page');

    const API_BASE_URL = 'https://d5f8e8aecadb.ngrok-free.app'; // Pode ser ajustado para a URL da API em produção
    let currentPage = 1;
    const itemsPerPage = 10; // Número de clientes por página

    async function showMessage(message, type) {
        messageContainer.textContent = message;
        messageContainer.className = ''; // Reset classes
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
        } catch (error) {
            console.error('Erro ao carregar configuração:', error);
            showMessage('Erro ao carregar configurações: ' + error.message, 'error');
        }
    }

    async function fetchTotalClientes() {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/clientes/total/`);
            if (!response.ok) {
                throw new Error('Erro ao buscar total de clientes.');
            }
            const total = await response.json();
            totalClientesSpan.textContent = `Total: ${total}`;
            return total;
        } catch (error) {
            console.error('Erro ao carregar total de clientes:', error);
            showMessage('Erro ao carregar total de clientes: ' + error.message, 'error');
            return 0;
        }
    }

    async function fetchClientes(page) {
        try {
            const skip = (page - 1) * itemsPerPage;
            const response = await fetch(`${API_BASE_URL}/admin/clientes/?skip=${skip}&limit=${itemsPerPage}`);
            if (!response.ok) {
                throw new Error('Erro ao buscar clientes.');
            }
            const clientes = await response.json();
            
            clientTableBody.innerHTML = ''; // Limpa a tabela
            if (clientes.length === 0) {
                clientTableBody.innerHTML = '<tr><td colspan="7">Nenhum cliente cadastrado.</td></tr>';
                return;
            }

            clientes.forEach(cliente => {
                const row = clientTableBody.insertRow();
                row.insertCell().textContent = cliente.nome;
                row.insertCell().textContent = cliente.cpf;
                row.insertCell().textContent = cliente.celular;
                row.insertCell().textContent = new Date(cliente.data_nascimento).toLocaleDateString('pt-BR');
                row.insertCell().textContent = new Date(cliente.data_criacao).toLocaleString('pt-BR');
                row.insertCell().textContent = cliente.utilizado ? 'Sim' : 'Não';
                row.insertCell().textContent = cliente.data_utilizacao ? new Date(cliente.data_utilizacao).toLocaleString('pt-BR') : '-';
            });

            const total = await fetchTotalClientes();
            const totalPages = Math.ceil(total / itemsPerPage);
            prevPageBtn.disabled = page === 1;
            nextPageBtn.disabled = page === totalPages || total === 0;
            currentPageSpan.textContent = `Página ${page}`;

        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            showMessage('Erro ao carregar clientes: ' + error.message, 'error');
        }
    }

    configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const configId = configIdInput.value;
        const titulo_promocao = tituloPromocaoInput.value;
        const limite_clientes = parseInt(limiteClientesInput.value, 10);

        if (isNaN(limite_clientes) || limite_clientes < 1) {
            showMessage('O limite de clientes deve ser um número positivo.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/configuracao/${configId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo_promocao, limite_clientes }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Erro ao salvar configurações.');
            }

            showMessage('Configurações salvas com sucesso!', 'success');
            await fetchConfiguracao(); // Recarrega para garantir que os dados atualizados são exibidos
            await fetchClientes(currentPage); // Recarrega a lista de clientes para atualizar o total
        } catch (error) {
            console.error('Erro ao salvar configuração:', error);
            showMessage('Erro ao salvar configurações: ' + error.message, 'error');
        }
    });

    resetClientesBtn.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja resetar o status de "utilizado" para TODOS os clientes? Esta ação é irreversível.')) {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/resetar-utilizacao/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Erro ao resetar clientes.');
                }

                showMessage('Status de utilização dos clientes resetado com sucesso!', 'success');
                await fetchClientes(currentPage); // Recarrega a lista para refletir as mudanças
            } catch (error) {
                console.error('Erro ao resetar clientes:', error);
                showMessage('Erro ao resetar clientes: ' + error.message, 'error');
            }
        }
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchClientes(currentPage);
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        const total = await fetchTotalClientes();
        const totalPages = Math.ceil(total / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            fetchClientes(currentPage);
        }
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminLoggedIn'); // Remove o status de login
            window.location.href = 'admin-login.html'; // Redireciona para a página de login
        });
    });

    goToValidacaoBtn.addEventListener('click', () => {
        window.location.href = 'validar.html';
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn'); // Remove o status de login
        window.location.href = 'admin-login.html'; // Redireciona para a página de login
    });

    // Inicializa a página
    fetchConfiguracao();
    fetchClientes(currentPage);
});
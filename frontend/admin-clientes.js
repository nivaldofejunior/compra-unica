document.addEventListener('DOMContentLoaded', async () => {
    const searchClientInput = document.getElementById('search-client');
    const clientTableBody = document.querySelector('#client-table tbody');
    const totalClientesSpan = document.getElementById('total-clientes');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const currentPageSpan = document.getElementById('current-page');
    const resetClientesBtn = document.getElementById('reset-clientes-btn');
    const modal = document.getElementById('client-modal');
    const modalDetails = document.getElementById('modal-client-details');
    const closeModalBtn = document.querySelector('.close-btn');

    const API_BASE_URL = 'http://212.85.21.16:8123'; // URL da API em produção
    let currentPage = 1;
    const itemsPerPage = 10;
    let searchTimeout;

    function formatarCPF(cpf) {
        const cpfLimpo = String(cpf).replace(/\D/g, '').padStart(11, '0');
        return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    function formatarCelular(celular) {
        const celularLimpo = String(celular).replace(/\D/g, '').padStart(11, '0');
        return celularLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }

    async function showMessage(message, type) {
        // Implementar uma função de mensagem se necessário
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

    async function fetchClientes(page, searchTerm = '') {
        try {
            const skip = (page - 1) * itemsPerPage;
            let url = `${API_BASE_URL}/admin/clientes/?skip=${skip}&limit=${itemsPerPage}`;
            if (searchTerm) {
                url += `&search=${searchTerm}`; // Adicionar um endpoint de busca no backend
            }
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Erro ao buscar clientes.');
            }
            const clientes = await response.json();
            
            clientTableBody.innerHTML = '';
            if (clientes.length === 0) {
                clientTableBody.innerHTML = '<tr><td colspan="7">Nenhum cliente encontrado.</td></tr>';
                return;
            }

            clientes.forEach(cliente => {
                const row = clientTableBody.insertRow();
                row.insertCell().textContent = cliente.nome;
                row.insertCell().textContent = formatarCPF(cliente.cpf);
                row.insertCell().textContent = formatarCelular(cliente.celular);
                row.insertCell().textContent = cliente.utilizado ? 'Sim' : 'Não';

                row.addEventListener('click', () => {
                    modalDetails.innerHTML = `
                        <p><strong>Nome:</strong> ${cliente.nome}</p>
                        <p><strong>CPF:</strong> ${formatarCPF(cliente.cpf)}</p>
                        <p><strong>Celular:</strong> ${formatarCelular(cliente.celular)}</p>
                        <p><strong>Nascimento:</strong> ${new Date(cliente.data_nascimento).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Cadastrado Em:</strong> ${new Date(cliente.data_criacao).toLocaleString('pt-BR')}</p>
                        <p><strong>Utilizado:</strong> ${cliente.utilizado ? 'Sim' : 'Não'}</p>
                        <p><strong>Utilizado Em:</strong> ${cliente.data_utilizacao ? new Date(cliente.data_utilizacao).toLocaleString('pt-BR') : '-'}</p>
                    `;
                    modal.style.display = 'flex';
                });
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

    searchClientInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            fetchClientes(currentPage, searchClientInput.value.trim());
        }, 500);
    });

    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchClientes(currentPage, searchClientInput.value.trim());
        }
    });

    nextPageBtn.addEventListener('click', async () => {
        const total = await fetchTotalClientes();
        const totalPages = Math.ceil(total / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            fetchClientes(currentPage, searchClientInput.value.trim());
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
                fetchClientes(currentPage, searchClientInput.value.trim());
            } catch (error) {
                console.error('Erro ao resetar clientes:', error);
                showMessage('Erro ao resetar clientes: ' + error.message, 'error');
            }
        }
    });


    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    fetchClientes(currentPage);
});
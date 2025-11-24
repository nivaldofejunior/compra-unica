document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const navLinks = document.querySelectorAll('.sidebar a');

    // Função para destacar o link ativo
    function setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop();
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPage) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Controle do menu hambúrguer
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Lógica de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminLoggedIn');
            window.location.href = 'admin-login.html';
        });
    }

    // Fecha o menu ao clicar em um item no celular
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });

    // Verifica se o admin está logado
    if (!sessionStorage.getItem('adminLoggedIn')) {
        window.location.href = 'admin-login.html';
    }

    // Define o link ativo ao carregar a página
    setActiveLink();
});
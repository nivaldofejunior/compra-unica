// Função geral para aplicar máscara
export function aplicarMascara(input, func) {
    input.addEventListener("input", () => {
        input.value = func(input.value);
    });
}

// CPF: xxx.xxx.xxx-xx
export function mascaraCPF(v) {
    v = v.replace(/\D/g, ""); 
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{2})$/, "$1-$2");
    return v;
}

// Celular com DDD: (xx) xxxxx-xxxx
export function mascaraCelular(v) {
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{2})(\d)/, "($1) $2");
    v = v.replace(/(\d{5})(\d)/, "$1-$2");
    return v;
}

// Data de nascimento: dd/mm/yyyy
export function mascaraData(v) {
    v = v.replace(/\D/g, "");
    v = v.replace(/(\d{2})(\d)/, "$1/$2");
    v = v.replace(/(\d{2})(\d)/, "$1/$2");
    v = v.replace(/(\d{4})\d+$/, "$1"); // impede ultrapassar yyyy
    return v;
}
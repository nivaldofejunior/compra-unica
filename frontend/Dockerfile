# Etapa 1: Usar uma imagem oficial do Nginx como base
FROM nginx:alpine

# Etapa 2: Copiar os arquivos estáticos do frontend para o diretório padrão do Nginx
COPY . /usr/share/nginx/html

# Expor a porta 80 para permitir o tráfego HTTP para o container
EXPOSE 80
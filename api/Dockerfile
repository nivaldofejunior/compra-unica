# Usar uma imagem oficial do Python como imagem base
FROM python:3.12-slim

# Definir o diretório de trabalho no container
WORKDIR /app

# Copiar o arquivo de dependências e instalar as dependências
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copiar o restante do código da aplicação para o diretório de trabalho
COPY . .

# Expor a porta em que o aplicativo é executado
EXPOSE 8000

# Comando para executar a aplicação quando o container iniciar
# Garante que o uvicorn estará acessível de fora do container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
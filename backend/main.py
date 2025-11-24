from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm # Importa para o formulário de login
import qrcode
import io
import uuid # Adiciona a importação do módulo uuid
from datetime import datetime
import pytz

from . import models, schemas, crud
from .database import engine, get_db

# Cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    config = crud.get_configuracao(db)
    if not config:
        # Define uma senha padrão forte para a primeira inicialização
        # O usuário deve alterá-la na página de administração o mais rápido possível
        # Truncando a senha para <= 72 bytes para compatibilidade com bcrypt
        default_admin_password = "admin123"[:72]
        crud.create_initial_configuracao(db, default_password=default_admin_password)
    db.close()

# Configuração do CORS
origins = ["*"] # Permite todas as origens

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rotas da API ---

@app.get("/configuracao/", response_model=schemas.Configuracao)
def get_current_configuracao(db: Session = Depends(get_db)):
    config = crud.get_configuracao(db)
    if config is None:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return config

@app.put("/configuracao/{config_id}", response_model=schemas.Configuracao)
def update_current_configuracao(config_id: uuid.UUID, config: schemas.ConfiguracaoUpdate, db: Session = Depends(get_db)):
    db_config = crud.update_configuracao(db, config_id=config_id, config=config)
    if db_config is None:
        raise HTTPException(status_code=404, detail="Configuração não encontrada")
    return db_config

@app.post("/admin/resetar-utilizacao/", status_code=status.HTTP_200_OK)
def resetar_utilizacao(db: Session = Depends(get_db)):
    return crud.resetar_clientes_utilizados(db)

@app.get("/admin/clientes/", response_model=list[schemas.Cliente])
def listar_clientes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    clientes = crud.get_clientes(db, skip=skip, limit=limit)
    return [schemas.Cliente.from_orm(c) for c in clientes]

@app.get("/admin/clientes/total/", response_model=int)
def get_total_clientes(db: Session = Depends(get_db)):
    return crud.get_total_clientes_cadastrados(db)

@app.post("/clientes/")
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    config = crud.get_configuracao(db)
    manaus_tz = pytz.timezone("America/Manaus")

    # Validação da data limite da promoção
    if config and config.data_limite_promocao:
        agora_manaus = datetime.now(manaus_tz)
        
        # Garante que a data do banco de dados tenha fuso horário para comparação
        data_limite_com_tz = config.data_limite_promocao
        if data_limite_com_tz.tzinfo is None:
            data_limite_com_tz = manaus_tz.localize(data_limite_com_tz)

        if agora_manaus > data_limite_com_tz:
            raise HTTPException(status_code=400, detail="As inscrições para esta promoção estão encerradas.")

    db_cliente = crud.get_cliente_by_cpf_or_celular(db, cpf=cliente.cpf, celular=cliente.celular)
    if db_cliente:
        # Se o cliente já existe, retorna o QR Code existente (status 208)
        cliente_dict = schemas.Cliente.from_orm(db_cliente).dict()
        cliente_dict['id'] = str(cliente_dict['id'])
        cliente_dict['data_criacao'] = cliente_dict['data_criacao'].isoformat()
        cliente_dict['data_nascimento'] = cliente_dict['data_nascimento'].isoformat()
        if cliente_dict['data_utilizacao']:
            cliente_dict['data_utilizacao'] = cliente_dict['data_utilizacao'].isoformat()
        return JSONResponse(status_code=208, content=cliente_dict)
    
    # Se o cliente não existe, verifica o limite de cadastros
    if config and crud.get_total_clientes_cadastrados(db) >= config.limite_clientes:
        raise HTTPException(status_code=400, detail="Limite máximo de clientes atingido para esta promoção.")

    # Cria um novo cliente
    novo_cliente = crud.create_cliente(db=db, cliente=cliente)
    cliente_dict = schemas.Cliente.from_orm(novo_cliente).dict()
    cliente_dict['id'] = str(cliente_dict['id'])
    cliente_dict['data_criacao'] = cliente_dict['data_criacao'].isoformat()
    cliente_dict['data_nascimento'] = cliente_dict['data_nascimento'].isoformat()
    return JSONResponse(status_code=201, content=cliente_dict)

@app.post("/admin/login/")
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    config = crud.get_configuracao(db)
    if not config or not crud.verify_password(form_data.password, config.senha_admin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Em um cenário real, você geraria um token JWT aqui
    return {"message": "Login bem-sucedido!"}

@app.get("/promocao-info/")
def get_promocao_info(db: Session = Depends(get_db)):
    config = crud.get_configuracao(db)
    if config:
        return {
            "titulo_promocao": config.titulo_promocao,
            "limite_clientes": config.limite_clientes,
            "data_limite_promocao": config.data_limite_promocao.isoformat() if config.data_limite_promocao else None,
            "clientes_cadastrados": crud.get_total_clientes_cadastrados(db)
        }
    raise HTTPException(status_code=404, detail="Configuração de promoção não encontrada")

@app.get("/qrcode/{qrcode_hash}")
def gerar_qrcode(qrcode_hash: str, db: Session = Depends(get_db)):
    db_cliente = crud.get_cliente_by_qrcode_hash(db, qrcode_hash=qrcode_hash)
    if db_cliente is None:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    img = qrcode.make(qrcode_hash)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/validar/{qrcode_hash}", response_model=schemas.Cliente)
def validar_qrcode(qrcode_hash: str, db: Session = Depends(get_db)):
    db_cliente = crud.get_cliente_by_qrcode_hash(db, qrcode_hash=qrcode_hash)
    if db_cliente is None:
        raise HTTPException(status_code=404, detail="QR Code inválido.")
    
    if db_cliente.utilizado:
        raise HTTPException(status_code=400, detail="Este QR Code já foi utilizado.")
        
    return crud.marcar_qrcode_como_utilizado(db=db, db_cliente=db_cliente)

# --- Montagem de Arquivos Estáticos ---
# Esta deve ser a última parte da configuração do app.
app.mount("/", StaticFiles(directory="frontend", html=True), name="static")
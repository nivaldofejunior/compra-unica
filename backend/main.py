from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
import qrcode
import io

from . import models, schemas, crud
from .database import engine, get_db

# Cria as tabelas no banco de dados
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

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

@app.post("/clientes/")
def criar_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(get_db)):
    db_cliente = crud.get_cliente_by_cpf_or_celular(db, cpf=cliente.cpf, celular=cliente.celular)
    if db_cliente:
        cliente_dict = schemas.Cliente.from_orm(db_cliente).dict()
        cliente_dict['id'] = str(cliente_dict['id'])
        cliente_dict['data_criacao'] = cliente_dict['data_criacao'].isoformat()
        cliente_dict['data_nascimento'] = cliente_dict['data_nascimento'].isoformat()
        if cliente_dict['data_utilizacao']:
            cliente_dict['data_utilizacao'] = cliente_dict['data_utilizacao'].isoformat()
        return JSONResponse(status_code=208, content=cliente_dict)
    
    novo_cliente = crud.create_cliente(db=db, cliente=cliente)
    cliente_dict = schemas.Cliente.from_orm(novo_cliente).dict()
    cliente_dict['id'] = str(cliente_dict['id'])
    cliente_dict['data_criacao'] = cliente_dict['data_criacao'].isoformat()
    cliente_dict['data_nascimento'] = cliente_dict['data_nascimento'].isoformat()
    return JSONResponse(status_code=201, content=cliente_dict)

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
from sqlalchemy.orm import Session
import models, schemas
import hashlib
import uuid
from datetime import datetime, timedelta
from sqlalchemy import func, or_
from passlib.context import CryptContext
import pytz

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_cliente_by_cpf_or_celular(db: Session, cpf: str, celular: str):
    return db.query(models.Cliente).filter(
        (models.Cliente.cpf == cpf) | (models.Cliente.celular == celular)
    ).first()

def create_cliente(db: Session, cliente: schemas.ClienteCreate):
    # Gera um hash único para o QR Code a partir do CPF e de um salt
    salt = uuid.uuid4().hex
    qrcode_content = f"{cliente.cpf}-{salt}"
    qrcode_hash = hashlib.sha256(qrcode_content.encode()).hexdigest()

    db_cliente = models.Cliente(
        nome=cliente.nome,
        cpf=cliente.cpf,
        celular=cliente.celular,
        data_nascimento=cliente.data_nascimento,
        qrcode_hash=qrcode_hash
    )
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def get_cliente_by_qrcode_hash(db: Session, qrcode_hash: str):
    return db.query(models.Cliente).filter(models.Cliente.qrcode_hash == qrcode_hash).first()

def marcar_qrcode_como_utilizado(db: Session, db_cliente: models.Cliente):
    manaus_tz = pytz.timezone("America/Manaus")
    db_cliente.utilizado = True
    db_cliente.data_utilizacao = datetime.now(manaus_tz)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def get_configuracao(db: Session):
    return db.query(models.Configuracao).first()

def create_initial_configuracao(db: Session, default_password: str):
    # Cria uma configuração padrão com uma senha hash
    db_config = models.Configuracao(
        senha_admin_hash=get_password_hash(default_password)
    )
def create_initial_configuracao(db: Session, default_password: str):
    manaus_tz = pytz.timezone("America/Manaus")
    db_config = models.Configuracao(
        senha_admin_hash=get_password_hash(default_password),
        data_limite_promocao=datetime.now(manaus_tz) + timedelta(days=30), # Define um limite padrão de 30 dias
        data_ultima_atualizacao=datetime.now(manaus_tz)
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

def update_configuracao(db: Session, config_id: uuid.UUID, config: schemas.ConfiguracaoUpdate):
    manaus_tz = pytz.timezone("America/Manaus")
    db_config = db.query(models.Configuracao).filter(models.Configuracao.id == config_id).first()
    if db_config:
        for key, value in config.dict(exclude_unset=True).items():
            if key == "senha_admin" and value:
                db_config.senha_admin_hash = get_password_hash(value)
            elif key == "data_limite_promocao" and value:
                # Garante que a data seja armazenada com o fuso horário de Manaus
                if isinstance(value, datetime):
                    db_config.data_limite_promocao = manaus_tz.localize(value) if value.tzinfo is None else value.astimezone(manaus_tz)
                else: # Se o valor vem como string (ex: de um formulário), converter para datetime e localizar
                    db_config.data_limite_promocao = manaus_tz.localize(datetime.strptime(value, '%Y-%m-%dT%H:%M:%S%z')) # Exemplo de formato, ajustar se necessário
            elif key != "senha_admin":
                setattr(db_config, key, value)
        db_config.data_ultima_atualizacao = datetime.now(manaus_tz)
        db.commit()
        db.refresh(db_config)
    return db_config


def resetar_clientes_utilizados(db: Session):
    # Atualiza todos os clientes, setando 'utilizado' para False e 'data_utilizacao' para NULL
    db.query(models.Cliente).update({
        models.Cliente.utilizado: False,
        models.Cliente.data_utilizacao: None
    }, synchronize_session=False)
    db.commit()
    return {"message": "Status de utilização de todos os clientes resetado com sucesso."}

def get_total_clientes_cadastrados(db: Session):
    return db.query(models.Cliente).count()

def get_clientes(db: Session, skip: int = 0, limit: int = 100, search: str = ""):
    query = db.query(models.Cliente)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Cliente.nome.ilike(search_term),
                models.Cliente.cpf.ilike(search_term)
            )
        )
    return query.offset(skip).limit(limit).all()
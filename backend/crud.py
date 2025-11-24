from sqlalchemy.orm import Session
from . import models, schemas
import hashlib
import uuid

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
    from datetime import datetime
    db_cliente.utilizado = True
    db_cliente.data_utilizacao = datetime.utcnow()
    db.commit()
    db.refresh(db_cliente)
    return db_cliente
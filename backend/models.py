from sqlalchemy import Column, String, Boolean, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from .database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String, index=True)
    cpf = Column(String, unique=True, index=True)
    celular = Column(String, unique=True, index=True)
    data_nascimento = Column(Date)
    qrcode_hash = Column(String, unique=True, index=True) # Armazena um hash ou ID único para o QR Code
    utilizado = Column(Boolean, default=False)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_utilizacao = Column(DateTime, nullable=True)
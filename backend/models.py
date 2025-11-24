from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from .database import Base
import secrets # Adiciona a importação de secrets
from passlib.context import CryptContext # Para hash de senha
import pytz # Importa a biblioteca pytz

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nome = Column(String, index=True)
    cpf = Column(String, unique=True, index=True)
    celular = Column(String, unique=True, index=True)
    data_nascimento = Column(Date)
    qrcode_hash = Column(String, unique=True, index=True) # Armazena um hash ou ID único para o QR Code
    utilizado = Column(Boolean, default=False)
    data_criacao = Column(DateTime, default=lambda: datetime.now(pytz.timezone("America/Manaus")))
    data_utilizacao = Column(DateTime, nullable=True)

class Configuracao(Base):
    __tablename__ = "configuracoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    titulo_promocao = Column(String, default="Promoção Pizza por R$ 0,25")
    limite_clientes = Column(Integer, default=100)
    senha_admin_hash = Column(String, unique=True) # Hash da senha de admin
    data_limite_promocao = Column(DateTime, default=lambda: datetime.now(pytz.timezone("America/Manaus")), nullable=True) # Nova coluna para data limite da promoção
    data_ultima_atualizacao = Column(DateTime, default=datetime.utcnow)
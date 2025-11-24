from pydantic import BaseModel
from datetime import date, datetime
import uuid

from pydantic import BaseModel, Field, validator
from datetime import date, timedelta

import re

class ClienteBase(BaseModel):
    nome: str
    cpf: str
    celular: str
    data_nascimento: date

    @validator('data_nascimento')
    def validar_idade_minima(cls, v):
        idade_minima = 15
        hoje = date.today()
        data_limite = hoje - timedelta(days=idade_minima * 365.25)
        if v > data_limite:
            raise ValueError(f'A data de nascimento deve ser de no mínimo {idade_minima} anos atrás.')
        return v

    @validator('cpf')
    def validar_formato_cpf(cls, v):
        # Remove caracteres não numéricos
        cpf_numeros = re.sub(r'\D', '', v)
        if not re.match(r'^\d{11}$', cpf_numeros):
            raise ValueError('CPF deve conter 11 dígitos numéricos.')

        # Validação de dígitos verificadores
        if len(cpf_numeros) != 11 or len(set(cpf_numeros)) == 1:
            raise ValueError('CPF inválido.')

        def calcular_digito(slice_cpf):
            soma = 0
            for i, digito in enumerate(slice_cpf):
                soma += int(digito) * (len(slice_cpf) + 1 - i)
            resto = soma % 11
            return 0 if resto < 2 else 11 - resto

        primeiro_digito = calcular_digito(cpf_numeros[:9])
        if primeiro_digito != int(cpf_numeros[9]):
            raise ValueError('CPF inválido.')

        segundo_digito = calcular_digito(cpf_numeros[:10])
        if segundo_digito != int(cpf_numeros[10]):
            raise ValueError('CPF inválido.')
            
        return cpf_numeros

class ClienteCreate(ClienteBase):
    pass

class Cliente(ClienteBase):
    id: uuid.UUID
    qrcode_hash: str
    utilizado: bool
    data_criacao: datetime
    data_utilizacao: datetime | None = None

    class Config:
        from_attributes = True
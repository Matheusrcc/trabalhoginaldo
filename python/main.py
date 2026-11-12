
from time import perf_counter

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from algoritmos import (
    troco_forca_bruta,
    algoritmo_guloso,
    troco_dinamico,
    knapsack,
    knapsack_items
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TrocoRequest(BaseModel):
    valor: int = Field(ge=0)
    moedas: list[int]


class ItemRequest(BaseModel):
    nome: str = Field(min_length=1)
    peso: int = Field(gt=0)
    valor: int = Field(ge=0)


class MochilaRequest(BaseModel):
    capacidade: int = Field(ge=0)
    itens: list[ItemRequest]


@app.get("/")
def inicio():
    return {"mensagem": "API funcionando!"}


@app.get("/api/health")
def verificar_api():
    return {"status": "online"}


@app.post("/api/troco")
def calcular_troco(dados: TrocoRequest):
    algoritmos = {
        "forca_bruta": troco_forca_bruta,
        "guloso": algoritmo_guloso,
        "programacao_dinamica": troco_dinamico
    }

    resultados = {}

    try:
        for nome, funcao in algoritmos.items():
            inicio_execucao = perf_counter()

            moedas_usadas = funcao(dados.valor, dados.moedas)

            fim_execucao = perf_counter()

            resultados[nome] = {
                "solucao": moedas_usadas is not None,
                "quantidade_moedas": (
                    len(moedas_usadas)
                    if moedas_usadas is not None
                    else 0
                ),
                "moedas_usadas": (
                    moedas_usadas
                    if moedas_usadas is not None
                    else []
                ),
                "tempo_ms": (fim_execucao - inicio_execucao) * 1000
            }

    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))

    return {
        "valor": dados.valor,
        "resultados": resultados
    }


@app.post("/api/mochila")
def calcular_mochila(dados: MochilaRequest):
    pesos = [item.peso for item in dados.itens]
    valores = [item.valor for item in dados.itens]

    try:
        valor_maximo = knapsack(
            dados.capacidade,
            pesos,
            valores
        )

        indices_selecionados = knapsack_items(
            dados.capacidade,
            pesos,
            valores
        )

    except ValueError as erro:
        raise HTTPException(status_code=400, detail=str(erro))

    itens_selecionados = [
        dados.itens[i].model_dump()
        for i in indices_selecionados
    ]

    itens_nao_selecionados = [
        item.model_dump()
        for i, item in enumerate(dados.itens)
        if i not in indices_selecionados
    ]

    peso_total = sum(
        dados.itens[i].peso
        for i in indices_selecionados
    )

    return {
        "valor_maximo": valor_maximo,
        "peso_total": peso_total,
        "capacidade_restante": dados.capacidade - peso_total,
        "itens_selecionados": itens_selecionados,
        "itens_nao_selecionados": itens_nao_selecionados
    }

def validar_moedas(valor, moedas):
    if valor < 0:
        raise ValueError("O valor não pode ser negativo.")

    if not moedas:
        raise ValueError("Informe pelo menos uma moeda.")

    if any(not isinstance(m, int) or m <= 0 for m in moedas):
        raise ValueError("As moedas devem ser inteiros positivos.")

    return sorted(set(moedas), reverse=True)


def troco_forca_bruta(valor, moedas):
    moedas = validar_moedas(valor, moedas)

    if valor == 0:
        return []

    melhor_solucao = None
    solucao_gulosa = algoritmo_guloso(valor, moedas)

    if solucao_gulosa is not None:
        melhor_solucao = solucao_gulosa[:]

    def buscar(indice, restante, solucao_atual):
        nonlocal melhor_solucao

        if restante == 0:
            if (
                melhor_solucao is None
                or len(solucao_atual) < len(melhor_solucao)
            ):
                melhor_solucao = solucao_atual[:]
            return

        if indice >= len(moedas):
            return

        if (
            melhor_solucao is not None
            and len(solucao_atual) >= len(melhor_solucao)
        ):
            return

        moeda = moedas[indice]
        quantidade_maxima = restante // moeda

        for quantidade in range(quantidade_maxima, -1, -1):
            nova_quantidade = len(solucao_atual) + quantidade

            if (
                melhor_solucao is not None
                and nova_quantidade >= len(melhor_solucao)
                and restante - quantidade * moeda != 0
            ):
                continue

            novas_moedas = solucao_atual + [moeda] * quantidade

            buscar(
                indice + 1,
                restante - quantidade * moeda,
                novas_moedas
            )

    buscar(0, valor, [])

    return melhor_solucao


def algoritmo_guloso(valor, moedas):
    moedas = validar_moedas(valor, moedas)

    if valor == 0:
        return []

    restante = valor
    moedas_usadas = []

    for moeda in moedas:
        quantidade = restante // moeda

        if quantidade > 0:
            moedas_usadas.extend([moeda] * quantidade)
            restante -= moeda * quantidade

    if restante != 0:
        return None

    return moedas_usadas


def troco_dinamico(valor, moedas):
    moedas = validar_moedas(valor, moedas)

    if valor == 0:
        return []

    dp = [float("inf")] * (valor + 1)
    ultima_moeda = [None] * (valor + 1)

    dp[0] = 0

    for quantia in range(1, valor + 1):
        for moeda in moedas:
            if moeda <= quantia:
                candidato = dp[quantia - moeda] + 1

                if candidato < dp[quantia]:
                    dp[quantia] = candidato
                    ultima_moeda[quantia] = moeda

    if dp[valor] == float("inf"):
        return None

    moedas_usadas = []
    restante = valor

    while restante > 0:
        moeda = ultima_moeda[restante]
        moedas_usadas.append(moeda)
        restante -= moeda

    return moedas_usadas


def validar_mochila(capacity, weights, values):
    if capacity < 0:
        raise ValueError("A capacidade não pode ser negativa.")

    if len(weights) != len(values):
        raise ValueError(
            "A quantidade de pesos deve ser igual à quantidade de valores."
        )

    if any(w <= 0 for w in weights):
        raise ValueError("Os pesos devem ser positivos.")

    if any(v < 0 for v in values):
        raise ValueError("Os valores não podem ser negativos.")


def construir_tabela(capacity, weights, values):
    validar_mochila(capacity, weights, values)

    n = len(weights)

    dp = [
        [0] * (capacity + 1)
        for _ in range(n + 1)
    ]

    for i in range(1, n + 1):
        peso = weights[i - 1]
        valor = values[i - 1]

        for capacidade in range(capacity + 1):
            dp[i][capacidade] = dp[i - 1][capacidade]

            if peso <= capacidade:
                candidato = (
                    dp[i - 1][capacidade - peso] + valor
                )

                dp[i][capacidade] = max(
                    dp[i][capacidade],
                    candidato
                )

    return dp
        
def knapsack(capacity, weights, values):
    dp = construir_tabela(capacity, weights, values)

    return dp[len(weights)][capacity]


def knapsack_items(capacity, weights, values):
    dp = construir_tabela(capacity, weights, values)

    selecionados = []
    capacidade_atual = capacity

    for i in range(len(weights), 0, -1):
        if dp[i][capacidade_atual] != dp[i - 1][capacidade_atual]:
            selecionados.append(i - 1)
            capacidade_atual -= weights[i - 1]

    selecionados.reverse()

    return selecionados

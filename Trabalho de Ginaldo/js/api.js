/**
 * api.js — única camada de comunicação com o back-end Python.
 * Nenhum algoritmo é calculado aqui: apenas requisições HTTP (Fetch API).
 */

// ===== CONFIGURAÇÃO (altere somente aqui) =====
const API_CONFIG = {
  BASE_URL: "http://127.0.0.1:8000", // URL do back-end (FastAPI/Flask)
  TIMEOUT_MS: 30000,                  // força bruta pode demorar
};

class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

async function request(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_CONFIG.TIMEOUT_MS);
  try {
    const res = await fetch(API_CONFIG.BASE_URL + path, {
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      ...options,
    });
    let data = null;
    try { data = await res.json(); } catch { /* resposta sem JSON */ }
    if (!res.ok) throw new ApiError(extractMessage(data, res.status), res.status);
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") throw new ApiError("O back-end demorou demais para responder.");
    throw new ApiError("Não foi possível conectar ao back-end. Verifique se o servidor Python está em execução e se o CORS está habilitado.");
  } finally {
    clearTimeout(timer);
  }
}

// Aceita {"erro": "..."} (Flask) e {"detail": "..." | [{msg}]} (FastAPI)
function extractMessage(data, status) {
  const d = data && (data.erro || data.detail);
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(e => e.msg).join("; ");
  return `Erro ${status} no back-end.`;
}

const Api = {
  health:  ()                       => request("/api/health"),
  troco:   (valor, moedas)          => request("/api/troco",   { method: "POST", body: JSON.stringify({ valor, moedas }) }),
  mochila: (capacidade, itens)      => request("/api/mochila", { method: "POST", body: JSON.stringify({ capacidade, itens }) }),
};

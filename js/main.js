/** main.js — interface: formulários, validações e renderização. Sem algoritmos. */
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const MAX_TROCO = 1000; // limite de segurança (força bruta é custosa)

/* ---------- Navegação ---------- */
function navigate() {
  const id = ["inicio", "troco", "mochila"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "inicio";
  document.querySelectorAll(".view").forEach(v => v.hidden = v.id !== id);
  document.querySelectorAll("[data-nav]").forEach(a => a.classList.toggle("active", a.dataset.nav === id));
}
window.addEventListener("hashchange", navigate);

/* ---------- Utilidades de UI ---------- */
function setBusy(btn, loadingEl, busy) {
  btn.disabled = busy;
  loadingEl.hidden = !busy;
}
function showError(el, msg) { el.textContent = msg; el.hidden = !msg; }
const fmtTempo = (ms) => ms == null ? "—" : ms < 1 ? "<1 ms" : `${ms.toFixed(ms < 10 ? 2 : 0)} ms`;
const agrupar = (lista) => lista.reduce((m, c) => (m[c] = (m[c] || 0) + 1, m), {});

/* ---------- Troco ---------- */
const ALGOS = [
  ["forca_bruta", "Força bruta"],
  ["guloso", "Guloso"],
  ["programacao_dinamica", "Programação dinâmica"],
];

function lerMoedas(texto) {
  const partes = texto.split(/[,;\s]+/).filter(Boolean).map(Number);
  if (!partes.length || partes.some(n => !Number.isInteger(n) || n <= 0)) return null;
  return [...new Set(partes)].sort((a, b) => b - a);
}

$("#form-troco").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erro = $("#troco-erro"); showError(erro, "");
  const valor = Number($("#troco-valor").value);
  const moedas = lerMoedas($("#troco-moedas").value);
  if (!Number.isInteger(valor) || valor <= 0) return showError(erro, "Informe um valor inteiro maior que zero.");
  if (valor > MAX_TROCO) return showError(erro, `Use um valor de até ${MAX_TROCO} centavos para a força bruta terminar em tempo razoável.`);
  if (!moedas) return showError(erro, "Informe moedas como números inteiros positivos, separados por vírgula.");

  const btn = $("#btn-troco"); $("#troco-resultado").hidden = true;
  setBusy(btn, $("#troco-loading"), true);
  try {
    renderTroco(await Api.troco(valor, moedas), moedas);
  } catch (err) { showError(erro, err.message); }
  finally { setBusy(btn, $("#troco-loading"), false); }
});

$("#btn-troco-exemplo").addEventListener("click", () => {
  $("#troco-valor").value = 6;
  $("#troco-moedas").value = "4, 3, 1";
  $("#form-troco").requestSubmit();
});

function renderTroco(data) {
  const r = data.resultados;
  const validos = ALGOS.map(([k]) => r[k]).filter(x => x && x.solucao !== false);
  const melhor = validos.length ? Math.min(...validos.map(x => x.quantidade_moedas)) : null;

  $("#troco-cards").innerHTML = ALGOS.map(([k, nome]) => {
    const x = r[k];
    if (!x || x.solucao === false) {
      return `<article class="card algo"><h2>${nome} <span class="badge err">Sem solução</span></h2><p class="meta">Não foi possível formar o valor com essas moedas.</p></article>`;
    }
    const dif = x.quantidade_moedas - melhor;
    const badge = dif === 0 ? `<span class="badge ok">Ótimo</span>` : `<span class="badge warn">+${dif} acima do ótimo</span>`;
    const chips = Object.entries(agrupar(x.moedas_usadas)).sort((a, b) => b[0] - a[0])
      .map(([m, q]) => `<span class="chip">${q} × ${m}</span>`).join("");
    return `<article class="card algo ${dif === 0 ? "best" : "worse"}">
      <h2>${nome} ${badge}</h2>
      <p class="big">${x.quantidade_moedas} <small>moedas</small></p>
      <div class="chips">${chips}</div>
      <p class="meta">${x.moedas_usadas.join(" + ")} = ${data.valor}</p></article>`;
  }).join("");

  $("#troco-tabela").innerHTML = ALGOS.map(([k, nome]) => {
    const x = r[k]; const ok = x && x.solucao !== false;
    return `<tr><td>${nome}</td><td class="num">${ok ? x.moedas_usadas.join(" + ") : "—"}</td>
      <td class="num">${ok ? x.quantidade_moedas : "—"}</td><td class="num">${fmtTempo(x && x.tempo_ms)}</td></tr>`;
  }).join("");

  const g = r.guloso, pd = r.programacao_dinamica;
  const aviso = $("#troco-aviso");
  if (g && pd && g.solucao !== false && pd.solucao !== false) {
    const sub = g.quantidade_moedas > pd.quantidade_moedas;
    aviso.className = "notice" + (sub ? "" : " good");
    aviso.textContent = sub
      ? `Neste caso o guloso não encontrou a solução ótima: usou ${g.quantidade_moedas} moedas e o ótimo é ${pd.quantidade_moedas}.`
      : "Neste caso o guloso encontrou a solução ótima.";
    aviso.hidden = false;
  } else aviso.hidden = true;
  $("#troco-resultado").hidden = false;
}

/* ---------- Mochila 0/1 ---------- */
let itens = [];

function renderItens() {
  $("#qtd-itens").textContent = itens.length;
  $("#itens-vazio").hidden = itens.length > 0;
  $("#lista-itens").innerHTML = itens.map((it, i) =>
    `<tr><td>${esc(it.nome)}</td><td class="num">${it.peso}</td><td class="num">${it.valor}</td>
     <td><button type="button" class="icon-btn" data-remove="${i}" aria-label="Remover ${esc(it.nome)}">Remover</button></td></tr>`).join("");
}

$("#form-item").addEventListener("submit", (e) => {
  e.preventDefault();
  const erro = $("#item-erro");
  const nome = $("#item-nome").value.trim();
  const peso = Number($("#item-peso").value), valor = Number($("#item-valor").value);
  if (!nome) return showError(erro, "Informe o nome do item.");
  if (!Number.isInteger(peso) || peso <= 0) return showError(erro, "O peso deve ser um inteiro maior que zero.");
  if (!Number.isInteger(valor) || valor < 0) return showError(erro, "O valor deve ser um inteiro maior ou igual a zero.");
  if (itens.some(i => i.nome.toLowerCase() === nome.toLowerCase())) return showError(erro, "Já existe um item com esse nome.");
  showError(erro, "");
  itens.push({ nome, peso, valor });
  e.target.reset(); $("#item-nome").focus();
  renderItens();
});

$("#lista-itens").addEventListener("click", (e) => {
  const b = e.target.closest("[data-remove]");
  if (b) { itens.splice(Number(b.dataset.remove), 1); renderItens(); }
});
$("#btn-limpar").addEventListener("click", () => { itens = []; renderItens(); $("#mochila-resultado").hidden = true; });
$("#btn-mochila-exemplo").addEventListener("click", () => {
  $("#mochila-cap").value = 10;
  itens = [{nome:"Notebook",peso:4,valor:10},{nome:"Câmera",peso:3,valor:7},{nome:"Livro",peso:2,valor:4},
           {nome:"Tablet",peso:5,valor:8},{nome:"Fone",peso:1,valor:3}];
  renderItens();
});

$("#btn-mochila").addEventListener("click", async () => {
  const erro = $("#mochila-erro"); showError(erro, "");
  const capacidade = Number($("#mochila-cap").value);
  if (!Number.isInteger(capacidade) || capacidade <= 0) return showError(erro, "A capacidade deve ser um inteiro maior que zero.");
  if (!itens.length) return showError(erro, "Adicione pelo menos um item.");

  const btn = $("#btn-mochila"); $("#mochila-resultado").hidden = true;
  setBusy(btn, $("#mochila-loading"), true);
  try {
    renderMochila(await Api.mochila(capacidade, itens), capacidade);
  } catch (err) { showError(erro, err.message); }
  finally { setBusy(btn, $("#mochila-loading"), false); }
});

function renderMochila(d, capacidade) {
  const stat = (n, t) => `<div class="card stat"><p class="big">${n}</p><p>${t}</p></div>`;
  $("#mochila-indicadores").innerHTML =
    stat(d.valor_maximo, "Valor máximo obtido") + stat(d.peso_total, "Peso total dos itens") + stat(d.capacidade_restante, "Capacidade restante");
  const pct = Math.min(100, (d.peso_total / capacidade) * 100);
  $("#mochila-barra").style.width = pct + "%";
  $("#mochila-barra-texto").textContent = `${d.peso_total} de ${capacidade} de capacidade usada (${pct.toFixed(0)}%)`;
  const li = (it) => `<li><span>${esc(it.nome)}</span><span class="detail">peso ${it.peso} · valor ${it.valor}</span></li>`;
  $("#lista-sel").innerHTML = d.itens_selecionados.length ? d.itens_selecionados.map(li).join("") : "<li>Nenhum item cabe na mochila.</li>";
  $("#lista-fora").innerHTML = d.itens_nao_selecionados.length ? d.itens_nao_selecionados.map(li).join("") : "<li>Todos os itens foram selecionados.</li>";
  $("#mochila-resultado").hidden = false;
}

/* ---------- Inicialização ---------- */
navigate();
renderItens();
Api.health()
  .then(() => { const s = $("#api-status"); s.textContent = "Back-end conectado."; s.className = "api-status ok"; })
  .catch(() => { const s = $("#api-status"); s.textContent = "Back-end indisponível. Inicie o servidor Python e confira a URL em js/api.js."; s.className = "api-status fail"; });

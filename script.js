const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

const mapaConversas = new Map();
let conversaAtualId = null;
let contadorConversas = 0;

function toggleSidebar() {
    document.body.classList.toggle('sidebar-closed');
    const btnOpen = document.getElementById('btn-open-sidebar');
    
    if (document.body.classList.contains('sidebar-closed')) {
        btnOpen.classList.remove('d-none');
    } else {
        btnOpen.classList.add('d-none');
    }
}

function adicionarBalaoMensagem(texto, remetente) {
    const chatHistory = document.getElementById("chat-history");
    
    if (chatHistory.querySelector('.text-center.text-muted')) {
        chatHistory.innerHTML = "";
    }

    const divBalao = document.createElement("div");
    divBalao.classList.add("balao-mensagem");
    
    if (remetente === "usuario") {
        divBalao.classList.add("mensagem-usuario");
        divBalao.textContent = texto;
    } else {
        divBalao.classList.add("mensagem-ia");
        divBalao.innerHTML = typeof marked !== "undefined" ? marked.parse(texto) : texto;
    }
    
    chatHistory.appendChild(divBalao);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function renderizarMensagensDaConversa(id) {
    const chatHistory = document.getElementById("chat-history");
    const conversa = mapaConversas.get(id);

    if (!conversa || conversa.mensagens.length === 0) {
        chatHistory.innerHTML = `<div class="text-center text-muted mt-5">Comece uma nova conversa!</div>`;
        return;
    }

    chatHistory.innerHTML = "";
    conversa.mensagens.forEach((msg) => {
        const tipoRemetente = msg.role === "user" ? "usuario" : "ia";
        adicionarBalaoMensagem(msg.content, tipoRemetente);
    });
}

function selecionarConversa(id) {
    if (!mapaConversas.has(id)) return;

    conversaAtualId = id;

    document.querySelectorAll("#lista-conversas .item-conversa").forEach((item) => {
        item.classList.toggle("conversa-ativa", item.id === id);
    });

    const tituloTopo = document.querySelector("#main-content h5");
    if (tituloTopo) {
        tituloTopo.textContent = mapaConversas.get(id).titulo;
    }

    renderizarMensagensDaConversa(id);
}

function novaConversa() {
    contadorConversas++;
    const idConversa = `conversa-${contadorConversas}`;
    const tituloInicial = `Conversa ${contadorConversas}`;

    mapaConversas.set(idConversa, {
        titulo: tituloInicial,
        mensagens: []
    });

    const lista = document.getElementById("lista-conversas");
    const li = document.createElement("li");
    li.classList.add(
        "list-group-item",
        "item-conversa",
        "d-flex",
        "justify-content-between",
        "align-items-center"
    );
    li.id = idConversa;

    li.onclick = () => selecionarConversa(idConversa);

    li.innerHTML = `
        <span class="nome-conversa text-truncate me-2">${tituloInicial}</span>
        <div class="dropdown dropend" onclick="event.stopPropagation()">
            <button class="btn btn-sm btn-opcoes-conversa rounded-circle" 
                    type="button" 
                    data-bs-toggle="dropdown" 
                    data-bs-popper-config='{"strategy":"fixed"}' 
                    aria-expanded="false"
                    title="Mais opções">
                <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-dark menu-gemini shadow">
                <li>
                    <button class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger-emphasis" 
                            type="button" 
                            onclick="abrirModalRenomear('${idConversa}')">
                        <i class="bi bi-pencil"></i>
                        <span>Renomear</span>
                    </button>
                </li>
                <li>
                    <button class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger-emphasis" 
                            type="button" 
                            onclick="abrirModalExcluir('${idConversa}')">
                        <i class="bi bi-trash3"></i>
                        <span>Excluir</span>
                    </button>
                </li>
            </ul>
        </div>
    `;

    lista.prepend(li);
    selecionarConversa(idConversa);
}

async function lidarComEnvio() {
    const apiKey = document.getElementById("apiKeyInput").value.trim();
    const textarea = document.getElementById("userInput");
    const mensagem = textarea.value.trim();

    if (!mensagem) return;
    if (!apiKey) {
        alert("Por favor, insira sua chave da API no menu lateral.");
        return;
    }

    if (!conversaAtualId || !mapaConversas.has(conversaAtualId)) {
        novaConversa();
    }

    const conversaAtual = mapaConversas.get(conversaAtualId);

    adicionarBalaoMensagem(mensagem, "usuario");
    textarea.value = "";

    conversaAtual.mensagens.push({
        role: "user",
        content: mensagem
    });

    document.getElementById("loading-indicator").classList.remove("d-none");

    try {
        const respostaIA = await buscarRespostaDaAPI(apiKey, conversaAtual.mensagens);
        adicionarBalaoMensagem(respostaIA, "ia");
        conversaAtual.mensagens.push({
            role: "assistant",
            content: respostaIA
        });
    } catch (erro) {
        conversaAtual.mensagens.pop();
        adicionarBalaoMensagem(
            `Desculpe, ocorreu um erro: ${erro.message}`,
            "ia"
        );
    } finally {
        document.getElementById("loading-indicator").classList.add("d-none");
    }
}

async function buscarRespostaDaAPI(apiKey, historicoMensagens) {
    const resposta = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: MODEL,
            messages: historicoMensagens
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        const detalheErro = dados?.error?.message || `Status ${resposta.status}`;
        console.error("Erro detalhado da Groq:", dados);
        throw new Error(detalheErro);
    }

    return dados.choices[0].message.content;
}

function abrirModalRenomear(id) {
    const conversa = mapaConversas.get(id);
    if (!conversa) return;

    document.getElementById("idConversaRenomear").value = id;
    const inputNovoNome = document.getElementById("inputNovoNome");
    inputNovoNome.value = conversa.titulo;

    const modalEl = document.getElementById("modalRenomear");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();

    modalEl.addEventListener("shown.bs.modal", () => {
        inputNovoNome.focus();
        inputNovoNome.select();
    }, { once: true });
}

function salvarNovoNome() {
    const id = document.getElementById("idConversaRenomear").value;
    const inputNovoNome = document.getElementById("inputNovoNome");
    const novoTitulo = inputNovoNome.value.trim();

    if (!novoTitulo || !mapaConversas.has(id)) return;

    const conversa = mapaConversas.get(id);
    conversa.titulo = novoTitulo;

    const itemLi = document.getElementById(id);
    if (itemLi) {
        itemLi.querySelector(".nome-conversa").textContent = novoTitulo;
    }

    if (conversaAtualId === id) {
        const tituloTopo = document.querySelector("#main-content h5");
        if (tituloTopo) tituloTopo.textContent = novoTitulo;
    }

    const modalEl = document.getElementById("modalRenomear");
    bootstrap.Modal.getInstance(modalEl)?.hide();
}

function abrirModalExcluir(id) {
    if (!mapaConversas.has(id)) return;

    document.getElementById("idConversaExcluir").value = id;
    const modalEl = document.getElementById("modalExcluir");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

function confirmarExclusao() {
    const id = document.getElementById("idConversaExcluir").value;

    if (!mapaConversas.has(id)) return;

    mapaConversas.delete(id);
    document.getElementById(id)?.remove();

    if (conversaAtualId === id) {
        const idsRestantes = Array.from(mapaConversas.keys());
        if (idsRestantes.length > 0) {
            const ultimaCriada = idsRestantes[idsRestantes.length - 1];
            selecionarConversa(ultimaCriada);
        } else {
            conversaAtualId = null;
            document.getElementById("chat-history").innerHTML = `<div class="text-center text-muted mt-5">Comece uma nova conversa!</div>`;
            const tituloTopo = document.querySelector("#main-content h5");
            if (tituloTopo) tituloTopo.textContent = "Conversa Atual";
        }
    }

    const modalEl = document.getElementById("modalExcluir");
    bootstrap.Modal.getInstance(modalEl)?.hide();
}

document.addEventListener("DOMContentLoaded", () => {
    const inputNovoNome = document.getElementById("inputNovoNome");
    if (inputNovoNome) {
        inputNovoNome.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                salvarNovoNome();
            }
        });
    }

    const userInput = document.getElementById("userInput");
    if (userInput) {
        userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                lidarComEnvio();
            }
        });
    }
});
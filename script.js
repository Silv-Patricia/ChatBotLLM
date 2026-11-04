const API_URL = "URL_DA_API";
const API_KEY = document.getElementById("key");
const MODEL = "NOME_DO_MODELO";
async function enviarMensagem(mensagem) {
    try {
        const resposta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,

                messages: [
                    {
                        role: "user",
                        content: mensagem
                    }
                ]
            })
        });
        if (!resposta.ok) {
            throw new Error("Erro na comunicação com a API");
        }
        const dados = await resposta.json();
        return dados.choices[0].message.content;
    } catch (erro) {
        console.error("Erro:", erro);
        return "Não foi possível obter uma resposta.";
    }
}
/* ============================================================
   Preços Base · Dicomp — estilo do portal
   Cor reservada para significado: vermelho só para "a base está
   bloqueando o catálogo" e para erro. Sempre ícone + texto.
   Troque --accent pela cor da Dicomp quando houver.
   ============================================================ */

:root {
  --bg: #F6F7F9;  --surface: #FFFFFF;  --border: #E3E6EB;
  --text: #111827; --text-2: #5B6472; --text-3: #8A93A3;
  --accent: #1F5EFF;   /* placeholder até a identidade da Dicomp */
  --accent-bg: #EEF3FF;
  --danger: #D92D20;  --danger-bg: #FEF3F2; --danger-borda: #FECDCA;
  --success: #067647; --success-bg: #ECFDF3;
  --warning: #B54708; --warning-bg: #FFFAEB; --warning-borda: #FEDF89;
  --info: #175CD3;    --info-bg: #EFF8FF;
  --neutro-bg: #F2F4F7;
  --hover: #FAFBFC;
  --radius: 8px; --row-h: 60px;
  --topo-h: 56px;
  --mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace;
  --sombra: 0 1px 2px rgba(16, 24, 40, .05);
  --sombra-alta: 0 12px 32px rgba(16, 24, 40, .18);
}

*, *::before, *::after { box-sizing: border-box; }

html { scroll-padding-top: calc(var(--topo-h) + 48px); }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 14px/1.45 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
}

button, input, select, textarea { font: inherit; color: inherit; }
button { cursor: pointer; }
[hidden] { display: none !important; }
a { color: var(--accent); }

:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

.icone { width: 16px; height: 16px; flex: none; stroke: currentColor; fill: none; stroke-width: 2;
  stroke-linecap: round; stroke-linejoin: round; vertical-align: -3px; }
.icone.p { width: 14px; height: 14px; vertical-align: -2px; }

.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- topo ---------- */

.topo {
  position: sticky; top: 0; z-index: 30;
  height: var(--topo-h);
  display: flex; align-items: center; gap: 16px;
  padding: 0 24px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.marca { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; white-space: nowrap; }
.marca .logo { width: 26px; height: 26px; border-radius: 7px; background: var(--accent); color: #fff;
  display: grid; place-items: center; }
.marca .logo .icone { width: 15px; height: 15px; }
.marca small { color: var(--text-2); font-weight: 500; }
.dados-de { margin-left: auto; color: var(--text-2); font-size: 13px; white-space: nowrap; }
.usuario { position: relative; }
.usuario > button {
  display: flex; align-items: center; gap: 8px;
  border: 1px solid transparent; background: none; border-radius: 8px; padding: 6px 8px;
}
.usuario > button:hover { background: var(--bg); }
.avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-bg); color: var(--accent);
  display: grid; place-items: center; font-weight: 600; font-size: 12px; }
.menu {
  position: absolute; right: 0; top: calc(100% + 6px); min-width: 240px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--sombra-alta);
  padding: 8px; z-index: 40;
}
.menu .quem { padding: 6px 8px 10px; border-bottom: 1px solid var(--border); margin-bottom: 6px; }
.menu .quem strong { display: block; }
.menu .quem span { color: var(--text-2); font-size: 13px; }
.menu button { width: 100%; text-align: left; display: flex; gap: 8px; align-items: center;
  border: 0; background: none; padding: 8px; border-radius: 6px; }
.menu button:hover { background: var(--bg); }

.faixa {
  display: flex; gap: 8px; align-items: center;
  padding: 10px 24px; background: var(--warning-bg); color: var(--warning);
  border-bottom: 1px solid var(--warning-borda); font-size: 13px;
}

/* ---------- telas de aviso / login ---------- */

.tela-centro { min-height: calc(100vh - var(--topo-h) - 80px); display: grid; place-items: center; padding: 24px; }
.cartao-aviso {
  width: 100%; max-width: 440px; text-align: center;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 36px 32px;
  box-shadow: var(--sombra);
}
.cartao-aviso h1 { font-size: 20px; margin: 14px 0 8px; }
.cartao-aviso p { color: var(--text-2); margin: 0 0 20px; }
.cartao-aviso .selo-grande { width: 44px; height: 44px; border-radius: 12px; margin: 0 auto;
  display: grid; place-items: center; background: var(--accent-bg); color: var(--accent); }
.cartao-aviso .selo-grande.alerta { background: var(--warning-bg); color: var(--warning); }
.cartao-aviso .selo-grande .icone { width: 22px; height: 22px; }
.botao-google { display: flex; justify-content: center; min-height: 44px; }

/* ---------- botões ---------- */

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  height: 36px; padding: 0 14px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface); font-weight: 500;
}
.btn:hover { background: var(--bg); }
.btn.primario { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn.primario:hover { filter: brightness(.95); }
.btn:disabled { opacity: .5; cursor: not-allowed; filter: none; }
.btn.pequeno { height: 28px; padding: 0 10px; font-size: 13px; }

/* ---------- conteúdo ---------- */

.conteudo { max-width: 1600px; margin: 0 auto; padding: 20px 24px 120px; }

.cartoes { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.cartao {
  min-width: 170px; text-align: left;
  display: flex; flex-direction: column; gap: 2px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 12px 16px; box-shadow: var(--sombra);
}
.cartao:hover { border-color: #C9CED6; }
.cartao[aria-pressed="true"] { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.cartao .num { font-size: 26px; font-weight: 600; line-height: 1.2; display: flex; align-items: center; gap: 8px; }
.cartao .rot { color: var(--text-2); font-size: 13px; }
.cartao.pendencias.tem .num { color: var(--warning); }
.cartao.alertas.tem .num { color: var(--danger); }

.barra-filtros { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.busca { position: relative; flex: 0 1 340px; }
.busca .icone { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-3); }
.busca input {
  width: 100%; height: 36px; padding: 0 34px 0 34px;
  border: 1px solid var(--border); border-radius: 8px; background: var(--surface);
}
.busca kbd { position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  font: 12px var(--mono); color: var(--text-3); border: 1px solid var(--border); border-radius: 4px; padding: 0 5px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { height: 32px; padding: 0 12px; border-radius: 16px; border: 1px solid var(--border); background: var(--surface);
  font-size: 13px; font-weight: 500; color: var(--text-2); }
.chip[aria-pressed="true"] { background: var(--text); border-color: var(--text); color: #fff; }
.filtro-comprador { height: 36px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); padding: 0 10px; }
.contador { margin-left: auto; color: var(--text-2); font-size: 13px; }

/* ---------- tabela ---------- */

.tabela {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  box-shadow: var(--sombra);
}
.grade { display: grid; grid-template-columns: var(--colunas); }
.cabecalho {
  position: sticky; top: var(--topo-h); z-index: 10;
  background: var(--surface); border-bottom: 1px solid var(--border);
  border-radius: var(--radius) var(--radius) 0 0;
  font-size: 11.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--text-3);
}
.cabecalho > div { padding: 10px 12px; }
.linha { border-top: 1px solid var(--border); content-visibility: auto; contain-intrinsic-size: auto 96px; }
.linha:first-child { border-top: 0; }
.linha:hover { background: var(--hover); }
.cel { padding: 12px; min-height: var(--row-h); min-width: 0; }

.produto .titulo {
  font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.produto .meta { margin-top: 4px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; color: var(--text-2); font-size: 12.5px; }
.produto .sku { font: 12px var(--mono); color: var(--text-2); }
.lnk-anuncios { border: 0; background: none; padding: 0; color: var(--accent); font-size: 12.5px; }
.lnk-anuncios:hover { text-decoration: underline; }

.rot-loja { display: none; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text-3); margin-bottom: 4px; }

.loja { position: relative; }
.loja.editada { box-shadow: inset 3px 0 0 var(--warning); }
.campo-wrap { position: relative; max-width: 190px; }
.campo-wrap .prefixo { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-3); font-size: 13px; pointer-events: none; }
.campo {
  width: 100%; height: 36px; padding: 0 10px 0 34px;
  border: 1px solid var(--border); border-radius: 6px; background: var(--surface);
  font-variant-numeric: tabular-nums; font-weight: 500;
}
.campo:hover { border-color: #C9CED6; }
.campo:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(31, 94, 255, .18); }
.campo::placeholder { color: var(--text-3); font-weight: 400; }
.loja.pendente .campo { border-style: dashed; border-color: #A8B0BD; background: #FCFCFD; }
.loja.invalida .campo { border-color: var(--danger); background: var(--danger-bg); }
.antes { margin-top: 4px; font-size: 12px; color: var(--text-3); }
.erro-campo { margin-top: 4px; font-size: 12px; color: var(--danger); display: flex; gap: 4px; align-items: center; }

.alerta { margin-top: 6px; font-size: 12.5px; line-height: 1.4; display: flex; gap: 6px; align-items: flex-start; color: var(--text-2); }
.alerta .icone { margin-top: 1px; }
.alerta.vermelho { color: var(--danger); background: var(--danger-bg); border: 1px solid var(--danger-borda);
  border-radius: 6px; padding: 6px 8px; }
.alerta.ambar { color: var(--warning); }
.alerta.azul { color: var(--info); }
.alerta.verde { color: var(--success); }
.alerta .usar { margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px;
  border-radius: 6px; border: 1px solid currentColor; background: var(--surface); color: inherit; font-size: 12px; font-weight: 600; }
.alerta .usar:hover { background: #fff7f6; }
.alerta .mais { color: var(--text-3); white-space: nowrap; border-bottom: 1px dotted var(--text-3); cursor: help; }
.alerta .corpo { min-width: 0; }

.selos { margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap; }
.selo { display: inline-flex; align-items: center; gap: 4px; height: 20px; padding: 0 7px; border-radius: 10px;
  font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.selo.pend { background: var(--warning-bg); color: var(--warning); }
.selo.aguarda { background: var(--info-bg); color: var(--info); }
.selo.neutro { background: var(--neutro-bg); color: var(--text-2); }

.sem-anuncio { color: var(--text-3); font-size: 13px; display: flex; align-items: center; height: 36px; }

.trinta { font-size: 13px; }
.trinta .un { font-weight: 500; }
.trinta .vis { color: var(--text-2); }
.btn-convites { margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px;
  border: 1px solid var(--border); border-radius: 12px; background: var(--surface); font-size: 12px; color: var(--text-2); }
.btn-convites[aria-expanded="true"] { border-color: var(--text-2); color: var(--text); }
.btn-convites[aria-expanded="true"] .seta { transform: rotate(90deg); }

.expansao { grid-column: 1 / -1; padding: 4px 12px 16px; background: #FBFBFD; border-top: 1px dashed var(--border); }
.expansao h4 { margin: 12px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-3); }
.expansao table { width: 100%; border-collapse: collapse; font-size: 13px; }
.expansao th { text-align: left; font-weight: 500; color: var(--text-3); padding: 4px 8px; font-size: 12px; }
.expansao td { padding: 6px 8px; border-top: 1px solid var(--border); vertical-align: top; }
.expansao .rodape { margin-top: 10px; color: var(--text-3); font-size: 12px; }
.aval { display: inline-flex; align-items: center; gap: 4px; font-weight: 500; }
.aval.acima { color: var(--success); }
.aval.abaixo { color: var(--danger); }
.aval.neutra { color: var(--text-3); font-weight: 400; }

.vazio-lista { padding: 48px 24px; text-align: center; color: var(--text-2); }

/* esqueleto de carregamento */
.esqueleto .cel span { display: block; height: 12px; border-radius: 6px; margin: 6px 0;
  background: linear-gradient(90deg, #EEF0F3 0%, #F6F7F9 50%, #EEF0F3 100%); background-size: 200% 100%;
  animation: brilho 1.2s ease-in-out infinite; }
@keyframes brilho { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* ---------- popover de anúncios ---------- */

.popover {
  position: absolute; z-index: 50; min-width: 300px; max-width: 420px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: var(--sombra-alta);
  padding: 8px;
}
.popover h5 { margin: 6px 8px 4px; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: var(--text-3); }
.popover a { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 6px; text-decoration: none; color: var(--text); font-size: 13px; }
.popover a:hover { background: var(--bg); }
.popover a .id { font: 12px var(--mono); color: var(--text-2); }
.popover a .preco { margin-left: auto; color: var(--text-2); }

/* ---------- barra fixa de alterações ---------- */

.barra-alteracoes {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 35;
  display: flex; align-items: center; gap: 16px;
  background: #111827; color: #fff; border-radius: 12px; padding: 10px 10px 10px 18px;
  box-shadow: var(--sombra-alta); white-space: nowrap;
}
.barra-alteracoes .qtd { font-weight: 600; }
.barra-alteracoes .obs { color: #FDA29B; font-size: 13px; }
.barra-alteracoes .btn { background: transparent; color: #fff; border-color: #4B5563; }
.barra-alteracoes .btn:hover { background: #1F2937; }
.barra-alteracoes .btn.primario { background: var(--accent); border-color: var(--accent); }

/* ---------- modal ---------- */

.fundo-modal { position: fixed; inset: 0; z-index: 60; background: rgba(17, 24, 39, .45);
  display: grid; place-items: center; padding: 24px; }
.modal {
  width: 100%; max-width: 980px; max-height: calc(100vh - 48px); overflow: auto;
  background: var(--surface); border-radius: 12px; box-shadow: var(--sombra-alta);
  display: flex; flex-direction: column;
}
.modal header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.modal header h2 { margin: 0; font-size: 17px; }
.modal header .fechar { margin-left: auto; border: 0; background: none; padding: 6px; border-radius: 6px; color: var(--text-2); }
.modal header .fechar:hover { background: var(--bg); }
.modal .corpo-modal { padding: 8px 20px 4px; overflow: auto; }
.modal table { width: 100%; border-collapse: collapse; font-size: 13px; }
.modal th { text-align: left; font-weight: 500; color: var(--text-3); font-size: 12px; padding: 10px 8px 6px; border-bottom: 1px solid var(--border); }
.modal td { padding: 10px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
.modal tr.acima-limite td { background: var(--warning-bg); }
.modal tr.com-conflito td, .modal tr.com-erro td { background: var(--danger-bg); }
.modal .prod { font-weight: 500; max-width: 260px; }
.modal .prod small { display: block; font: 11.5px var(--mono); color: var(--text-2); font-weight: 400; }
.modal .seta-var { white-space: nowrap; font-weight: 500; }
.modal .seta-var.sobe { color: var(--success); }
.modal .seta-var.desce { color: var(--danger); }
.modal .confirma { display: flex; gap: 6px; align-items: center; margin-top: 6px; color: var(--warning); font-weight: 500; }
.modal .confirma input { width: 16px; height: 16px; accent-color: var(--warning); }
.modal .lapis { border: 0; background: none; color: var(--text-3); padding: 4px; border-radius: 6px; }
.modal .lapis:hover, .modal .lapis[aria-pressed="true"] { color: var(--text); background: var(--bg); }
.modal .obs-item { margin-top: 6px; width: 100%; height: 30px; border: 1px solid var(--border); border-radius: 6px; padding: 0 8px; font-size: 13px; }
.modal .aviso-linha { margin-top: 6px; color: var(--danger); font-weight: 500; }
.modal .acoes-conflito { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
.modal footer { padding: 14px 20px 18px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 12px; }
.modal footer label { font-size: 13px; color: var(--text-2); }
.modal footer textarea { width: 100%; min-height: 56px; resize: vertical; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.modal footer .botoes { display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
.modal footer .botoes .dica { margin-right: auto; color: var(--text-3); font-size: 12.5px; }

/* ---------- toasts ---------- */

.toasts { position: fixed; right: 20px; bottom: 84px; z-index: 70; display: flex; flex-direction: column; gap: 8px; max-width: 420px; }
.toast { display: flex; gap: 12px; align-items: center; background: #111827; color: #fff; border-radius: 10px;
  padding: 12px 14px; box-shadow: var(--sombra-alta); font-size: 13.5px; }
.toast.erro { background: #7A271A; }
.toast button { margin-left: auto; border: 1px solid rgba(255, 255, 255, .4); background: none; color: #fff;
  border-radius: 6px; height: 28px; padding: 0 10px; white-space: nowrap; }

.rodape-lgpd { text-align: center; color: var(--text-3); font-size: 12px; padding: 24px; }
.rodape-lgpd .links-rodape { display: block; margin-top: 6px; }
.rodape-lgpd a { color: var(--text-2); }

/* ---------- páginas públicas (sobre, privacidade, termos) ---------- */

.pagina { max-width: 760px; margin: 0 auto; padding: 32px 24px 16px; }
.pagina h1 { font-size: 26px; margin: 0 0 6px; }
.pagina .atualizado { color: var(--text-3); font-size: 13px; margin: 0 0 24px; }
.pagina h2 { font-size: 17px; margin: 28px 0 8px; }
.pagina p, .pagina li { color: var(--text); line-height: 1.6; }
.pagina ul { padding-left: 20px; }
.pagina .destaque { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; }
.pagina .acoes { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0 8px; }
.pagina .acoes a { text-decoration: none; }
.pagina .acoes a.btn:not(.primario) { color: var(--text); }
.topo a.marca { color: inherit; text-decoration: none; }

/* ---------- telas pequenas: a tabela vira cartões ---------- */

@media (max-width: 900px) {
  .topo { padding: 0 12px; gap: 10px; }
  .dados-de { display: none; }
  .conteudo { padding: 12px 12px 120px; }
  .busca { flex: 1 1 100%; }
  .contador { margin-left: 0; }
  .marca small { display: none; }
  .cartoes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .cartao { min-width: 0; padding: 10px 12px; }
  .cartao .num { font-size: 20px; }
  .cartao .rot { font-size: 12px; line-height: 1.3; }
  .tabela .cabecalho { display: none; }
  .tabela { background: none; border: 0; box-shadow: none; }
  .grade { display: block; }
  .linha { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 10px; }
  .linha:first-child { border-top: 1px solid var(--border); }
  .cel { min-height: 0; padding: 10px 12px; }
  .loja, .trinta { border-top: 1px solid var(--border); }
  .rot-loja { display: block; }
  .campo-wrap { max-width: none; }
  .barra-alteracoes { left: 12px; right: 12px; transform: none; bottom: 12px; white-space: normal; flex-wrap: wrap; gap: 10px; padding: 12px; }
  .barra-alteracoes > span:first-child { flex: 1 1 100%; }
  .barra-alteracoes .btn { flex: 1 1 0; }
  .toasts { left: 12px; right: 12px; bottom: 96px; }
}

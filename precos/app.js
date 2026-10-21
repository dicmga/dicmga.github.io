/*
 * ============================================================
 * Preços Base · Dicomp — app.js
 * ============================================================
 * Uma tela: o comprador revisa e define o preço base por SKU × loja.
 *
 *   login      Google Identity Services ("Entrar com Google"). O ID token
 *              fica em memória e no sessionStorage (morre ao fechar a aba)
 *              e vai no CORPO de cada chamada, nunca na URL.
 *   dados      uma chamada `sessao` + uma `listar` ao abrir; filtro, busca
 *              e ordem são feitos aqui, sem voltar ao servidor.
 *   regras     piso estimado, base máxima e alerta vêm do regras.js — o
 *              mesmo arquivo que o servidor usa para gravar o log.
 *   dinheiro   sempre em centavos (inteiros).
 */
(function () {
  'use strict';

  const CFG = window.ML_PRECOS_CONFIG || {};
  const CHAVE_TOKEN = 'mlp_token';
  const GSI_URL = 'https://accounts.google.com/gsi/client';
  const ESPERA_EDICAO_MS = 150;

  // ============================================================
  // 1. ESTADO
  // ============================================================

  const E = {
    token: null,
    perfil: null,          // payload do token (nome, e-mail)
    sessao: null,          // resposta da ação sessao
    lojas: [],
    itens: [],             // SKUs na ordem da tela
    porSku: {},
    compradores: {},       // e-mail -> nome (admin)
    filtro: { chip: 'todos', busca: '', comprador: '' },
    revisao: null,         // linhas do modal de revisão
    gis: false,
    esperaLogin: null,     // { resolver } enquanto pede login de novo
    salvando: false
  };

  const $ = function (id) { return document.getElementById(id); };

  // ============================================================
  // 2. INÍCIO
  // ============================================================

  function iniciar() {
    ligarEventos();
    if (!CFG.WEBAPP_URL || !CFG.CLIENT_ID) {
      mostrarAviso('Portal sem configuração',
        'Preencha CLIENT_ID e WEBAPP_URL no arquivo config.js do portal.');
      return;
    }
    carregarGis();
    const salvo = lerTokenSalvo();
    if (salvo) {
      usarToken(salvo);
      abrirPortal();
    } else {
      mostrarLogin();
    }
  }

  // ============================================================
  // 3. LOGIN (Google Identity Services)
  // ============================================================

  function carregarGis() {
    if (window.google && google.accounts && google.accounts.id) { gisPronto(); return; }
    const s = document.createElement('script');
    s.src = GSI_URL;
    s.async = true;
    s.onload = gisPronto;
    s.onerror = function () {
      mostrarAviso('Não foi possível carregar o login do Google',
        'Confira a conexão e recarregue a página.', 'Recarregar', function () { location.reload(); });
    };
    document.head.appendChild(s);
  }

  function gisPronto() {
    if (E.gis) return;
    E.gis = true;
    google.accounts.id.initialize({
      client_id: CFG.CLIENT_ID,
      callback: aoReceberCredencial,
      auto_select: true,
      cancel_on_tap_outside: false,
      use_fedcm_for_prompt: true,
      context: 'signin'
    });
    if (!$('tela-login').hidden) desenharBotaoGoogle($('botao-google'), true);
    if (E.esperaLogin) desenharBotaoGoogle(document.getElementById('botao-google-modal'), true);
  }

  function desenharBotaoGoogle(alvo, comPrompt) {
    if (!E.gis || !alvo) return;
    alvo.innerHTML = '';
    google.accounts.id.renderButton(alvo, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', locale: 'pt-BR' });
    if (comPrompt) google.accounts.id.prompt();
  }

  function aoReceberCredencial(resp) {
    if (!resp || !resp.credential) return;
    usarToken(resp.credential);
    try { sessionStorage.setItem(CHAVE_TOKEN, resp.credential); } catch (e) { /* aba privada: fica só na memória */ }
    if (E.esperaLogin) {
      const espera = E.esperaLogin;
      E.esperaLogin = null;
      fecharModal();
      espera.resolver();
      return;
    }
    abrirPortal();
  }

  function usarToken(token) {
    E.token = token;
    E.perfil = lerJwt(token) || {};
  }

  function lerTokenSalvo() {
    let t = null;
    try { t = sessionStorage.getItem(CHAVE_TOKEN); } catch (e) { t = null; }
    return t && tokenValido(t) ? t : null;
  }

  function tokenValido(token) {
    const p = lerJwt(token);
    return !!p && Number(p.exp) * 1000 > Date.now() + 60000;
  }

  function lerJwt(token) {
    try {
      let b = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      b += '==='.slice((b.length + 3) % 4);
      const bin = atob(b);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
      return null;
    }
  }

  function limparToken() {
    E.token = null;
    try { sessionStorage.removeItem(CHAVE_TOKEN); } catch (e) { /* nada */ }
  }

  /**
   * Pede login de novo sem perder a tela: com o portal aberto, mostra um
   * aviso por cima (as alterações não salvas continuam ali); senão, a tela
   * de login. Com auto_select, o Google costuma resolver sozinho.
   */
  function pedirLogin() {
    limparToken();
    if ($('tela-portal').hidden) {
      mostrarLogin();
      return new Promise(function () { /* a tela de login reabre o portal */ });
    }
    return new Promise(function (resolver) {
      E.esperaLogin = { resolver: resolver };
      abrirModal(
        '<div class="corpo-modal" style="text-align:center;padding:28px 24px">' +
        '<h2 style="margin:0 0 6px;font-size:17px">Sua sessão expirou</h2>' +
        '<p style="color:var(--text-2);margin:0 0 18px">Entre de novo para continuar. Suas alterações não salvas continuam aqui.</p>' +
        '<div class="botao-google" id="botao-google-modal"></div></div>', { semFechar: true, estreito: true });
      desenharBotaoGoogle(document.getElementById('botao-google-modal'), true);
    });
  }

  function sair() {
    if (contarAlteracoes().validas && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    if (E.gis) google.accounts.id.disableAutoSelect();
    limparToken();
    E.itens = [];
    location.reload();
  }

  function trocarConta() {
    if (E.gis) google.accounts.id.disableAutoSelect();
    limparToken();
    mostrarLogin();
  }

  // ============================================================
  // 4. SERVIDOR
  // ============================================================

  function ErroApi(erro) {
    this.codigo = erro.codigo || 'ERRO_INTERNO';
    this.mensagem = erro.mensagem || 'Erro inesperado no servidor.';
    this.extra = erro;
  }

  function ErroRede(mensagem) {
    this.codigo = 'REDE';
    this.mensagem = mensagem;
  }

  async function postar(corpo) {
    const ctrl = new AbortController();
    const prazo = setTimeout(function () { ctrl.abort(); }, 60000);
    let texto;
    try {
      // sem cabeçalhos próprios: Content-Type text/plain não dispara preflight de CORS
      const r = await fetch(CFG.WEBAPP_URL, {
        method: 'POST', body: JSON.stringify(corpo), redirect: 'follow', credentials: 'omit', signal: ctrl.signal
      });
      texto = await r.text();
    } catch (e) {
      throw new ErroRede('Sem conexão com o servidor.');
    } finally {
      clearTimeout(prazo);
    }
    try {
      return JSON.parse(texto);
    } catch (e) {
      throw new ErroRede('O servidor respondeu algo inesperado.');
    }
  }

  /** Chama uma ação; NAO_AUTENTICADO -> login de novo e repete uma vez. */
  async function chamar(acao, dados, tentativa) {
    if (!E.token || !tokenValido(E.token)) await pedirLogin();
    const resp = await postar({ acao: acao, token: E.token, dados: dados || {} });
    if (resp && resp.ok) return resp.dados;
    const erro = (resp && resp.erro) || { codigo: 'ERRO_INTERNO', mensagem: 'Resposta inesperada do servidor.' };
    if (erro.codigo === 'NAO_AUTENTICADO' && !tentativa) {
      await pedirLogin();
      return chamar(acao, dados, 1);
    }
    throw new ErroApi(erro);
  }

  // ============================================================
  // 5. ABRIR O PORTAL
  // ============================================================

  async function abrirPortal() {
    mostrarTela('portal');
    mostrarUsuario(E.perfil.name || E.perfil.email || '', E.perfil.email || '');
    desenharEsqueleto();

    try {
      E.sessao = await chamar('sessao');
      mostrarUsuario(E.sessao.nome, E.sessao.email);
      E.compradores = {};
      (E.sessao.compradores || []).forEach(function (c) { E.compradores[c.email] = c.nome; });
      const lista = await chamar('listar');
      montar(lista);
    } catch (e) {
      tratarErroFatal(e, abrirPortal);
    }
  }

  function tratarErroFatal(e, repetir) {
    if (e && e.codigo === 'NAO_AUTORIZADO') {
      const email = (e.extra && e.extra.email) || E.perfil.email || '';
      mostrarAviso('Sem acesso', 'Seu e-mail (' + email + ') não tem acesso. Peça liberação ao e-commerce.',
        'Trocar de conta', trocarConta);
    } else if (e && e.codigo === 'MANUTENCAO') {
      mostrarAviso('Portal em manutenção', 'O portal está em manutenção. Tente mais tarde.', 'Tentar de novo', repetir);
    } else {
      mostrarAviso('Não foi possível carregar', (e && e.mensagem) || 'Erro inesperado.', 'Tentar de novo', repetir);
    }
  }

  function montar(lista) {
    E.lojas = (lista.lojas && lista.lojas.length ? lista.lojas : (E.sessao.lojas || []));
    E.itens = [];
    E.porSku = {};
    (lista.skus || []).forEach(function (s) {
      const item = {
        sku: s.sku,
        titulo: s.titulo || '',
        comprador: s.comprador || '',
        lojas: {},
        expandido: false,
        el: null
      };
      E.lojas.forEach(function (loja) {
        const l = s.lojas[loja];
        if (!l) { item.lojas[loja] = null; return; }
        item.lojas[loja] = {
          item: item,
          loja: loja,
          baseCent: centavosDe_(l.preco_base),
          versao: Number(l.versao) || 0,
          vigenteCent: centavosDe_(l.base_vigente),
          atualizadoPorNome: l.atualizado_por_nome || '',
          atualizadoEm: l.atualizado_em || '',
          vendas: Number(l.vendas_30d) || 0,
          visitas: Number(l.visitas_30d) || 0,
          anuncios: l.anuncios || [],
          edicao: null,
          el: null,
          espera: null
        };
      });
      item.busca = normalizar(item.sku + ' ' + item.titulo + ' ' + todosAnuncios(item).map(function (a) { return a.item_id; }).join(' '));
      item.vendas = somaLojas(item, 'vendas');
      item.visitas = somaLojas(item, 'visitas');
      item.catalogo = todosAnuncios(item).some(function (a) { return a.catalog_listing === true; });
      item.convites = todosAnuncios(item).reduce(function (s, a) { return s + ((a.convites || []).length); }, 0);
      E.itens.push(item);
      E.porSku[item.sku] = item;
    });

    classificarTodos();
    ordenar();
    montarFiltroComprador();
    desenharTabela();
    mostrarIdadeDosDados(lista.espelho_atualizado_em || E.sessao.espelho_atualizado_em);
    aplicarFiltros();
    atualizarBarra();
  }

  // ============================================================
  // 6. CLASSIFICAÇÃO, ORDEM E FILTROS
  // ============================================================

  function celulas(item) {
    return E.lojas.map(function (l) { return item.lojas[l]; }).filter(Boolean);
  }

  function todosAnuncios(item) {
    let lista = [];
    celulas(item).forEach(function (c) { lista = lista.concat(c.anuncios); });
    return lista;
  }

  function somaLojas(item, campo) {
    return celulas(item).reduce(function (s, c) { return s + (c[campo] || 0); }, 0);
  }

  /**
   * Situação SALVA de cada SKU (cartões, filtros e ordem não pulam
   * enquanto o comprador digita; a microlinha, sim, recalcula na hora).
   */
  function classificar(item) {
    item.pendente = celulas(item).some(function (c) { return c.baseCent === null; });
    item.maiorDif = null;
    celulas(item).forEach(function (c) {
      const av = avaliarLoja_(c.anuncios, c.baseCent);
      c.avSalva = av;
      if (av.estado === 'bloqueado_pela_base' && (item.maiorDif === null || av.pior.difCent > item.maiorDif)) {
        item.maiorDif = av.pior.difCent;
      }
    });
    item.alerta = item.maiorDif !== null;
  }

  function classificarTodos() { E.itens.forEach(classificar); }

  /** 1. pendências · 2. vermelhos por D · 3. vendas 30 dias · 4. SKU (spec 11.6). */
  function ordenar() {
    const grupo = function (i) { return i.pendente ? 0 : (i.alerta ? 1 : 2); };
    E.itens.sort(function (a, b) {
      const ga = grupo(a), gb = grupo(b);
      if (ga !== gb) return ga - gb;
      if (ga === 1 && a.maiorDif !== b.maiorDif) return b.maiorDif - a.maiorDif;
      if (a.vendas !== b.vendas) return b.vendas - a.vendas;
      return a.sku < b.sku ? -1 : (a.sku > b.sku ? 1 : 0);
    });
  }

  function normalizar(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function passaFiltro(item) {
    const f = E.filtro;
    if (f.chip === 'pendentes' && !item.pendente) return false;
    if (f.chip === 'alerta' && !item.alerta) return false;
    if (f.chip === 'catalogo' && !item.catalogo) return false;
    if (f.comprador === '__sem__' && item.comprador) return false;
    if (f.comprador && f.comprador !== '__sem__' && item.comprador !== f.comprador) return false;
    if (f.busca) {
      const termos = normalizar(f.busca).split(/\s+/).filter(Boolean);
      if (!termos.every(function (t) { return item.busca.indexOf(t) >= 0; })) return false;
    }
    return true;
  }

  function aplicarFiltros() {
    let visiveis = 0;
    E.itens.forEach(function (item) {
      const ok = passaFiltro(item);
      if (item.el) item.el.hidden = !ok;
      if (ok) visiveis++;
    });

    // cartões contam dentro do comprador escolhido (admin), sem os outros filtros
    const base = E.itens.filter(function (i) {
      const f = E.filtro;
      if (f.comprador === '__sem__') return !i.comprador;
      if (f.comprador) return i.comprador === f.comprador;
      return true;
    });
    const pend = base.filter(function (i) { return i.pendente; }).length;
    const alerta = base.filter(function (i) { return i.alerta; }).length;
    $('num-pendentes').textContent = pend;
    $('num-alerta').innerHTML = (alerta ? icone('alerta') : '') + alerta;
    $('num-todos').textContent = base.length;
    $('cartao-pendentes').classList.toggle('tem', pend > 0);
    $('cartao-alerta').classList.toggle('tem', alerta > 0);
    $('rot-todos').textContent = E.sessao && E.sessao.papel === 'admin' ? 'produtos' : 'seus produtos';

    ['pendentes', 'alerta'].forEach(function (chip) {
      $('cartao-' + chip).setAttribute('aria-pressed', String(E.filtro.chip === chip));
    });
    document.querySelectorAll('.chip').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.chip === E.filtro.chip));
    });

    $('contador').textContent = 'mostrando ' + visiveis + ' de ' + E.itens.length;
    const vazio = $('vazio');
    if (!E.itens.length) {
      vazio.hidden = false;
      vazio.textContent = E.sessao && E.sessao.papel === 'admin'
        ? 'O espelho de anúncios ainda está vazio. Rode exportarEspelhoPrecos() no ML-Automacao.'
        : 'Nenhum produto atribuído a você ainda. Fale com o e-commerce.';
    } else if (!visiveis) {
      vazio.hidden = false;
      vazio.textContent = 'Nenhum produto com esse filtro.';
    } else {
      vazio.hidden = true;
    }
  }

  function mudarChip(chip) {
    E.filtro.chip = chip;
    aplicarFiltros();
  }

  function montarFiltroComprador() {
    const admin = E.sessao && E.sessao.papel === 'admin';
    $('caixa-comprador').hidden = !admin;
    if (!admin) return;
    const sel = $('filtro-comprador');
    const opcoes = ['<option value="">Todos os compradores</option>', '<option value="__sem__">Sem comprador</option>'];
    (E.sessao.compradores || []).forEach(function (c) {
      opcoes.push('<option value="' + esc(c.email) + '">' + esc(c.nome) + (c.ativo === false ? ' (inativo)' : '') + '</option>');
    });
    sel.innerHTML = opcoes.join('');
    sel.value = E.filtro.comprador;
  }

  // ============================================================
  // 7. DESENHO DA TABELA
  // ============================================================

  function colunas() {
    return 'minmax(240px, 2fr) repeat(' + Math.max(E.lojas.length, 1) + ', minmax(220px, 1.5fr)) minmax(110px, .7fr)';
  }

  function desenharEsqueleto() {
    const n = Math.max(E.lojas.length, 2);
    $('tabela').style.setProperty('--colunas', 'minmax(240px, 2fr) repeat(' + n + ', minmax(220px, 1.5fr)) minmax(110px, .7fr)');
    $('cabecalho').innerHTML = '<div>Produto</div>' + new Array(n).fill('<div>Base</div>').join('') + '<div>30 dias</div>';
    let html = '';
    for (let i = 0; i < 8; i++) {
      html += '<div class="grade linha esqueleto"><div class="cel"><span style="width:70%"></span><span style="width:35%"></span></div>' +
        new Array(n).fill('<div class="cel"><span style="width:60%;height:30px"></span><span style="width:80%"></span></div>').join('') +
        '<div class="cel"><span style="width:50%"></span><span style="width:40%"></span></div></div>';
    }
    $('linhas').innerHTML = html;
    $('vazio').hidden = true;
    $('contador').textContent = '';
  }

  function desenharTabela() {
    $('tabela').style.setProperty('--colunas', colunas());
    $('cabecalho').innerHTML = '<div role="columnheader">Produto</div>' +
      E.lojas.map(function (l) { return '<div role="columnheader">Base ' + esc(l) + '</div>'; }).join('') +
      '<div role="columnheader">30 dias</div>';

    $('linhas').innerHTML = E.itens.map(htmlLinha).join('');
    const linhas = $('linhas').children;
    for (let i = 0; i < linhas.length; i++) {
      const item = E.itens[i];
      item.el = linhas[i];
      celulas(item).forEach(function (c) {
        c.el = item.el.querySelector('.loja[data-loja="' + cssEsc(c.loja) + '"]');
        atualizarCelula(c);
      });
    }
  }

  function htmlLinha(item) {
    const n = todosAnuncios(item).length;
    const admin = E.sessao && E.sessao.papel === 'admin';
    let meta = '<span class="sku">' + esc(item.sku) + '</span><span aria-hidden="true">·</span>' +
      '<button type="button" class="lnk-anuncios" data-acao="anuncios" aria-haspopup="dialog">' +
      n + (n === 1 ? ' anúncio' : ' anúncios') + ' ↗</button>';
    if (admin) {
      meta += item.comprador
        ? '<span aria-hidden="true">·</span><span>' + esc(E.compradores[item.comprador] || item.comprador) + '</span>'
        : '<span class="selo neutro">Sem comprador</span>';
    }

    let html = '<div class="grade linha" role="row" data-sku="' + esc(item.sku) + '">' +
      '<div class="cel produto" role="cell"><div class="titulo" title="' + esc(item.titulo) + '">' + esc(item.titulo || item.sku) + '</div>' +
      '<div class="meta">' + meta + '</div></div>';

    E.lojas.forEach(function (loja) {
      const c = item.lojas[loja];
      if (!c) {
        html += '<div class="cel loja vazia-loja" role="cell"><span class="rot-loja">Base ' + esc(loja) + '</span>' +
          '<span class="sem-anuncio">sem anúncio</span></div>';
        return;
      }
      html += '<div class="cel loja" role="cell" data-loja="' + esc(loja) + '">' +
        '<span class="rot-loja">Base ' + esc(loja) + '</span>' +
        '<div class="campo-wrap"><span class="prefixo" aria-hidden="true">R$</span>' +
        '<input class="campo" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" ' +
        'aria-label="Preço base ' + esc(loja) + ' do SKU ' + esc(item.sku) + '" ' +
        'placeholder="' + (c.baseCent === null ? 'Definir base' : '') + '" ' +
        'value="' + (c.baseCent === null ? '' : formatarNumero_(c.baseCent)) + '"></div>' +
        '<div class="antes" hidden></div><div class="erro-campo" hidden></div>' +
        '<div class="alerta-slot"></div><div class="selos"></div></div>';
    });

    const titulo30 = celulas(item).map(function (c) {
      return c.loja + ': ' + c.vendas + ' un · ' + c.visitas + ' visitas';
    }).join('\n');
    html += '<div class="cel trinta" role="cell" title="' + esc(titulo30) + '">' +
      '<div class="un">' + item.vendas + ' un</div><div class="vis">' + item.visitas + ' vis</div>' +
      (item.convites
        ? '<button type="button" class="btn-convites" data-acao="convites" aria-expanded="false">' + icone('tag', 'p') +
          item.convites + (item.convites === 1 ? ' convite' : ' convites') + '<span class="seta">' + icone('chevron', 'p') + '</span></button>'
        : '') +
      '</div><div class="expansao" hidden></div></div>';
    return html;
  }

  /** Base em vigor na tela: a digitada (válida) ou a salva. */
  function baseEfetiva(c) {
    if (c.edicao && c.edicao.centavos !== null) return c.edicao.centavos;
    return c.baseCent;
  }

  /** Redesenha a parte dinâmica de uma célula de loja. */
  function atualizarCelula(c) {
    if (!c.el) return;
    const ed = c.edicao;
    const editada = !!(ed && ed.centavos !== null);
    const invalida = !!(ed && ed.erro);
    c.el.classList.toggle('editada', editada || invalida);
    c.el.classList.toggle('invalida', invalida);
    c.el.classList.toggle('pendente', c.baseCent === null && !editada);

    const antes = c.el.querySelector('.antes');
    antes.hidden = !(editada || invalida);
    antes.textContent = 'antes ' + (c.baseCent === null ? 'sem base' : formatarReais_(c.baseCent));

    const erro = c.el.querySelector('.erro-campo');
    erro.hidden = !invalida;
    erro.innerHTML = invalida ? icone('alerta', 'p') + '<span>' + esc(ed.erro) + '</span>' : '';

    // só troca o HTML se o alerta mudou: redesenhar à toa destrói o botão
    // "Usar" no meio de um clique ou com o foco nele (Tab)
    const slot = c.el.querySelector('.alerta-slot');
    const htmlNovo = invalida ? '' : htmlAlerta(c, avaliarLoja_(c.anuncios, baseEfetiva(c)));
    if (c.htmlAlerta !== htmlNovo) slot.innerHTML = htmlNovo;
    c.htmlAlerta = htmlNovo;

    // pendência: o próprio campo (tracejado, "Definir base") já avisa
    const selos = [];
    if (c.baseCent !== null && !editada && !invalida && c.baseCent !== c.vigenteCent) {
      selos.push('<span class="selo aguarda" title="O piso de hoje ainda usa ' +
        esc(c.vigenteCent === null ? 'outro valor' : formatarReais_(c.vigenteCent)) + '">' +
        icone('relogio', 'p') + 'Salvo · entra no próximo ciclo</span>');
    }
    const caixa = c.el.querySelector('.selos');
    caixa.innerHTML = selos.join('');
    caixa.hidden = !selos.length;

    const campo = c.el.querySelector('.campo');
    campo.setAttribute('aria-invalid', String(invalida));
    if (c.item.expandido) desenharConvites(c.item);
  }

  const ICONE_ESTADO = {
    bloqueado_pela_base: 'alerta', dividindo: 'dividindo', nosso: 'loja', ganhavel: 'sobe',
    sem_dado: 'info', sem_estimativa: 'info', sem_base: 'info', ganhando: 'ok'
  };

  function htmlAlerta(c, av) {
    if (!av || !av.pior || av.estado === 'nao_catalogo') return '';
    const cor = ESTADOS_ALERTA_[av.estado].cor;
    const p = av.pior;
    let corpo = '<span>' + esc(textoAlerta_(p)) + '</span>';

    // "Usar R$ Z" no vermelho e na pendência disputável: só preenche o campo
    if ((av.estado === 'bloqueado_pela_base' || av.estado === 'sem_base') && p.baseMaxCent !== null && !p.naoCobre) {
      corpo += '<div><button type="button" class="usar" data-acao="usar" data-valor="' + p.baseMaxCent + '">Usar ' +
        esc(formatarReais_(p.baseMaxCent)) + '</button></div>';
    }
    const outros = av.todas.filter(function (a) { return a !== p; });
    if (outros.length) {
      const dica = outros.map(function (a) {
        return a.anuncio.item_id + ' · ' + (textoAlerta_(a) || 'fora de catálogo');
      }).join('\n');
      corpo += ' <span class="mais" title="' + esc(dica) + '">+' + outros.length + (outros.length === 1 ? ' anúncio' : ' anúncios') + '</span>';
    }
    const coleta = p.anuncio && p.anuncio.comp_coletado_em ? 'Competição coletada em ' + dataCurta(p.anuncio.comp_coletado_em) : '';
    return '<div class="alerta ' + cor + '" title="' + esc(coleta) + '">' + icone(ICONE_ESTADO[av.estado] || 'info', 'p') +
      '<div class="corpo">' + corpo + '</div></div>';
  }

  // ============================================================
  // 8. EDIÇÃO
  // ============================================================

  function celulaDoEvento(alvo) {
    const linha = alvo.closest('.linha');
    const caixa = alvo.closest('.loja');
    if (!linha || !caixa || !caixa.dataset.loja) return null;
    const item = E.porSku[linha.dataset.sku];
    return item ? item.lojas[caixa.dataset.loja] : null;
  }

  function processarEdicao(c, texto) {
    clearTimeout(c.espera);
    const r = interpretarValor_(texto);
    if (r.vazio) c.edicao = null;
    else if (r.erro) c.edicao = { texto: texto, centavos: null, erro: r.erro };
    else if (r.centavos === c.baseCent) c.edicao = null;
    else c.edicao = { texto: texto, centavos: r.centavos, erro: null };
    atualizarCelula(c);
    atualizarBarra();
  }

  function reverter(c) {
    clearTimeout(c.espera);
    c.edicao = null;
    c.el.querySelector('.campo').value = c.baseCent === null ? '' : formatarNumero_(c.baseCent);
    atualizarCelula(c);
    atualizarBarra();
  }

  /** Ao sair do campo: mostra o valor arrumado (95,5 -> 95,50) ou volta ao salvo se ficou vazio. */
  function arrumarCampo(c) {
    const campo = c.el.querySelector('.campo');
    if (c.edicao && c.edicao.centavos !== null) campo.value = formatarNumero_(c.edicao.centavos);
    else if (!c.edicao) campo.value = c.baseCent === null ? '' : formatarNumero_(c.baseCent);
  }

  /** Enter: desce para a mesma loja do próximo produto visível. */
  function descer(c) {
    let el = c.item.el.nextElementSibling;
    while (el) {
      if (!el.hidden) {
        const campo = el.querySelector('.loja[data-loja="' + cssEsc(c.loja) + '"] .campo');
        if (campo) { campo.focus(); return; }
      }
      el = el.nextElementSibling;
    }
    c.el.querySelector('.campo').blur();
  }

  /** "Usar R$ Z": só preenche o campo; o comprador ainda revisa e salva. */
  function usarBase(botao) {
    const c = celulaDoEvento(botao);
    if (!c) return;
    const campo = c.el.querySelector('.campo');
    campo.value = formatarNumero_(Number(botao.dataset.valor));
    processarEdicao(c, campo.value);
    campo.focus();
  }

  function contarAlteracoes() {
    let validas = 0, erros = 0;
    E.itens.forEach(function (item) {
      celulas(item).forEach(function (c) {
        if (!c.edicao) return;
        if (c.edicao.centavos !== null) validas++;
        else if (c.edicao.erro) erros++;
      });
    });
    return { validas: validas, erros: erros };
  }

  function atualizarBarra() {
    const n = contarAlteracoes();
    $('barra').hidden = !(n.validas || n.erros);
    $('barra-qtd').textContent = n.validas + (n.validas === 1 ? ' alteração não salva' : ' alterações não salvas');
    $('barra-obs').textContent = n.erros ? '· ' + n.erros + (n.erros === 1 ? ' com erro (não será salva)' : ' com erro (não serão salvas)') : '';
    $('btn-revisar').disabled = !n.validas;
  }

  function descartarTudo() {
    const n = contarAlteracoes();
    if (n.validas + n.erros > 3 && !confirm('Descartar as ' + (n.validas + n.erros) + ' alterações não salvas?')) return;
    E.itens.forEach(function (item) { celulas(item).forEach(function (c) { if (c.edicao) reverter(c); }); });
  }

  // ============================================================
  // 9. REVISAR E SALVAR
  // ============================================================

  function abrirRevisao() {
    const limite = Number(E.sessao.limite_confirmacao_pct);
    E.revisao = [];
    E.itens.forEach(function (item) {
      celulas(item).forEach(function (c) {
        if (!c.edicao || c.edicao.centavos === null) return;
        E.revisao.push({ c: c, confirmado: false, obs: '', obsAberta: false, estado: 'pronta', mensagem: '', conflito: null });
      });
    });
    if (!E.revisao.length) return;
    E.revisao.forEach(function (r) { r.precisa = precisaConfirmar_(r.c.baseCent, r.c.edicao.centavos, limite); });
    desenharRevisao();
  }

  function desenharRevisao() {
    if (!E.revisao) return;
    // o modal é redesenhado inteiro: guarda onde estava o foco para devolver
    const ativo = document.activeElement;
    const foco = ativo && ativo.dataset && ativo.dataset.revisao
      ? { revisao: ativo.dataset.revisao, i: ativo.dataset.i } : null;

    const linhas = E.revisao.map(function (r, i) {
      const c = r.c;
      const depois = c.edicao.centavos;
      const v = variacaoPct_(c.baseCent, depois);
      const av = avaliarLoja_(c.anuncios, depois);
      const cor = ESTADOS_ALERTA_[av.estado].cor;
      const alertaTxt = av.estado === 'nao_catalogo' ? 'Fora de catálogo' : textoAlerta_(av.pior);
      let extra = '';
      if (r.precisa && r.estado === 'pronta') {
        extra += '<label class="confirma"><input type="checkbox" data-revisao="confirmar" data-i="' + i + '"' +
          (r.confirmado ? ' checked' : '') + '> Confirmo a variação de ' + esc(formatarPct_(v, 0, true)) + '</label>';
      }
      if (r.estado === 'conflito') {
        const cf = r.conflito;
        extra += '<div class="aviso-linha">' + esc(cf.atualizado_por_nome || 'Outra pessoa') + ' alterou para ' +
          esc(cf.valor_atual === null ? 'sem base' : formatarReais_(centavosDe_(cf.valor_atual))) +
          (cf.atualizado_em ? ' às ' + esc(horaCurta(cf.atualizado_em)) : '') + '.</div>' +
          '<div class="acoes-conflito"><button type="button" class="btn pequeno primario" data-revisao="manter" data-i="' + i + '">Manter o meu (' +
          esc(formatarReais_(depois)) + ')</button><button type="button" class="btn pequeno" data-revisao="dele" data-i="' + i +
          '">Ficar com o dele</button></div>';
      }
      if (r.estado === 'erro') extra += '<div class="aviso-linha">' + esc(r.mensagem) + '</div>';
      if (r.obsAberta) {
        extra += '<input class="obs-item" type="text" maxlength="500" placeholder="Observação só deste item" ' +
          'data-revisao="obs" data-i="' + i + '" value="' + esc(r.obs) + '">';
      }
      const classe = r.estado === 'conflito' ? 'com-conflito' : (r.estado === 'erro' ? 'com-erro' : (r.precisa ? 'acima-limite' : ''));
      return '<tr class="' + classe + '"><td class="prod">' + esc(c.item.titulo || c.item.sku) + '<small>' + esc(c.item.sku) + '</small></td>' +
        '<td>' + esc(c.loja) + '</td>' +
        '<td style="white-space:nowrap">' + esc(c.baseCent === null ? 'sem base' : formatarReais_(c.baseCent)) + ' → <strong>' +
        esc(formatarReais_(depois)) + '</strong></td>' +
        '<td>' + (v === null ? '<span class="seta-var">nova</span>'
          : '<span class="seta-var ' + (v >= 0 ? 'sobe' : 'desce') + '">' + (v >= 0 ? '▲ ' : '▼ ') + esc(formatarPct_(v, 1, true)) + '</span>') + '</td>' +
        '<td><div class="alerta ' + cor + '" style="margin:0">' + icone(ICONE_ESTADO[av.estado] || 'info', 'p') +
        '<div class="corpo">' + esc(alertaTxt) + '</div></div>' + extra + '</td>' +
        '<td><button type="button" class="lapis" data-revisao="lapis" data-i="' + i + '" aria-pressed="' + r.obsAberta +
        '" title="Observação deste item" aria-label="Observação deste item">' + icone('lapis') + '</button></td></tr>';
    }).join('');

    const prontas = E.revisao.filter(function (r) { return r.estado === 'pronta'; });
    const conflitos = E.revisao.filter(function (r) { return r.estado === 'conflito'; }).length;
    const faltaConfirmar = prontas.filter(function (r) { return r.precisa && !r.confirmado; }).length;
    const loteAtual = document.getElementById('obs-lote') ? document.getElementById('obs-lote').value : '';
    const dica = conflitos ? 'Resolva os conflitos para salvar.'
      : (faltaConfirmar ? 'Confirme as variações acima de ' + E.sessao.limite_confirmacao_pct + '%.' : '');

    abrirModal(
      '<header><h2>Revisar ' + E.revisao.length + (E.revisao.length === 1 ? ' alteração' : ' alterações') + '</h2>' +
      '<button type="button" class="fechar" data-revisao="fechar" aria-label="Fechar">' + icone('x') + '</button></header>' +
      '<div class="corpo-modal"><table><thead><tr><th>Produto</th><th>Loja</th><th>Antes → depois</th><th>Variação</th>' +
      '<th>Alerta resultante</th><th></th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<footer><label for="obs-lote">Observação (opcional) — vale para todas as linhas sem observação própria</label>' +
      '<textarea id="obs-lote" maxlength="500" placeholder="Ex.: negociação com o fornecedor X">' + esc(loteAtual) + '</textarea>' +
      '<div class="botoes"><span class="dica">' + esc(dica) + '</span>' +
      '<button type="button" class="btn" data-revisao="fechar">Voltar</button>' +
      '<button type="button" class="btn primario" data-revisao="salvar"' +
      (!prontas.length || faltaConfirmar || conflitos || E.salvando ? ' disabled' : '') + '>' +
      (E.salvando ? 'Salvando…' : (prontas.length ? 'Salvar ' + prontas.length + (prontas.length === 1 ? ' preço' : ' preços') : 'Salvar')) +
      '</button></div></footer>',
      { aoFechar: function () { E.revisao = null; } });

    if (foco) {
      const seletor = '[data-revisao="' + foco.revisao + '"]' + (foco.i !== undefined ? '[data-i="' + foco.i + '"]' : '');
      const alvo = $('raiz-modal').querySelector(seletor);
      if (alvo && !alvo.disabled) alvo.focus();
    }
  }

  function cliqueRevisao(alvo) {
    const acao = alvo.dataset.revisao;
    const r = E.revisao && E.revisao[Number(alvo.dataset.i)];
    if (acao === 'fechar') { if (!E.salvando) fecharModal(); return; }
    if (acao === 'salvar') { salvar(); return; }
    if (!r) return;
    if (acao === 'lapis') { r.obsAberta = !r.obsAberta; desenharRevisao(); return; }
    if (acao === 'manter') {
      r.estado = 'pronta';
      r.conflito = null;
      r.confirmado = false;
      r.precisa = precisaConfirmar_(r.c.baseCent, r.c.edicao.centavos, Number(E.sessao.limite_confirmacao_pct));
      desenharRevisao();
      return;
    }
    if (acao === 'dele') {
      reverter(r.c);
      E.revisao.splice(E.revisao.indexOf(r), 1);
      if (!E.revisao.length) fecharModal(); else desenharRevisao();
    }
  }

  async function salvar() {
    if (E.salvando) return;
    if (!E.revisao) { abrirRevisao(); return; }   // "Tentar de novo" depois de fechar o modal
    const prontas = E.revisao.filter(function (r) { return r.estado === 'pronta'; });
    if (!prontas.length) return;
    const obsLote = (document.getElementById('obs-lote') || {}).value || '';
    const alteracoes = prontas.map(function (r) {
      return {
        sku: r.c.item.sku,
        loja: r.c.loja,
        valor_novo: reaisDe_(r.c.edicao.centavos),
        versao_lida: r.c.versao,
        confirmado: r.precisa ? r.confirmado : false,
        observacao: r.obs || ''
      };
    });

    E.salvando = true;
    desenharRevisao();
    let resp;
    try {
      resp = await chamar('salvar', { alteracoes: alteracoes, observacao_lote: obsLote });
    } catch (e) {
      E.salvando = false;
      if (E.revisao) desenharRevisao();
      if (e && (e.codigo === 'NAO_AUTORIZADO' || e.codigo === 'MANUTENCAO')) {
        toast(e.mensagem, 'erro');
      } else {
        toast('Não foi possível salvar: ' + ((e && e.mensagem) || 'erro inesperado') + ' Suas alterações continuam na tela.',
          'erro', 'Tentar de novo', salvar);
      }
      return;
    }
    E.salvando = false;
    aplicarResultado(resp);
  }

  function aplicarResultado(resp) {
    const chave = function (sku, loja) { return sku + '|' + loja; };
    const porChave = {};
    E.revisao.forEach(function (r) { porChave[chave(r.c.item.sku, r.c.loja)] = r; });
    let gravados = 0;

    (resp.salvos || []).forEach(function (s) {
      const r = porChave[chave(s.sku, s.loja)];
      if (!r) return;
      const c = r.c;
      c.baseCent = centavosDe_(s.preco_base);
      c.versao = Number(s.versao) || c.versao;
      if (!s.sem_mudanca) {
        c.atualizadoEm = s.atualizado_em;
        c.atualizadoPorNome = E.sessao.nome;
        gravados++;
      }
      c.edicao = null;
      c.el.querySelector('.campo').value = formatarNumero_(c.baseCent);
      c.el.querySelector('.campo').placeholder = '';
      atualizarCelula(c);
      r.estado = 'feita';
    });

    (resp.conflitos || []).forEach(function (cf) {
      const r = porChave[chave(cf.sku, cf.loja)];
      if (!r) return;
      const c = r.c;
      c.baseCent = centavosDe_(cf.valor_atual);
      c.versao = Number(cf.versao) || 0;
      c.atualizadoPorNome = cf.atualizado_por_nome || '';
      c.atualizadoEm = cf.atualizado_em || '';
      if (c.edicao && c.edicao.centavos === c.baseCent) {
        c.edicao = null;
        r.estado = 'feita';
      } else {
        r.estado = 'conflito';
        r.conflito = cf;
      }
      atualizarCelula(c);
    });

    (resp.invalidos || []).forEach(function (inv) {
      const r = porChave[chave(inv.sku, inv.loja)];
      if (!r) return;
      r.estado = 'erro';
      r.mensagem = inv.motivo || 'Não foi possível salvar este item.';
    });

    E.revisao = E.revisao.filter(function (r) { return r.estado !== 'feita'; });
    E.itens.forEach(classificar);
    aplicarFiltros();
    atualizarBarra();

    if (gravados) {
      toast(gravados + (gravados === 1 ? ' preço salvo. Entra' : ' preços salvos. Entram') + ' no cálculo do piso no próximo ciclo.');
    }
    if (!E.revisao.length) {
      fecharModal();
      if (!gravados) toast('Nada mudou: os valores já eram esses.');
    } else {
      desenharRevisao();
    }
  }

  // ============================================================
  // 10. CONVITES E ANÚNCIOS
  // ============================================================

  const TIPOS_PROMO = {
    DEAL: 'Oferta', DOD: 'Oferta do dia', LIGHTNING: 'Relâmpago', SMART: 'Co-participação',
    PRICE_MATCHING: 'Preço competitivo', PRICE_MATCHING_MELI_ALL: 'Preço competitivo',
    MARKETPLACE_CAMPAIGN: 'Campanha do ML', SELLER_CAMPAIGN: 'Campanha própria',
    VOLUME: 'Desconto por volume', PRE_NEGOTIATED: 'Pré-negociada', UNHEALTHY_STOCK: 'Estoque parado'
  };

  function alternarConvites(item, botao) {
    item.expandido = !item.expandido;
    botao.setAttribute('aria-expanded', String(item.expandido));
    item.el.querySelector('.expansao').hidden = !item.expandido;
    if (item.expandido) desenharConvites(item);
  }

  function desenharConvites(item) {
    let html = '';
    celulas(item).forEach(function (c) {
      const base = baseEfetiva(c);
      const linhas = [];
      c.anuncios.forEach(function (an) {
        (an.convites || []).forEach(function (cv) {
          const av = avaliarConvite_(cv, an, base);
          const preco = Number(cv.preco_promocional) > 0 ? formatarReais_(centavosDe_(cv.preco_promocional))
            : (Number(cv.preco_min) > 0 || Number(cv.preco_max) > 0
              ? formatarReais_(centavosDe_(cv.preco_min)) + ' – ' + formatarReais_(centavosDe_(cv.preco_max)) : '—');
          const rebate = Number(cv.meli_pct) > 0
            ? formatarPct_(Number(cv.meli_pct), 1) + ' · ' + formatarReais_(centavosDe_(cv.rebate_rs || 0)) : '—';
          let aval;
          if (av.avaliacao === 'acima') aval = '<span class="aval acima">' + icone('ok', 'p') + 'acima do piso</span>';
          else if (av.avaliacao === 'abaixo') aval = '<span class="aval abaixo">' + icone('alerta', 'p') + 'abaixo do piso</span>';
          else if (av.avaliacao === 'sem_preco') aval = '<span class="aval neutra">sem preço da campanha</span>';
          else if (base === null) aval = '<span class="aval neutra">defina a base para avaliar</span>';
          else aval = '<span class="aval neutra">sem piso estimado</span>';
          const titulo = av.efetivoCent !== null ? 'Preço efetivo (com rebate) ≈ ' + formatarReais_(av.efetivoCent) +
            (av.pisoCent !== null ? ' · piso ≈ ' + formatarReais_(av.pisoCent) : '') : '';
          linhas.push('<tr><td>' + esc(cv.nome || '—') + '<div class="sku" style="font:11.5px var(--mono);color:var(--text-3)">' +
            esc(an.item_id) + '</div></td><td>' + esc(TIPOS_PROMO[cv.tipo] || cv.tipo || '—') + '</td><td>' +
            esc(dataCurta(cv.prazo_adesao)) + '</td><td>' + esc(preco) + '</td><td>' + esc(rebate) + '</td><td title="' +
            esc(titulo) + '">' + aval + '</td></tr>');
        });
      });
      if (!linhas.length) return;
      html += '<h4>Loja ' + esc(c.loja) + '</h4><table><thead><tr><th>Campanha</th><th>Tipo</th><th>Prazo de adesão</th>' +
        '<th>Preço promocional</th><th>Rebate ML</th><th>Contra o piso ≈ com a base da tela</th></tr></thead><tbody>' +
        linhas.join('') + '</tbody></table>';
    });
    html += '<div class="rodape">A adesão é feita pelo e-commerce.</div>';
    item.el.querySelector('.expansao').innerHTML = html;
  }

  function abrirAnuncios(item, botao) {
    const pop = $('popover');
    let html = '';
    celulas(item).forEach(function (c) {
      html += '<h5>Loja ' + esc(c.loja) + '</h5>';
      c.anuncios.forEach(function (an) {
        const tipo = an.listing_type_id === 'gold_pro' ? 'Premium' : (an.listing_type_id === 'gold_special' ? 'Clássico' : an.listing_type_id);
        html += '<a href="' + esc(linkSeguro(an.permalink)) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="id">' + esc(an.item_id) + '</span><span>' + esc(tipo || '') + (an.catalog_listing ? ' · catálogo' : '') +
          '</span><span class="preco">' + esc(an.preco_atual === null ? '' : formatarReais_(centavosDe_(an.preco_atual))) + '</span>' +
          icone('externo', 'p') + '</a>';
      });
    });
    pop.innerHTML = html;
    pop.hidden = false;
    const r = botao.getBoundingClientRect();
    pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - pop.offsetWidth - 8)) + 'px';
    pop.dataset.dono = item.sku;
    const primeiro = pop.querySelector('a');
    if (primeiro) primeiro.focus();
  }

  function fecharPopover() { $('popover').hidden = true; }

  /** Só links http(s): o permalink vem do ML, mas não custa conferir. */
  function linkSeguro(url) {
    return /^https?:\/\//i.test(String(url || '')) ? url : '#';
  }

  // ============================================================
  // 11. TELAS, MODAL E AVISOS
  // ============================================================

  function mostrarTela(qual) {
    $('tela-login').hidden = qual !== 'login';
    $('tela-aviso').hidden = qual !== 'aviso';
    $('tela-portal').hidden = qual !== 'portal';
    if (qual !== 'portal') {
      $('barra').hidden = true;
      $('faixa-velho').hidden = true;
    }
  }

  function mostrarLogin() {
    mostrarTela('login');
    $('usuario').hidden = true;
    $('dados-de').textContent = '';
    desenharBotaoGoogle($('botao-google'), true);
  }

  function mostrarAviso(titulo, texto, rotuloBotao, acao) {
    mostrarTela('aviso');
    $('aviso-titulo').textContent = titulo;
    $('aviso-texto').textContent = texto;
    const b = $('aviso-botao');
    b.hidden = !rotuloBotao;
    b.textContent = rotuloBotao || '';
    b.onclick = acao || null;
  }

  function mostrarUsuario(nome, email) {
    $('usuario').hidden = !nome;
    $('nome-usuario').textContent = nome;
    $('menu-nome').textContent = nome;
    $('menu-email').textContent = email;
    $('avatar').textContent = iniciais(nome);
  }

  function mostrarIdadeDosDados(iso) {
    const faixa = $('faixa-velho');
    if (!iso) {
      $('dados-de').textContent = 'dados ainda não exportados';
      faixa.hidden = false;
      $('faixa-velho-texto').textContent = 'Os dados de anúncios ainda não foram exportados pelo e-commerce.';
      return;
    }
    $('dados-de').textContent = 'dados de ' + dataCurta(iso);
    const quando = dataLocal(iso);
    const horas = quando ? (Date.now() - quando.getTime()) / 3600000 : 0;
    const velho = horas > Number(E.sessao.espelho_velho_horas || 30);
    faixa.hidden = !velho;
    if (velho) $('faixa-velho-texto').textContent = 'Os dados de anúncios estão desatualizados desde ' + dataCurta(iso) +
      '. Dá para editar normalmente; o alerta de catálogo pode não refletir hoje.';
  }

  let modalAoFechar = null;
  let focoAntesDoModal = null;

  function abrirModal(html, opcoes) {
    const o = opcoes || {};
    const raiz = $('raiz-modal');
    const jaAberto = !!raiz.firstChild;
    if (!jaAberto) focoAntesDoModal = document.activeElement;
    raiz.innerHTML = '<div class="fundo-modal"' + (o.semFechar ? ' data-fixo="1"' : '') + '><div class="modal" role="dialog" aria-modal="true"' +
      (o.estreito ? ' style="max-width:440px"' : '') + '>' + html + '</div></div>';
    modalAoFechar = o.aoFechar || null;
    if (!jaAberto) {
      const alvo = raiz.querySelector('input[type=checkbox], button.primario:not([disabled]), button, textarea');
      if (alvo) alvo.focus();
    }
  }

  function fecharModal() {
    const raiz = $('raiz-modal');
    if (!raiz.firstChild) return;
    raiz.innerHTML = '';
    const f = modalAoFechar;
    modalAoFechar = null;
    if (f) f();
    if (focoAntesDoModal && document.contains(focoAntesDoModal)) focoAntesDoModal.focus();
  }

  function toast(texto, tipo, rotuloAcao, acao) {
    const el = document.createElement('div');
    el.className = 'toast' + (tipo === 'erro' ? ' erro' : '');
    el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    const span = document.createElement('span');
    span.textContent = texto;
    el.appendChild(span);
    if (rotuloAcao) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = rotuloAcao;
      b.onclick = function () { el.remove(); acao(); };
      el.appendChild(b);
    }
    $('toasts').appendChild(el);
    setTimeout(function () { el.remove(); }, rotuloAcao ? 15000 : 6000);
  }

  // ============================================================
  // 12. EVENTOS
  // ============================================================

  function ligarEventos() {
    const linhas = $('linhas');

    linhas.addEventListener('focusin', function (ev) {
      if (ev.target.classList.contains('campo')) {
        const campo = ev.target;
        // select() também DÁ foco ao campo: só seleciona se o foco ainda está
        // nele. Sem isso, um select() atrasado puxa o foco de volta da janela de
        // revisão e a observação digitada vai parar dentro de um preço.
        setTimeout(function () { if (document.activeElement === campo) campo.select(); }, 0);
      }
    });

    linhas.addEventListener('input', function (ev) {
      if (!ev.target.classList.contains('campo')) return;
      const c = celulaDoEvento(ev.target);
      if (!c) return;
      clearTimeout(c.espera);
      const texto = ev.target.value;
      c.espera = setTimeout(function () { processarEdicao(c, texto); }, ESPERA_EDICAO_MS);
    });

    linhas.addEventListener('keydown', function (ev) {
      if (!ev.target.classList.contains('campo')) return;
      const c = celulaDoEvento(ev.target);
      if (!c) return;
      if (ev.key === 'Enter') {
        ev.preventDefault();
        processarEdicao(c, ev.target.value);
        arrumarCampo(c);
        descer(c);
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        reverter(c);
        ev.target.select();
      }
    });

    linhas.addEventListener('focusout', function (ev) {
      if (!ev.target.classList.contains('campo')) return;
      const c = celulaDoEvento(ev.target);
      if (!c) return;
      processarEdicao(c, ev.target.value);
      arrumarCampo(c);
    });

    // "Usar" com o campo em edição: sem isto, o mousedown tira o foco do campo,
    // a célula é recalculada e o botão é trocado antes de o clique chegar
    // por isso, com o mouse, "Usar" age já no mousedown; Enter/Espaço no
    // botão (teclado) chegam pelo click, com ev.detail = 0
    linhas.addEventListener('mousedown', function (ev) {
      const usar = ev.target.closest('[data-acao="usar"]');
      if (!usar || ev.button !== 0) return;
      ev.preventDefault();
      usarBase(usar);
    });

    linhas.addEventListener('click', function (ev) {
      const alvo = ev.target.closest('[data-acao]');
      if (!alvo) return;
      const linha = alvo.closest('.linha');
      const item = linha && E.porSku[linha.dataset.sku];
      if (!item) return;
      if (alvo.dataset.acao === 'usar') {
        if (ev.detail === 0) usarBase(alvo);   // o clique do mouse já foi tratado no mousedown
      } else if (alvo.dataset.acao === 'convites') {
        alternarConvites(item, alvo);
      } else if (alvo.dataset.acao === 'anuncios') {
        ev.stopPropagation();
        if (!$('popover').hidden && $('popover').dataset.dono === item.sku) fecharPopover();
        else abrirAnuncios(item, alvo);
      }
    });

    document.addEventListener('click', function (ev) {
      if (!$('popover').hidden && !ev.target.closest('#popover') && !ev.target.closest('[data-acao="anuncios"]')) fecharPopover();
      if (!ev.target.closest('#usuario')) $('menu-usuario').hidden = true;
    });

    $('raiz-modal').addEventListener('click', function (ev) {
      const alvo = ev.target.closest('[data-revisao]');
      if (alvo && alvo.dataset.revisao !== 'confirmar' && alvo.dataset.revisao !== 'obs') { cliqueRevisao(alvo); return; }
      const fundo = ev.target.classList.contains('fundo-modal') ? ev.target : null;
      if (fundo && !fundo.dataset.fixo && !E.salvando) fecharModal();
    });
    $('raiz-modal').addEventListener('change', function (ev) {
      const alvo = ev.target;
      if (alvo.dataset.revisao === 'confirmar' && E.revisao) {
        E.revisao[Number(alvo.dataset.i)].confirmado = alvo.checked;
        desenharRevisao();
      }
    });
    $('raiz-modal').addEventListener('input', function (ev) {
      const alvo = ev.target;
      if (alvo.dataset.revisao === 'obs' && E.revisao) E.revisao[Number(alvo.dataset.i)].obs = alvo.value;
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (!$('popover').hidden) { fecharPopover(); return; }
        const fundo = document.querySelector('.fundo-modal');
        if (fundo && !fundo.dataset.fixo && !E.salvando) { fecharModal(); return; }
        $('menu-usuario').hidden = true;
      }
      const tag = (ev.target.tagName || '').toLowerCase();
      if (ev.key === '/' && tag !== 'input' && tag !== 'textarea' && tag !== 'select' && !$('tela-portal').hidden) {
        ev.preventDefault();
        $('busca').focus();
      }
    });

    let esperaBusca = null;
    $('busca').addEventListener('input', function (ev) {
      clearTimeout(esperaBusca);
      const v = ev.target.value;
      esperaBusca = setTimeout(function () { E.filtro.busca = v; aplicarFiltros(); }, 80);
    });
    document.querySelectorAll('.chip, .cartao').forEach(function (b) {
      b.addEventListener('click', function () { mudarChip(b.dataset.chip); });
    });
    $('filtro-comprador').addEventListener('change', function (ev) {
      E.filtro.comprador = ev.target.value;
      aplicarFiltros();
    });

    $('btn-usuario').addEventListener('click', function () {
      const m = $('menu-usuario');
      m.hidden = !m.hidden;
      $('btn-usuario').setAttribute('aria-expanded', String(!m.hidden));
    });
    $('btn-sair').addEventListener('click', sair);
    $('btn-descartar').addEventListener('click', descartarTudo);
    $('btn-revisar').addEventListener('click', abrirRevisao);

    window.addEventListener('beforeunload', function (ev) {
      if (contarAlteracoes().validas) {
        ev.preventDefault();
        ev.returnValue = '';
      }
    });
  }

  // ============================================================
  // 13. MIUDEZAS
  // ============================================================

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cssEsc(s) {
    return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  function iniciais(nome) {
    const p = String(nome || '?').trim().split(/\s+/);
    return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }

  /** "2026-10-21T14:05:00" (hora de São Paulo) -> Date local. */
  function dataLocal(iso) {
    const s = String(iso || '');
    if (/[zZ]|[+-]\d\d:?\d\d$/.test(s)) {
      const d = new Date(s);
      return isNaN(d) ? null : d;
    }
    const m = s.match(/^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d))?)?/);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
  }

  function dataCurta(iso) {
    const d = dataLocal(iso);
    if (!d) return String(iso || '—');
    const dois = function (n) { return ('0' + n).slice(-2); };
    return dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ' ' + dois(d.getHours()) + ':' + dois(d.getMinutes());
  }

  function horaCurta(iso) {
    const d = dataLocal(iso);
    if (!d) return '';
    const dois = function (n) { return ('0' + n).slice(-2); };
    const hoje = new Date();
    const mesmoDia = d.toDateString() === hoje.toDateString();
    return (mesmoDia ? '' : dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + ' ') + dois(d.getHours()) + ':' + dois(d.getMinutes());
  }

  const ICONES = {
    alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    dividindo: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
    loja: '<path d="M3 9.5 4.6 4h14.8L21 9.5"/><path d="M4 9.5V20h16V9.5"/><path d="M9.5 20v-5.5h5V20"/>',
    sobe: '<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    externo: '<path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/>',
    lapis: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
  };

  function icone(nome, tamanho) {
    return '<svg class="icone' + (tamanho ? ' ' + tamanho : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nome] || '') + '</svg>';
  }

  // ganchos para testes automatizados (não mudam nada no uso normal)
  window.__mlPrecos = { estado: E, aoReceberCredencial: aoReceberCredencial };

  iniciar();
})();

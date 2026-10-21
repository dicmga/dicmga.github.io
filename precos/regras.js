/**
 * ============================================================
 * REGRAS DE NEGÓCIO DO PREÇO BASE  (versão 1.0)
 * ML-Precos — portal de preço base para os compradores
 * ============================================================
 *
 * ESTE ARQUIVO EXISTE EM DOIS LUGARES, COM O MESMO CONTEÚDO:
 *   - no front-end:      precos/regras.js           (GitHub Pages)
 *   - no Apps Script:    03_regras.gs               (projeto ML-Precos)
 * O front usa para mostrar o alerta enquanto o comprador digita; o
 * servidor usa para gravar no log o estado do alerta com o valor salvo.
 * Mudou um, copie para o outro: assim tela e log nunca discordam.
 *
 * Só funções puras: nada de planilha, rede ou tela. Tudo em CENTAVOS
 * (inteiros) para não errar centavo com ponto flutuante.
 *
 * O QUE ESTÁ AQUI (seção 11 da spec)
 *   interpretarValor_    texto digitado -> centavos (11.7)
 *   pisoEstimado_        piso de um anúncio com uma base (11.1)
 *   baseMaxima_          maior base que ainda compete no catálogo (11.2)
 *   avaliarAnuncio_      estado do alerta de um anúncio (11.3)
 *   avaliarLoja_         pior estado entre os anúncios da loja (11.3)
 *   avaliarConvite_      convite de promoção contra o piso (12.4)
 *   textoAlerta_         a frase que aparece na tela e no e-mail
 */


// ============================================================
// 1. ESTADOS DO ALERTA
// ============================================================

/**
 * sev: quanto maior, pior (agregação da loja mostra o de maior sev).
 * cor: vermelho só para o bloqueio pela base.
 * Os três "cinza" além da spec:
 *   sem_estimativa  falta tarifa ou frete: não dá para estimar o piso
 *   sem_base        catálogo disputável, mas ainda sem preço base
 */
const ESTADOS_ALERTA_ = {
  bloqueado_pela_base: { sev: 70, cor: 'vermelho' },
  dividindo:           { sev: 60, cor: 'ambar' },
  nosso:               { sev: 50, cor: 'azul' },
  sem_estimativa:      { sev: 43, cor: 'cinza' },
  sem_base:            { sev: 42, cor: 'cinza' },
  ganhavel:            { sev: 41, cor: 'cinza' },
  sem_dado:            { sev: 40, cor: 'cinza' },
  ganhando:            { sev: 10, cor: 'verde' },
  nao_catalogo:        { sev: 0,  cor: '' }
};

/** Maior valor aceito no campo (R$ 999.999,99). */
const MAX_CENTAVOS_ = 99999999;


// ============================================================
// 2. VALORES E FORMATAÇÃO
// ============================================================

/**
 * Lê o que o comprador digitou. Aceita 95 · 95,5 · 95,50 · 1.234,56 ·
 * R$ 1.234,56 · 95.50. Regra: havendo vírgula, ela é o decimal e os pontos
 * são milhar; sem vírgula, um único ponto seguido de 1 ou 2 dígitos é o
 * decimal; qualquer outro ponto é milhar.
 * @return {{centavos:number}|{erro:string}|{vazio:true}}
 */
function interpretarValor_(texto) {
  let s = String(texto === null || texto === undefined ? '' : texto)
    .replace(/[\s ]/g, '')
    .replace(/^R\$/i, '');
  if (s === '') return { vazio: true };
  if (/^[-−]/.test(s)) return { erro: 'O valor precisa ser maior que zero.' };

  if (s.indexOf(',') >= 0) {
    if (s.split(',').length > 2) return { erro: 'Valor inválido. Use, por exemplo, 95,50.' };
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    const pontos = s.split('.').length - 1;
    if (!(pontos === 1 && /\.\d{1,2}$/.test(s))) s = s.replace(/\./g, '');
  }

  if (!/^\d{1,8}(\.\d{1,2})?$/.test(s)) {
    return { erro: 'Valor inválido. Use, por exemplo, 95,50.' };
  }
  const partes = s.split('.');
  const centavos = Number(partes[0]) * 100 + (partes[1] ? Number((partes[1] + '0').substring(0, 2)) : 0);
  if (!(centavos > 0)) return { erro: 'O valor precisa ser maior que zero.' };
  if (centavos > MAX_CENTAVOS_) return { erro: 'Valor alto demais para um preço base.' };
  return { centavos: centavos };
}

/** Reais (número) -> centavos inteiros; null se não for número. */
function centavosDe_(reais) {
  if (reais === null || reais === undefined || reais === '') return null;
  const n = Number(reais);
  if (!isFinite(n)) return null;
  return Math.round((n + (n >= 0 ? 1e-9 : -1e-9)) * 100);
}

/** Centavos -> reais (número com 2 casas). */
function reaisDe_(centavos) {
  return Math.round(centavos) / 100;
}

/** 123456 -> "R$ 1.234,56" (com espaço que não quebra). */
function formatarReais_(centavos) {
  if (centavos === null || centavos === undefined || !isFinite(centavos)) return '—';
  const abs = Math.abs(Math.round(centavos));
  const inteiro = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = ('0' + (abs % 100)).slice(-2);
  return (centavos < 0 ? '−' : '') + 'R$ ' + inteiro + ',' + dec;
}

/** 123456 -> "1.234,56" (para o campo de edição). */
function formatarNumero_(centavos) {
  return formatarReais_(centavos).replace('R$ ', '');
}

/**
 * Percentual com vírgula: -22 -> "−22%", 8.66 com 1 casa -> "8,7%".
 * `sinal` = true põe "+" nos positivos.
 */
function formatarPct_(x, casas, sinal) {
  if (x === null || x === undefined || !isFinite(x)) return '—';
  const c = casas === undefined ? 0 : casas;
  const fator = Math.pow(10, c);
  const v = Math.round(Math.abs(x) * fator) / fator;
  const txt = v.toFixed(c).replace('.', ',');
  if (v === 0) return txt + '%';
  return (x < 0 ? '−' : (sinal ? '+' : '')) + txt + '%';
}

/** Variação em % de `antes` para `depois` (centavos); null se não havia antes. */
function variacaoPct_(antes, depois) {
  if (!antes || antes <= 0 || depois === null || depois === undefined) return null;
  return (depois / antes - 1) * 100;
}

/**
 * A variação passa do limite e precisa de confirmação? Exatamente no
 * limite não precisa (a folga absorve o ponto flutuante: 8500/10000 − 1
 * dá −15,000000000000002).
 */
function precisaConfirmar_(antes, depois, limitePct) {
  const v = variacaoPct_(antes, depois);
  return v !== null && Math.abs(v) - Number(limitePct) > 1e-9;
}


// ============================================================
// 3. PISO E BASE MÁXIMA
// ============================================================

/** Arredonda reais para centavos (meio para cima, sem tropeçar no 0,005). */
function paraCentavos_(reais) {
  return Math.round((reais + 1e-9) * 100);
}

/**
 * Piso estimado de um anúncio com a base `baseCent` (11.1).
 *   liquido: (B + tarifa_fixa + frete) / (1 − tarifa_pct/100)
 *   final:   B
 * Estimado: a tarifa vem da faixa do preço atual; o oficial é o do
 * calcularPiso() no ML-Automacao, que itera pela faixa.
 * @return {{centavos:number}|{motivo:string}}  motivo: sem_tarifa | sem_frete | comissao_invalida
 */
function pisoEstimado_(an, baseCent) {
  if (baseCent === null || baseCent === undefined) return { motivo: 'sem_base' };
  if (String(an.modo_base || 'liquido').toLowerCase() === 'final') return { centavos: baseCent };
  const t = custosDoAnuncio_(an);
  if (t.motivo) return { motivo: t.motivo };
  const piso = (baseCent / 100 + t.fixa + t.frete) / (1 - t.pct / 100);
  return { centavos: paraCentavos_(piso) };
}

/**
 * Maior base que ainda deixa o piso no preço para ganhar (11.2),
 * arredondada PARA BAIXO ao centavo: usar exatamente esse valor garante
 * piso <= price_to_win.
 * @return {{centavos:number}|{naoCobre:true}|{motivo:string}|null}  null = sem price_to_win
 */
function baseMaxima_(an) {
  const ptw = Number(an.price_to_win);
  if (!(ptw > 0)) return null;
  if (String(an.modo_base || 'liquido').toLowerCase() === 'final') {
    return { centavos: Math.floor(ptw * 100 + 1e-6) };
  }
  const t = custosDoAnuncio_(an);
  if (t.motivo) return { motivo: t.motivo };
  const base = ptw * (1 - t.pct / 100) - t.fixa - t.frete;
  const centavos = Math.floor(base * 100 + 1e-6);
  if (centavos <= 0) return { naoCobre: true };
  return { centavos: centavos };
}

/** Comissão, parcela fixa e frete do anúncio, ou o motivo de não ter. */
function custosDoAnuncio_(an) {
  const pct = an.tarifa_pct;
  if (pct === null || pct === undefined || pct === '' || !isFinite(Number(pct))) return { motivo: 'sem_tarifa' };
  if (Number(pct) >= 100) return { motivo: 'comissao_invalida' };
  if (an.frete_pendente === true) return { motivo: 'sem_frete' };
  return {
    pct: Number(pct),
    fixa: Number(an.tarifa_fixa) || 0,
    frete: Number(an.frete_estimado) || 0
  };
}


// ============================================================
// 4. ALERTA DE CATÁLOGO
// ============================================================

/**
 * Estado do alerta de um anúncio com a base `baseCent` (11.3).
 * `baseCent` null = SKU × loja ainda sem preço base (pendência).
 */
function avaliarAnuncio_(an, baseCent) {
  const piso = pisoEstimado_(an, baseCent);
  const r = {
    anuncio: an,
    estado: 'sem_dado',
    pisoCent: piso.centavos === undefined ? null : piso.centavos,
    motivoPiso: piso.motivo || '',
    ptwCent: null,
    difCent: null,
    difPct: null,
    baseMaxCent: null,
    naoCobre: false
  };

  if (an.catalog_listing !== true) { r.estado = 'nao_catalogo'; return r; }

  const st = String(an.comp_status || '');
  if (st === 'winning') { r.estado = 'ganhando'; return r; }
  if (st === 'sharing_first_place') { r.estado = 'dividindo'; return r; }
  if (an.vencedor_eh_nosso === true) { r.estado = 'nosso'; return r; }

  const ptw = centavosDe_(an.price_to_win);
  if (st !== 'competing' || !(ptw > 0)) { r.estado = 'sem_dado'; return r; }

  r.ptwCent = ptw;
  const bm = baseMaxima_(an);
  if (bm && bm.centavos !== undefined) r.baseMaxCent = bm.centavos;
  if (bm && bm.naoCobre) r.naoCobre = true;

  if (baseCent === null || baseCent === undefined) { r.estado = 'sem_base'; return r; }
  if (r.pisoCent === null) { r.estado = 'sem_estimativa'; return r; }

  if (r.pisoCent > ptw) {
    r.estado = 'bloqueado_pela_base';
    r.difCent = r.pisoCent - ptw;
    r.difPct = r.difCent / ptw * 100;
  } else {
    r.estado = 'ganhavel';
  }
  return r;
}

/**
 * Avalia todos os anúncios do SKU numa loja e escolhe o pior (11.3):
 * vermelho > âmbar > azul > cinza > verde; entre vermelhos, o de maior D.
 * @return {{pior:Object, todas:Object[], pisoCent:number|null, estado:string}}
 *   pisoCent: o do pior anúncio; se ele não tiver piso, o maior entre os anúncios
 */
function avaliarLoja_(anuncios, baseCent) {
  const todas = (anuncios || []).map(function (an) { return avaliarAnuncio_(an, baseCent); });
  let pior = null;
  todas.forEach(function (a) {
    if (!pior) { pior = a; return; }
    const sa = ESTADOS_ALERTA_[a.estado].sev, sp = ESTADOS_ALERTA_[pior.estado].sev;
    if (sa > sp || (sa === sp && a.estado === 'bloqueado_pela_base' && a.difCent > pior.difCent)) pior = a;
  });
  let pisoCent = pior ? pior.pisoCent : null;
  if (pisoCent === null) {
    todas.forEach(function (a) { if (a.pisoCent !== null && (pisoCent === null || a.pisoCent > pisoCent)) pisoCent = a.pisoCent; });
  }
  return { pior: pior, todas: todas, pisoCent: pisoCent, estado: pior ? pior.estado : 'nao_catalogo' };
}

/** Frase do alerta (tela e e-mail). Vazio para anúncio fora de catálogo. */
function textoAlerta_(av) {
  if (!av) return '';
  switch (av.estado) {
    case 'ganhando': return 'Ganhando o catálogo';
    case 'dividindo': return 'Dividindo o 1º lugar';
    case 'nosso': return 'Outra loja Dicomp está ganhando';
    case 'ganhavel': return 'Dá pra competir com esta base';
    case 'sem_dado': {
      const m = String(av.anuncio && av.anuncio.comp_motivos || '').trim();
      return 'Sem dado de competição' + (m ? ': ' + m : '');
    }
    case 'sem_estimativa': return 'Piso não estimado: ' + textoMotivoPiso_(av.motivoPiso);
    case 'sem_base':
      if (av.naoCobre) return 'Preço p/ ganhar ' + formatarReais_(av.ptwCent) + ' não cobre as taxas do ML';
      return 'Preço p/ ganhar ' + formatarReais_(av.ptwCent) +
        (av.baseMaxCent !== null ? ' · Base p/ competir ≈ ' + formatarReais_(av.baseMaxCent) : '');
    case 'bloqueado_pela_base':
      return 'Piso ≈ ' + formatarReais_(av.pisoCent) + ' está ' + formatarReais_(av.difCent) +
        ' (' + formatarPct_(av.difPct, 1) + ') acima do preço p/ ganhar ' + formatarReais_(av.ptwCent) +
        (av.naoCobre ? ' · Preço para ganhar não cobre as taxas do ML'
          : (av.baseMaxCent !== null ? ' · Base p/ competir ≈ ' + formatarReais_(av.baseMaxCent) : ''));
    default: return '';
  }
}

function textoMotivoPiso_(motivo) {
  switch (motivo) {
    case 'sem_tarifa': return 'falta a tarifa desta categoria';
    case 'sem_frete': return 'o frete deste anúncio ainda não foi consultado';
    case 'comissao_invalida': return 'comissão inválida no cadastro';
    default: return 'faltam dados do anúncio';
  }
}


// ============================================================
// 5. CONVITES DE PROMOÇÃO
// ============================================================

/**
 * Convite contra o piso estimado com a base da tela (12.4). Mesma conta
 * do 18_promocoes do ML-Automacao: o rebate do ML é convertido pela
 * comissão, porque a comissão incide sobre o preço pago e não sobre ele.
 *   efetivo = preço da campanha + rebate / (1 − comissão)
 * Faixa (sem preço sugerido): usa o preço máximo aceito.
 * @return {{avaliacao:string, efetivoCent:number|null, pisoCent:number|null}}
 *   avaliacao: acima | abaixo | sem_piso | sem_preco
 */
function avaliarConvite_(conv, an, baseCent) {
  const preco = Number(conv.preco_promocional) > 0 ? Number(conv.preco_promocional)
    : (Number(conv.preco_max) > 0 ? Number(conv.preco_max) : 0);
  if (!preco) return { avaliacao: 'sem_preco', efetivoCent: null, pisoCent: null };

  const pct = Number(an.tarifa_pct);
  const comissao = pct > 0 && pct < 100 ? pct / 100 : 0;
  const rebate = Number(conv.rebate_rs) || 0;
  const efetivoCent = paraCentavos_(preco + rebate / (1 - comissao));

  const piso = pisoEstimado_(an, baseCent);
  if (piso.centavos === undefined) return { avaliacao: 'sem_piso', efetivoCent: efetivoCent, pisoCent: null };
  return {
    avaliacao: efetivoCent >= piso.centavos ? 'acima' : 'abaixo',
    efetivoCent: efetivoCent,
    pisoCent: piso.centavos
  };
}

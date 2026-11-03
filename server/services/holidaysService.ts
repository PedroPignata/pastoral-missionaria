/**
 * Serviço de Feriados Oficiais e Datas Comemorativas
 * Abrangência:
 * 1. Feriados Nacionais do Brasil (Leis Federais nº 662/1949, 10.607/2002 e 14.759/2023)
 * 2. Feriados Distritais do Distrito Federal (Lei Distrital nº 893/1995)
 * 3. Pontos Facultativos Oficiais do GDF (Decretos Distritais nº 48.117/2025 e 49.585/2026)
 * 4. Data Comemorativa Local de Planaltina-DF (19 de Agosto - Fundação de 1859)
 */

export interface HolidayItem {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'nacional' | 'distrital' | 'facultativo' | 'comemorativa';
  type_label: string;
  description: string;
  is_holiday: true;
}

// Algoritmo de Butcher/Meeus para cálculo da Páscoa para qualquer ano Gregoriano
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month, day));
}

function addDays(baseDate: Date, days: number): string {
  const res = new Date(baseDate.getTime() + days * 86400000);
  return res.toISOString().split('T')[0];
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getHolidaysForYear(year: number): HolidayItem[] {
  const holidays: HolidayItem[] = [];

  const easter = getEasterSunday(year);

  // Datas Móveis Baseadas na Páscoa
  const carnavalSegunda = addDays(easter, -48);
  const carnavalTerca = addDays(easter, -47);
  const cinzas = addDays(easter, -46);
  const paixaoCristo = addDays(easter, -2);
  const corpusChristi = addDays(easter, 60);

  // 1. Feriados Nacionais Fixos e Móveis
  holidays.push({
    id: `hol_nacional_confraternizacao_${year}`,
    name: 'Confraternização Universal',
    date: formatDate(year, 1, 1),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Início do ano civil e dia da fraternidade universal.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_paixao_${year}`,
    name: 'Sexta-feira Santa (Paixão de Cristo)',
    date: paixaoCristo,
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Memória da Paixão e Morte de Nosso Senhor Jesus Cristo.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_tiradentes_brasilia_${year}`,
    name: 'Tiradentes / Aniversário de Brasília',
    date: formatDate(year, 4, 21),
    type: 'nacional',
    type_label: 'Feriado Nacional e Distrital',
    description: 'Feriado nacional (Tiradentes) e feriado distrital comemorativo da fundação de Brasília.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_trabalho_${year}`,
    name: 'Dia Mundial do Trabalho',
    date: formatDate(year, 5, 1),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Dia internacional de celebração e dignidade dos trabalhadores.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_independencia_${year}`,
    name: 'Independência do Brasil',
    date: formatDate(year, 9, 7),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Proclamação da Independência do Brasil (1822).',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_aparecida_${year}`,
    name: 'Nossa Senhora Aparecida',
    date: formatDate(year, 10, 12),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Solenidade de Nossa Senhora da Conceição Aparecida, Rainha e Padroeira do Brasil.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_finados_${year}`,
    name: 'Finados',
    date: formatDate(year, 11, 2),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Comemoração de todos os fiéis defuntos.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_proclamacao_${year}`,
    name: 'Proclamação da República',
    date: formatDate(year, 11, 15),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Proclamação da República Brasileira (1889).',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_consciencia_negra_${year}`,
    name: 'Dia Nacional de Zumbi e da Consciência Negra',
    date: formatDate(year, 11, 20),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Feriado nacional oficializado pela Lei nº 14.759/2023.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_nacional_natal_${year}`,
    name: 'Natal de Nosso Senhor Jesus Cristo',
    date: formatDate(year, 12, 25),
    type: 'nacional',
    type_label: 'Feriado Nacional',
    description: 'Celebração do Nascimento de Jesus Cristo, Salvador do mundo.',
    is_holiday: true,
  });

  // 2. Feriados Distritais do Distrito Federal (Lei Distrital nº 893/1995)
  holidays.push({
    id: `hol_distrital_corpus_christi_${year}`,
    name: 'Corpus Christi',
    date: corpusChristi,
    type: 'distrital',
    type_label: 'Feriado Distrital (DF)',
    description: 'Feriado no Distrito Federal (Solenidade do Santíssimo Sacramento do Corpo e Sangue de Cristo).',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_distrital_evangelico_${year}`,
    name: 'Dia do Evangélico',
    date: formatDate(year, 11, 30),
    type: 'distrital',
    type_label: 'Feriado Distrital (DF)',
    description: 'Feriado distrital no DF conforme Lei Distrital nº 893/1995.',
    is_holiday: true,
  });

  // 3. Pontos Facultativos Oficiais (GDF)
  holidays.push({
    id: `hol_facultativo_carnaval_seg_${year}`,
    name: 'Carnaval (Segunda-feira)',
    date: carnavalSegunda,
    type: 'facultativo',
    type_label: 'Ponto Facultativo',
    description: 'Ponto facultativo na administração pública.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_facultativo_carnaval_ter_${year}`,
    name: 'Carnaval (Terça-feira)',
    date: carnavalTerca,
    type: 'facultativo',
    type_label: 'Ponto Facultativo',
    description: 'Ponto facultativo na administração pública.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_facultativo_cinzas_${year}`,
    name: 'Quarta-feira de Cinzas',
    date: cinzas,
    type: 'facultativo',
    type_label: 'Ponto Facultativo (até 14h)',
    description: 'Início da Quaresma. Ponto facultativo até as 14 horas.',
    is_holiday: true,
  });

  // Dia do Servidor Público (GDF):
  // No ano de 2026, alterado para 30 de Outubro de 2026 conforme Decreto nº 49.585/2026 do GDF
  const servidorPublicoDate = year === 2026 ? formatDate(2026, 10, 30) : formatDate(year, 10, 28);
  holidays.push({
    id: `hol_facultativo_servidor_${year}`,
    name: 'Dia do Servidor Público',
    date: servidorPublicoDate,
    type: 'facultativo',
    type_label: 'Ponto Facultativo (GDF)',
    description: year === 2026
      ? 'Comemoração transferida para 30/10/2026 no Distrito Federal conforme Decreto nº 49.585/2026.'
      : 'Ponto facultativo em homenagem aos servidores públicos.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_facultativo_vespera_natal_${year}`,
    name: 'Véspera de Natal',
    date: formatDate(year, 12, 24),
    type: 'facultativo',
    type_label: 'Ponto Facultativo (após 14h)',
    description: 'Véspera do Natal do Senhor.',
    is_holiday: true,
  });

  holidays.push({
    id: `hol_facultativo_vespera_ano_novo_${year}`,
    name: 'Véspera de Ano Novo',
    date: formatDate(year, 12, 31),
    type: 'facultativo',
    type_label: 'Ponto Facultativo (após 14h)',
    description: 'Véspera do Ano Novo.',
    is_holiday: true,
  });

  // 4. Data Comemorativa Local de Planaltina-DF
  holidays.push({
    id: `hol_comemorativa_planaltina_${year}`,
    name: 'Aniversário de Planaltina-DF',
    date: formatDate(year, 8, 19),
    type: 'comemorativa',
    type_label: 'Data Comemorativa Local',
    description: 'Comemoração da fundação de Planaltina-DF (19 de agosto de 1859 - Mestre D’Armas).',
    is_holiday: true,
  });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

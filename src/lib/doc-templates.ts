// Modelos de documentos psicológicos — estrutura baseada na Resolução CFP nº 06/2019.
export type TemplateCtx = {
  patient: string;
  cpf?: string;
  psychologist: string;
  crp?: string | null;
  city?: string | null;
  date: string;
};

type DocKey = "ATESTADO" | "DECLARACAO" | "RECIBO" | "RELATORIO" | "LAUDO" | "ENCAMINHAMENTO" | "CONTRATO";

export const DOC_TEMPLATES: Record<DocKey, { title: string; body: (c: TemplateCtx) => string }> = {
  DECLARACAO: {
    title: "Declaração de comparecimento",
    body: (c) =>
      `Declaro, para os devidos fins, que ${c.patient}${c.cpf ? `, inscrito(a) no CPF sob o nº ${c.cpf},` : ""} compareceu a atendimento psicológico nesta data, ${c.date}, no período das __:__ às __:__.

Por ser verdade, firmo a presente declaração.`,
  },
  ATESTADO: {
    title: "Atestado psicológico",
    body: (c) =>
      `Atesto, para fins de [finalidade], que ${c.patient}${c.cpf ? `, CPF ${c.cpf},` : ""} encontra-se em acompanhamento psicológico sob meus cuidados, apresentando [condições psicológicas observadas], necessitando de afastamento de suas atividades pelo período de ___ dias, a contar desta data.

Este atestado foi elaborado com base em [procedimentos utilizados: entrevistas, observação, instrumentos].

O presente documento tem validade apenas para a finalidade a que se destina.`,
  },
  RELATORIO: {
    title: "Relatório psicológico",
    body: (c) =>
      `1. IDENTIFICAÇÃO
Autor(a): ${c.psychologist}${c.crp ? ` — CRP ${c.crp}` : ""}
Interessado(a): ${c.patient}
Solicitante: [nome/instituição]
Finalidade: [finalidade do documento]

2. DESCRIÇÃO DA DEMANDA
[Informações referentes à problemática apresentada e aos motivos, razões e expectativas que produziram a solicitação do documento.]

3. PROCEDIMENTO
[Recursos técnico-científicos utilizados: número de encontros, pessoas ouvidas, instrumentos e técnicas.]

4. ANÁLISE
[Exposição descritiva, metódica e objetiva dos dados colhidos e das situações vividas relacionados à demanda.]

5. CONCLUSÃO
[Conclusões a partir da análise, com encaminhamentos e orientações, quando pertinentes.]

Este documento não pode ser utilizado para fins diferentes do apontado no item de identificação, possui caráter sigiloso e extrajudicial.`,
  },
  LAUDO: {
    title: "Laudo psicológico",
    body: (c) =>
      `1. IDENTIFICAÇÃO
Autor(a): ${c.psychologist}${c.crp ? ` — CRP ${c.crp}` : ""}
Interessado(a): ${c.patient}
Solicitante: [nome/instituição]
Finalidade: [finalidade]

2. DESCRIÇÃO DA DEMANDA
[Descrição da demanda e dos motivos da avaliação psicológica.]

3. PROCEDIMENTO
[Instrumentos, testes psicológicos (com respectivas referências SATEPSI), entrevistas e número de sessões.]

4. ANÁLISE
[Análise dos resultados obtidos, integrando os dados à luz do referencial teórico adotado.]

5. CONCLUSÃO
[Conclusão da avaliação psicológica, hipótese diagnóstica (quando aplicável), prognóstico e encaminhamentos.]

6. REFERÊNCIAS
[Referências bibliográficas utilizadas.]`,
  },
  ENCAMINHAMENTO: {
    title: "Encaminhamento",
    body: (c) =>
      `Ao(À) Dr(a). [nome do profissional] — [especialidade]

Encaminho ${c.patient}, em acompanhamento psicológico sob meus cuidados, para avaliação e conduta em [especialidade], considerando [motivo do encaminhamento].

Coloco-me à disposição para troca de informações que se façam necessárias ao acompanhamento integrado, respeitado o sigilo profissional.

Atenciosamente,`,
  },
  CONTRATO: {
    title: "Contrato terapêutico",
    body: (c) =>
      `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS

Contratante: ${c.patient}${c.cpf ? `, CPF ${c.cpf}` : ""}
Contratado(a): ${c.psychologist}${c.crp ? `, CRP ${c.crp}` : ""}

1. As sessões terão duração de ___ minutos, com frequência [semanal/quinzenal], às [dia da semana] às __:__.
2. O valor de cada sessão é de R$ ______, a ser pago [forma e prazo de pagamento].
3. Faltas e cancelamentos devem ser comunicados com antecedência mínima de 24 horas; caso contrário, a sessão será cobrada.
4. Todo o conteúdo das sessões é sigiloso, conforme o Código de Ética Profissional do Psicólogo, exceto nas situações previstas no art. 10.
5. Os dados pessoais serão tratados em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
6. Este contrato poderá ser encerrado por qualquer das partes, mediante comunicação prévia.

E por estarem de acordo, assinam o presente.


_______________________________
${c.patient}`,
  },
  RECIBO: {
    title: "Recibo",
    body: (c) =>
      `Recebi de ${c.patient}${c.cpf ? `, CPF ${c.cpf},` : ""} a importância de R$ ______ (________________________), referente a ___ sessão(ões) de psicoterapia realizada(s) em ____________.

Para clareza, firmo o presente recibo.`,
  },
};

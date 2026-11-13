import type { Role } from "./session-token";

/** Conteúdo da Central de ajuda. Os textos citam os nomes exatos dos botões das telas. */

export type HelpTopic = { key: string; label: string; roles?: Role[] };

export type HelpArticle = {
  topic: string;
  q: string;
  a: string[];
  link?: { href: string; label: string };
  roles?: Role[];
};

export const HELP_TOPICS: HelpTopic[] = [
  { key: "primeiros", label: "Primeiros passos" },
  { key: "agenda", label: "Agenda" },
  { key: "pacientes", label: "Pacientes" },
  { key: "prontuario", label: "Prontuário", roles: ["ADMIN", "PSICOLOGO"] },
  { key: "financeiro", label: "Financeiro", roles: ["ADMIN", "RECEPCAO"] },
  { key: "documentos", label: "Documentos", roles: ["ADMIN", "PSICOLOGO"] },
  { key: "conta", label: "Conta e acesso" },
];

const CLINICAL: Role[] = ["ADMIN", "PSICOLOGO"];
const FINANCE: Role[] = ["ADMIN", "RECEPCAO"];

export const HELP_ARTICLES: HelpArticle[] = [
  // Primeiros passos
  {
    topic: "primeiros",
    q: "Como encontro um paciente rapidamente?",
    a: [
      "Use a busca no topo da tela: digite parte do nome, o CPF ou o telefone e pressione Enter.",
      "Você também pode abrir o menu Pacientes e usar os filtros de situação.",
    ],
    link: { href: "/pacientes", label: "Abrir Pacientes" },
  },
  {
    topic: "primeiros",
    q: "O que aparece no Painel?",
    a: [
      "O Painel resume o dia: sessões de hoje, próximo atendimento, evoluções pendentes, aniversariantes do mês e indicadores do mês.",
      "Quem tem acesso ao financeiro também vê receitas e pagamentos em atraso.",
    ],
    link: { href: "/", label: "Ir para o Painel" },
  },
  {
    topic: "primeiros",
    q: "Quais são os perfis de acesso?",
    a: [
      "Administrador: acesso completo, incluindo equipe, configurações e auditoria.",
      "Psicólogo(a): agenda, pacientes, prontuário e documentos dos seus pacientes.",
      "Recepção: agenda, cadastro de pacientes e financeiro — nunca vê o prontuário (sigilo profissional).",
    ],
  },

  // Agenda
  {
    topic: "agenda",
    q: "Como agendar uma sessão?",
    a: [
      "Clique em Agendar (no topo da tela) ou vá em Agenda → Agendar.",
      "Escolha o paciente, o profissional, a data, o horário e a duração. Para atendimento presencial, informe a sala; para online, cole o link da chamada.",
      "Clique em salvar. Se houver conflito de horário do profissional ou da sala, o sistema avisa antes de agendar.",
    ],
    link: { href: "/agenda/novo", label: "Agendar agora" },
  },
  {
    topic: "agenda",
    q: "Como criar sessões recorrentes (semanais)?",
    a: [
      "No formulário de agendamento, no campo Repetir, escolha Semanalmente, Quinzenalmente ou Mensalmente.",
      "Em Quantidade de sessões, informe quantas sessões criar (incluindo a primeira, até 52).",
      "Para cancelar as próximas de uma vez, abra uma sessão da série e clique em Cancelar série a partir desta.",
    ],
    link: { href: "/agenda/novo", label: "Criar recorrência" },
  },
  {
    topic: "agenda",
    q: "Preciso encaixar um paciente em horário ocupado. É possível?",
    a: [
      "Sim. No agendamento, marque Ignorar conflitos de horário (encaixe) antes de salvar.",
      "Use com cuidado: o profissional ficará com dois atendimentos no mesmo horário.",
    ],
  },
  {
    topic: "agenda",
    q: "Como confirmar a sessão com o paciente pelo WhatsApp?",
    a: [
      "Abra a sessão na Agenda e clique em Enviar confirmação (WhatsApp).",
      "O WhatsApp abre com a mensagem pronta (data, horário e local). É preciso que o paciente tenha celular cadastrado.",
      "Depois que o paciente responder, clique em Confirmar para atualizar a situação da sessão.",
    ],
  },
  {
    topic: "agenda",
    q: "Como registrar que a sessão aconteceu ou que o paciente faltou?",
    a: [
      "Abra a sessão e clique em Realizada ou em Faltou.",
      "Ao marcar Realizada, a cobrança da sessão é lançada automaticamente no Financeiro.",
      "Em caso de falta sem aviso, aparece a opção Gerar cobrança da falta. Se marcou errado, use Voltar para “Agendado”.",
    ],
  },

  // Pacientes
  {
    topic: "pacientes",
    q: "Como cadastrar um paciente?",
    a: [
      "Vá em Pacientes → Novo paciente e preencha os dados. Ao digitar o CEP, o endereço é preenchido automaticamente.",
      "Para menores de idade, preencha a seção Responsável legal.",
      "Marque o consentimento da LGPD quando o paciente (ou responsável) autorizar o tratamento dos dados.",
    ],
    link: { href: "/pacientes/novo", label: "Cadastrar paciente" },
  },
  {
    topic: "pacientes",
    q: "Como dar alta ou colocar um paciente na lista de espera?",
    a: [
      "Abra a ficha do paciente e altere a situação para Ativo, Inativo, Alta ou Lista de espera.",
      "Pacientes com alta continuam com todo o histórico guardado.",
    ],
  },
  {
    topic: "pacientes",
    q: "Posso exportar a lista de pacientes?",
    a: ["Sim. Em Relatórios, clique em Pacientes (CSV). O arquivo abre no Excel ou no Google Planilhas."],
    link: { href: "/relatorios", label: "Abrir Relatórios" },
  },

  // Prontuário
  {
    topic: "prontuario",
    q: "Como registrar a evolução de uma sessão?",
    roles: CLINICAL,
    a: [
      "Abra a ficha do paciente, vá na aba Evoluções e clique em Nova evolução.",
      "Vincule a sessão realizada, registre humor, evolução, intervenções e plano. A sessão é marcada como realizada automaticamente.",
      "Sessões realizadas sem evolução aparecem no Painel em Evoluções pendentes.",
    ],
  },
  {
    topic: "prontuario",
    q: "Quem pode ver o prontuário?",
    roles: CLINICAL,
    a: [
      "Pelo sigilo profissional (Código de Ética do CFP), só psicólogos acessam anamnese e evoluções: o responsável pelo paciente ou quem já o atendeu. O administrador (responsável técnico) também acessa.",
      "A recepção nunca vê conteúdo clínico. Toda visualização do prontuário fica registrada na auditoria.",
    ],
  },
  {
    topic: "prontuario",
    q: "Onde preencho a anamnese?",
    roles: CLINICAL,
    a: ["Na ficha do paciente, aba Anamnese. Os campos podem ser preenchidos aos poucos e salvos a qualquer momento."],
  },

  // Financeiro
  {
    topic: "financeiro",
    q: "Como registrar que o paciente pagou?",
    roles: FINANCE,
    a: [
      "No Financeiro, encontre o lançamento pendente, escolha a forma de pagamento (Pix, cartão, dinheiro…) e clique em Receber.",
      "Depois de pago, o botão Recibo gera o recibo com valor por extenso, pronto para imprimir ou salvar em PDF.",
    ],
    link: { href: "/financeiro", label: "Abrir Financeiro" },
  },
  {
    topic: "financeiro",
    q: "Como lançar uma despesa (aluguel, internet…)?",
    roles: FINANCE,
    a: ["Em Financeiro → Novo lançamento, escolha o tipo Despesa, a categoria, o valor e o vencimento."],
    link: { href: "/financeiro/novo", label: "Novo lançamento" },
  },
  {
    topic: "financeiro",
    q: "Como vejo quem está em atraso?",
    roles: FINANCE,
    a: [
      "O Painel mostra o total de pagamentos em atraso; clique no aviso para ver a lista.",
      "No Financeiro, use o filtro de vencidos. Em Relatórios, exporte o Financeiro (CSV) para análise.",
    ],
  },

  // Documentos
  {
    topic: "documentos",
    q: "Como emitir uma declaração ou atestado?",
    roles: CLINICAL,
    a: [
      "Vá em Documentos → Novo documento, escolha o paciente e o tipo (declaração, atestado, relatório, laudo, encaminhamento ou contrato).",
      "O texto vem preenchido com um modelo baseado na Resolução CFP 06/2019; revise e salve.",
      "Abra o documento e use Imprimir / Salvar PDF.",
    ],
    link: { href: "/documentos/novo", label: "Novo documento" },
  },

  // Conta
  {
    topic: "conta",
    q: "Como altero minha senha?",
    a: ["Clique na sua foto (canto superior direito) → Meu perfil → seção Alterar senha. Use ao menos 8 caracteres, com letras e números."],
    link: { href: "/perfil", label: "Abrir Meu perfil" },
  },
  {
    topic: "conta",
    q: "Esqueci minha senha. E agora?",
    a: ["Peça ao administrador da clínica: em Equipe, ele abre o seu cadastro e define uma nova senha para você."],
  },
  {
    topic: "conta",
    q: "Como cadastro um novo profissional ou recepcionista?",
    roles: ["ADMIN"],
    a: ["Em Equipe → Novo usuário, informe nome, login, perfil e uma senha inicial. A pessoa pode trocar a senha depois em Meu perfil."],
    link: { href: "/equipe/novo", label: "Novo usuário" },
  },
  {
    topic: "conta",
    q: "Onde cadastro salas e convênios?",
    roles: ["ADMIN"],
    a: ["Em Configurações, abas Salas e Convênios. Na aba Clínica ficam endereço, CNPJ, valor padrão da sessão e horário de funcionamento."],
    link: { href: "/configuracoes", label: "Abrir Configurações" },
  },
];

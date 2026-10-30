import type {
  AppointmentMode,
  AppointmentStatus,
  DocumentType,
  Gender,
  PatientStatus,
  PaymentMethod,
  Role,
  SessionType,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";

export type Tone = "gray" | "green" | "blue" | "amber" | "red" | "violet" | "teal";

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  PSICOLOGO: "Psicólogo(a)",
  RECEPCAO: "Recepção",
};

export const PATIENT_STATUS: Record<PatientStatus, { label: string; tone: Tone }> = {
  ATIVO: { label: "Ativo", tone: "green" },
  INATIVO: { label: "Inativo", tone: "gray" },
  ALTA: { label: "Alta", tone: "blue" },
  LISTA_ESPERA: { label: "Lista de espera", tone: "amber" },
};

export const GENDER_LABEL: Record<Gender, string> = {
  FEMININO: "Feminino",
  MASCULINO: "Masculino",
  NAO_BINARIO: "Não binário",
  OUTRO: "Outro",
  NAO_INFORMADO: "Não informado",
};

export const APPT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  AGENDADO: { label: "Agendado", tone: "blue" },
  CONFIRMADO: { label: "Confirmado", tone: "teal" },
  REALIZADO: { label: "Realizado", tone: "green" },
  FALTOU: { label: "Faltou", tone: "red" },
  CANCELADO: { label: "Cancelado", tone: "gray" },
};

export const APPT_MODE: Record<AppointmentMode, string> = {
  PRESENCIAL: "Presencial",
  ONLINE: "Online",
};

export const SESSION_TYPE: Record<SessionType, string> = {
  INDIVIDUAL: "Individual",
  CASAL: "Casal",
  FAMILIA: "Família",
  GRUPO: "Grupo",
  AVALIACAO: "Avaliação",
  TRIAGEM: "Triagem",
};

export const TX_TYPE: Record<TransactionType, string> = {
  RECEITA: "Receita",
  DESPESA: "Despesa",
};

export const TX_STATUS: Record<TransactionStatus, { label: string; tone: Tone }> = {
  PENDENTE: { label: "Pendente", tone: "amber" },
  PAGO: { label: "Pago", tone: "green" },
  CANCELADO: { label: "Cancelado", tone: "gray" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
  TRANSFERENCIA: "Transferência",
  BOLETO: "Boleto",
  CONVENIO: "Convênio",
};

export const DOC_TYPE: Record<DocumentType, string> = {
  ATESTADO: "Atestado psicológico",
  DECLARACAO: "Declaração de comparecimento",
  RECIBO: "Recibo",
  RELATORIO: "Relatório psicológico",
  LAUDO: "Laudo psicológico",
  ENCAMINHAMENTO: "Encaminhamento",
  CONTRATO: "Contrato terapêutico",
};

export const INCOME_CATEGORIES = ["Sessão", "Avaliação psicológica", "Pacote de sessões", "Convênio", "Supervisão", "Outras receitas"];
export const EXPENSE_CATEGORIES = ["Aluguel", "Condomínio", "Energia", "Água", "Internet/Telefone", "Salários", "Impostos", "Material", "Marketing", "Software", "Manutenção", "Outras despesas"];

export const MOODS = ["Estável", "Ansioso(a)", "Deprimido(a)", "Irritado(a)", "Eufórico(a)", "Choroso(a)", "Reflexivo(a)", "Resistente", "Colaborativo(a)"];

export const UF = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export const MARITAL = ["Solteiro(a)", "Casado(a)", "União estável", "Divorciado(a)", "Viúvo(a)", "Separado(a)"];

export const EDUCATION = ["Fundamental incompleto", "Fundamental completo", "Médio incompleto", "Médio completo", "Superior incompleto", "Superior completo", "Pós-graduação", "Mestrado", "Doutorado"];

export const PROFESSIONAL_COLORS = ["#0d9488", "#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#9333ea", "#dc2626", "#ca8a04"];

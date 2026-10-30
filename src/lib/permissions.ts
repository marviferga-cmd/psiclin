import type { Role } from "./session-token";

type U = { id: string; role: Role };

/** Gestão financeira: administração e recepção. */
export const canManageFinance = (u: U) => u.role === "ADMIN" || u.role === "RECEPCAO";

/** Gestão de equipe, configurações e auditoria. */
export const isAdmin = (u: U) => u.role === "ADMIN";

/** Profissionais que atendem (podem ter agenda e prontuário). */
export const isClinician = (u: U) => u.role === "ADMIN" || u.role === "PSICOLOGO";

/**
 * Acesso ao conteúdo clínico (anamnese, evoluções, documentos clínicos).
 * Conforme o Código de Ética do CFP, o sigilo restringe o prontuário aos psicólogos.
 * Recepção nunca acessa. Psicólogo acessa pacientes sob sua responsabilidade
 * ou com quem já tenha registro/agenda. Administrador (responsável técnico) acessa todos.
 */
export function canViewClinical(
  u: U,
  patient: { psychologistId: string | null },
  hasLink = false,
) {
  if (u.role === "ADMIN") return true;
  if (u.role !== "PSICOLOGO") return false;
  return patient.psychologistId === u.id || hasLink;
}

import "server-only";
import { cache } from "react";
import type { Patient } from "@prisma/client";
import { prisma } from "./db";
import { dateOnlyToInput, toNumber } from "./utils";

export const getSettings = cache(async () => {
  const s = await prisma.clinicSettings.findFirst();
  if (s) return s;
  return prisma.clinicSettings.create({ data: {} });
});

export const getPsychologists = cache(() =>
  prisma.user.findMany({
    where: { active: true, role: { in: ["PSICOLOGO", "ADMIN"] } },
    select: { id: true, name: true, color: true, crp: true },
    orderBy: { name: "asc" },
  }),
);

export const getInsurances = cache(() =>
  prisma.healthInsurance.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
);

export const getRooms = cache(() =>
  prisma.room.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
);

export function patientToFormValues(p: Patient) {
  const { birthDate, sessionPrice, createdAt: _c, updatedAt: _u, lgpdConsentAt: _l, ...rest } = p;
  return {
    ...rest,
    birthDate: dateOnlyToInput(birthDate),
    sessionPrice: sessionPrice !== null ? toNumber(sessionPrice).toFixed(2).replace(".", ",") : "",
  };
}

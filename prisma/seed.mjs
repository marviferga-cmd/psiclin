// Seed idempotente: executado a cada deploy (só cria o que ainda não existe).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  if (!(await prisma.clinicSettings.findFirst())) {
    await prisma.clinicSettings.create({
      data: { name: "Clínica Equilíbrio", legalName: "Equilíbrio Serviços de Psicologia Ltda.", city: "São Paulo", state: "SP", sessionPrice: 200, sessionMinutes: 50 },
    });
    console.log("✓ Configurações da clínica criadas");
  }

  if ((await prisma.user.count()) === 0) {
    const email = (process.env.ADMIN_EMAIL || "admin@psiclin.com").toLowerCase();
    let password = process.env.ADMIN_PASSWORD;
    if (!password) {
      password = randomBytes(9).toString("base64url");
      console.log(`! ADMIN_PASSWORD não definido. Senha gerada para ${email}: ${password}`);
    }
    await prisma.user.create({
      data: { name: "Administrador", email, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN", color: "#0d9488", crp: null },
    });
    console.log(`✓ Usuário administrador criado: ${email}`);
  }

  // Redefine login/senha do administrador principal a partir das variáveis (uso pontual).
  if (process.env.ADMIN_SYNC === "true" && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const login = process.env.ADMIN_EMAIL.toLowerCase();
    const target =
      (await prisma.user.findUnique({ where: { email: login } })) ??
      (await prisma.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } }));
    if (target) {
      await prisma.user.update({
        where: { id: target.id },
        data: { email: login, role: "ADMIN", active: true, passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10) },
      });
      console.log(`✓ Credenciais do administrador sincronizadas: ${login}`);
    }
  }

  if (process.env.SEED_DEMO === "true" && (await prisma.patient.count()) === 0) {
    await seedDemo();
  }
}

async function seedDemo() {
  console.log("… Criando dados de demonstração");
  const pwd = await bcrypt.hash(process.env.ADMIN_PASSWORD || randomBytes(12).toString("hex"), 10);
  const ana = await prisma.user.create({
    data: { name: "Dra. Ana Beatriz Moura", email: "ana.moura@psiclin.com", passwordHash: pwd, role: "PSICOLOGO", crp: "06/145872", specialty: "Terapia Cognitivo-Comportamental", color: "#7c3aed", phone: "11987654321" },
  });
  const rafael = await prisma.user.create({
    data: { name: "Dr. Rafael Teixeira", email: "rafael.teixeira@psiclin.com", passwordHash: pwd, role: "PSICOLOGO", crp: "06/132045", specialty: "Psicanálise", color: "#2563eb", phone: "11976543210" },
  });
  await prisma.user.create({
    data: { name: "Juliana Prado", email: "recepcao@psiclin.com", passwordHash: pwd, role: "RECEPCAO", color: "#ea580c" },
  });
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  await prisma.user.update({ where: { id: admin.id }, data: { crp: "06/118930", name: "Dra. Helena Castro", specialty: "Neuropsicologia", color: "#0d9488" } });

  const rooms = await Promise.all(
    ["Sala 1 — Acolhimento", "Sala 2 — Infantil", "Sala 3 — Casal e Família"].map((name) => prisma.room.create({ data: { name } })),
  );
  const unimed = await prisma.healthInsurance.create({ data: { name: "Unimed", ansCode: "343889", price: 120 } });
  const bradesco = await prisma.healthInsurance.create({ data: { name: "Bradesco Saúde", ansCode: "005711", price: 110 } });

  const psys = [admin, ana, rafael];
  const people = [
    ["Mariana Alves Ribeiro", "1992-03-14", "FEMININO", "Ansiedade generalizada, dificuldades no trabalho"],
    ["Lucas Ferreira Santos", "1987-11-02", "MASCULINO", "Episódios depressivos recorrentes"],
    ["Camila Rocha Lima", "2001-07-21", "FEMININO", "Crises de pânico"],
    ["Pedro Henrique Costa", "2012-05-09", "MASCULINO", "Dificuldades escolares e de atenção"],
    ["Beatriz Nogueira", "1979-10-30", "FEMININO", "Luto pela perda do pai"],
    ["Gabriel Martins Oliveira", "1995-01-18", "MASCULINO", "Conflitos no relacionamento"],
    ["Fernanda Duarte", "1990-12-05", "FEMININO", "Burnout"],
    ["Rodrigo Azevedo", "1983-06-27", "MASCULINO", "Insônia e estresse"],
    ["Isabela Cardoso", "2006-09-11", "FEMININO", "Ansiedade social"],
    ["Thiago Barbosa", "1998-04-03", "MASCULINO", "Autoestima"],
    ["Larissa Mendes", "1985-08-16", "FEMININO", "Transtorno alimentar (acompanhamento)"],
    ["Eduardo Pires", "1972-02-24", "MASCULINO", "Aposentadoria e sentido de vida"],
    ["Sofia Carvalho", "2015-10-12", "FEMININO", "Adaptação à separação dos pais"],
    ["Vinícius Moreira", "1993-03-29", "MASCULINO", "Lista de espera — triagem"],
  ];
  const now = new Date();
  const patients = [];
  for (let i = 0; i < people.length; i++) {
    const [fullName, birth, gender, complaint] = people[i];
    const psy = psys[i % 3];
    const minor = Number(birth.slice(0, 4)) > now.getFullYear() - 18;
    const p = await prisma.patient.create({
      data: {
        fullName,
        birthDate: new Date(`${birth}T00:00:00Z`),
        gender,
        phone: `119${String(80000000 + i * 734521).slice(0, 8)}`,
        email: `${fullName.split(" ")[0].toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}${i}@email.com`,
        city: "São Paulo",
        state: "SP",
        district: ["Pinheiros", "Vila Mariana", "Moema", "Tatuapé", "Santana"][i % 5],
        profession: minor ? "Estudante" : ["Analista", "Professor(a)", "Engenheiro(a)", "Advogado(a)", "Designer"][i % 5],
        status: i === 13 ? "LISTA_ESPERA" : i === 11 ? "ALTA" : "ATIVO",
        psychologistId: psy.id,
        insuranceId: i % 5 === 1 ? unimed.id : i % 7 === 3 ? bradesco.id : null,
        referralSource: ["Indicação", "Instagram", "Google", "Médico psiquiatra", "Convênio"][i % 5],
        lgpdConsent: true,
        lgpdConsentAt: new Date(),
        guardianName: minor ? `Responsável de ${fullName.split(" ")[0]}` : null,
        guardianRelation: minor ? "Mãe" : null,
        emergencyName: minor ? null : "Contato familiar",
        emergencyPhone: minor ? null : "11955554444",
        anamnesis: {
          create: {
            chiefComplaint: complaint,
            historyOfIllness: "Relata início dos sintomas há aproximadamente 1 ano, com piora nos últimos meses.",
            expectations: "Compreender melhor suas emoções e desenvolver estratégias de enfrentamento.",
            updatedById: psy.id,
          },
        },
      },
    });
    patients.push({ ...p, psy });
  }

  // Agenda: 8 semanas passadas + 4 futuras, sessões semanais
  const active = patients.filter((p) => p.status === "ATIVO");
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  for (let idx = 0; idx < active.length; idx++) {
    const p = active[idx];
    const weekday = idx % 5; // seg..sex
    const hour = 8 + ((idx * 2) % 11);
    const recurrenceId = randomUUID();
    const price = p.insuranceId ? (p.insuranceId === unimed.id ? 120 : 110) : 200;
    for (let w = -8; w <= 3; w++) {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + w * 7 + weekday, hour, 0);
      const end = new Date(start.getTime() + 50 * 60000);
      const past = end < now;
      const r = (idx * 31 + w * 17 + 100) % 10;
      const status = past ? (r === 0 ? "FALTOU" : r === 1 ? "CANCELADO" : "REALIZADO") : r < 5 ? "CONFIRMADO" : "AGENDADO";
      const online = idx % 4 === 2;
      const appt = await prisma.appointment.create({
        data: {
          patientId: p.id,
          psychologistId: p.psy.id,
          roomId: online ? null : rooms[idx % 3].id,
          startsAt: start,
          endsAt: end,
          status,
          mode: online ? "ONLINE" : "PRESENCIAL",
          sessionType: idx === 5 ? "CASAL" : "INDIVIDUAL",
          price,
          onlineLink: online ? "https://meet.google.com/abc-defg-hij" : null,
          recurrenceId,
          createdById: p.psy.id,
        },
      });
      if (status === "REALIZADO") {
        const paid = w < -1 || r % 2 === 0;
        await prisma.transaction.create({
          data: {
            type: "RECEITA",
            category: p.insuranceId ? "Convênio" : "Sessão",
            description: `Sessão ${start.toLocaleDateString("pt-BR")} — ${p.fullName}`,
            amount: price,
            dueDate: new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())),
            status: paid ? "PAGO" : "PENDENTE",
            paidAt: paid ? start : null,
            method: paid ? (p.insuranceId ? "CONVENIO" : ["PIX", "CARTAO_CREDITO", "DINHEIRO", "PIX"][r % 4]) : null,
            patientId: p.id,
            appointmentId: appt.id,
          },
        });
        if (w > -6 && w !== -1) {
          const count = await prisma.sessionNote.count({ where: { patientId: p.id } });
          await prisma.sessionNote.create({
            data: {
              patientId: p.id,
              psychologistId: p.psy.id,
              appointmentId: appt.id,
              sessionDate: start,
              sessionNumber: count + 1,
              mood: ["Estável", "Ansioso(a)", "Reflexivo(a)", "Colaborativo(a)"][r % 4],
              content:
                "Paciente compareceu pontualmente. Relatou eventos da semana e as dificuldades enfrentadas em relação à queixa principal. Demonstrou maior percepção sobre os próprios padrões de pensamento e comportamento.",
              interventions: "Escuta ativa, reestruturação cognitiva, psicoeducação.",
              plan: "Retomar registro de pensamentos na próxima sessão.",
            },
          });
        }
      }
    }
  }

  // Despesas fixas dos últimos 3 meses + mês atual
  for (let m = -3; m <= 0; m++) {
    const d = (day) => new Date(Date.UTC(now.getFullYear(), now.getMonth() + m, day));
    const isPast = m < 0;
    const items = [
      ["Aluguel", "Aluguel do consultório", 4500, 5],
      ["Condomínio", "Condomínio", 850, 10],
      ["Energia", "Conta de energia", 320, 15],
      ["Internet/Telefone", "Internet e telefone", 199.9, 12],
      ["Software", "Assinatura de software", 149, 1],
      ["Salários", "Salário recepção", 2600, 5],
    ];
    for (const [category, description, amount, day] of items) {
      const due = d(day);
      const paid = isPast || due.getTime() < Date.now();
      await prisma.transaction.create({
        data: { type: "DESPESA", category, description, amount, dueDate: due, status: paid ? "PAGO" : "PENDENTE", paidAt: paid ? due : null, method: paid ? "TRANSFERENCIA" : null },
      });
    }
  }

  await prisma.document.create({
    data: {
      patientId: active[0].id,
      psychologistId: active[0].psy.id,
      type: "DECLARACAO",
      title: "Declaração de comparecimento",
      content: `Declaro, para os devidos fins, que ${active[0].fullName} compareceu a atendimento psicológico nesta data, no período das 08:00 às 08:50.\n\nPor ser verdade, firmo a presente declaração.`,
    },
  });
  console.log(`✓ Demonstração: ${patients.length} pacientes, agenda, prontuários e financeiro`);
}

main()
  .catch((e) => {
    console.error("Seed falhou:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

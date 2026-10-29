require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Total de alimentos SMAE
  const total = await prisma.food.count({ where: { source: 'SMAE' } });

  // Por grupo
  const porGrupo = await prisma.food.groupBy({
    by: ['grupoSmae'],
    where: { source: 'SMAE' },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  // Simular el texto completo si se inyectaran todos
  const todos = await prisma.food.findMany({
    where: { source: 'SMAE' },
    select: {
      name: true, grupoSmae: true, subgrupoSmae: true,
      porcionSugerida: true, unidadPorcion: true,
      energyKcal: true, protein: true, fats: true,
      carbohydrates: true, fiber: true, indiceGlucemico: true,
    },
    orderBy: [{ grupoSmae: 'asc' }, { name: 'asc' }],
  });

  const lines = ['[Base SMAE 4a. ed. — alimentos disponibles]'];
  let lastGroup = '';
  for (const f of todos) {
    const g = `${f.grupoSmae}${f.subgrupoSmae ? ' / ' + f.subgrupoSmae : ''}`;
    if (g !== lastGroup) { lines.push(`\n## ${g}`); lastGroup = g; }
    const porcion = f.porcionSugerida != null && f.unidadPorcion ? `${f.porcionSugerida} ${f.unidadPorcion}` : '';
    const ig = f.indiceGlucemico != null ? ` IG:${f.indiceGlucemico}` : '';
    lines.push(`- ${f.name}${porcion ? ' (' + porcion + ')' : ''}: ${f.energyKcal}kcal P:${f.protein}g G:${f.fats}g HC:${f.carbohydrates}g Fib:${f.fiber}g${ig}`);
  }
  const fullText = lines.join('\n');

  const CHARS_ACTUAL   = 4496;   // medido antes: 56 alimentos
  const TOKENS_ACTUAL  = 1184;
  const charsTotal     = fullText.length;
  const tokensTotal    = Math.ceil(charsTotal / 3.8);

  const BASE_SYSTEM_TOKENS = 439;
  const PATIENT_TOKENS     = 121;
  const HISTORY_TOKENS     = 1098;
  const USER_MSG_TOKENS    = 90;
  const OTHER = BASE_SYSTEM_TOKENS + PATIENT_TOKENS + HISTORY_TOKENS + USER_MSG_TOKENS;

  const inputActual = OTHER + TOKENS_ACTUAL;
  const inputTotal  = OTHER + tokensTotal;
  const LIMIT       = 131072;

  console.log('\n══════════════════════════════════════════════════');
  console.log('  IMPACTO DE INYECTAR TODO EL CATÁLOGO SMAE');
  console.log('══════════════════════════════════════════════════\n');
  console.log(`  Total alimentos SMAE en BD:  ${total}`);
  console.log('\n  Alimentos por grupo:');
  porGrupo.forEach(g => console.log(`    ${String(g.grupoSmae).padEnd(25)} ${g._count.id} alimentos`));

  console.log('\n  ── Contexto SMAE ──────────────────────────────');
  console.log(`  Actual  (56 alimentos, 8/grupo):  ${CHARS_ACTUAL.toLocaleString()} chars  ≈ ${TOKENS_ACTUAL.toLocaleString()} tokens`);
  console.log(`  Completo (${total} alimentos):       ${charsTotal.toLocaleString()} chars  ≈ ${tokensTotal.toLocaleString()} tokens`);
  console.log(`  Incremento:                        ×${(tokensTotal / TOKENS_ACTUAL).toFixed(1)} más tokens de contexto SMAE`);

  console.log('\n  ── Input total (consulta pesada) ──────────────');
  console.log(`  Actual:   ≈ ${inputActual.toLocaleString()} tokens  (${((inputActual/LIMIT)*100).toFixed(1)}% del límite 131K)`);
  console.log(`  Completo: ≈ ${inputTotal.toLocaleString()} tokens  (${((inputTotal/LIMIT)*100).toFixed(1)}% del límite 131K)`);

  console.log('\n  ── Consecuencias ──────────────────────────────');
  const superaLimite = inputTotal + 8000 > LIMIT;
  console.log(`  ¿Supera límite de contexto?    ${superaLimite ? '🔴 SÍ' : '🟢 NO'}`);
  console.log(`  Latencia estimada adicional:   +${Math.round((tokensTotal - TOKENS_ACTUAL) / 800 * 1000)}ms aprox. en prefill`);
  console.log(`  Costo en tokens por consulta:  +${(tokensTotal - TOKENS_ACTUAL).toLocaleString()} tokens extra de input`);
  console.log('\n══════════════════════════════════════════════════\n');

  await prisma.$disconnect();
}
main().catch(console.error);

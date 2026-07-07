/**
 * Mozaika — punkt startowy backendu (apps/api).
 *
 * Na etapie "Fundament" skrypt nie łączy się jeszcze z bazą — sprawdza,
 * czy środowisko (Node.js + uruchamianie TypeScriptu przez tsx) jest gotowe
 * pod kolejne kroki (PostgreSQL + Prisma, logika biznesowa).
 */

interface EnvCheck {
  name: string;
  ok: boolean;
  detail: string;
}

const REQUIRED_NODE_MAJOR = 20;

function checkNode(): EnvCheck {
  const major = Number(process.versions.node.split(".")[0]);
  return {
    name: "Node.js",
    ok: major >= REQUIRED_NODE_MAJOR,
    detail: `v${process.versions.node} (wymagane >= ${REQUIRED_NODE_MAJOR})`,
  };
}

function checkTypeScriptRuntime(): EnvCheck {
  // Jeśli ten plik w ogóle się wykonuje, to znaczy że tsx odpalił TS bez ręcznej kompilacji.
  return {
    name: "TypeScript przez tsx",
    ok: true,
    detail: "kod .ts wykonany bez kroku kompilacji",
  };
}

function runChecks(): EnvCheck[] {
  return [checkNode(), checkTypeScriptRuntime()];
}

function main(): void {
  console.log("🎨 Mozaika — fundament monorepo (Turborepo + TypeScript + tsx)\n");
  console.log("Sprawdzenie środowiska:");

  const checks = runChecks();
  for (const c of checks) {
    console.log(`  ${c.ok ? "✅" : "❌"} ${c.name}: ${c.detail}`);
  }

  const allOk = checks.every((c) => c.ok);
  console.log(
    `\n${allOk ? "Wszystko gotowe — fundament stoi. 🚀" : "Coś wymaga uwagi. ⚠️"}`,
  );

  if (!allOk) {
    process.exit(1);
  }
}

main();

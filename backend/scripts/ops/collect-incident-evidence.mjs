import fs from "node:fs";
import path from "node:path";

const defaultInputPath = path.resolve(process.cwd(), "docs", "evidence", "incidents-sev-input.json");
const inputPath = process.env.INCIDENT_SOURCE_PATH || defaultInputPath;
const outputPath = process.env.INCIDENT_EVIDENCE_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "incident-sev-summary-latest.json");

const SEV1 = new Set(["sev1", "sev-1", "p1", "critical"]);
const SEV2 = new Set(["sev2", "sev-2", "p2", "high"]);
const CLOSED = new Set(["resolved", "closed", "mitigated", "done"]);

const normalize = (value) => String(value || "").trim().toLowerCase();

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const parseInput = (raw) => {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (Array.isArray(parsed.incidents)) {
    return parsed.incidents;
  }

  throw new Error("Incident source must be an array or object with incidents[].");
};

const classifySeverity = (severityRaw) => {
  const severity = normalize(severityRaw);
  if (SEV1.has(severity)) return "sev1";
  if (SEV2.has(severity)) return "sev2";
  return "other";
};

const isOpenIncident = (statusRaw) => !CLOSED.has(normalize(statusRaw));

const computeMttrMinutes = (incidents) => {
  const resolved = incidents
    .filter((incident) => !isOpenIncident(incident.status) && incident.openedAt && incident.resolvedAt)
    .map((incident) => {
      const opened = new Date(incident.openedAt).getTime();
      const resolvedAt = new Date(incident.resolvedAt).getTime();
      if (Number.isNaN(opened) || Number.isNaN(resolvedAt) || resolvedAt < opened) {
        return null;
      }
      return (resolvedAt - opened) / 60000;
    })
    .filter((minutes) => typeof minutes === "number");

  if (resolved.length === 0) {
    return null;
  }

  const total = resolved.reduce((acc, minutes) => acc + minutes, 0);
  return Number((total / resolved.length).toFixed(2));
};

const run = () => {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Incident source file not found: ${inputPath}`);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const incidents = parseInput(raw);

  const normalized = incidents.map((incident) => {
    const severity = classifySeverity(incident.severity);
    const open = isOpenIncident(incident.status);

    return {
      id: incident.id || null,
      source: incident.source || "unknown",
      service: incident.service || "unknown",
      severity,
      status: incident.status || "unknown",
      isOpen: open,
      openedAt: incident.openedAt || null,
      resolvedAt: incident.resolvedAt || null,
      title: incident.title || null,
      owner: incident.owner || null,
    };
  });

  const openSev1 = normalized.filter((incident) => incident.severity === "sev1" && incident.isOpen);
  const openSev2 = normalized.filter((incident) => incident.severity === "sev2" && incident.isOpen);

  const evidence = {
    status: "success",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
      recordCount: normalized.length,
    },
    summary: {
      openSev1Count: openSev1.length,
      openSev2Count: openSev2.length,
      unresolvedSev1Sev2Count: openSev1.length + openSev2.length,
      mttrMinutes: computeMttrMinutes(normalized),
    },
    openIncidents: {
      sev1: openSev1,
      sev2: openSev2,
    },
    pass: {
      unresolvedSev1Sev2IsZero: openSev1.length + openSev2.length === 0,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[incident-evidence] Evidence written: ${outputPath}`);
  console.log(JSON.stringify(evidence, null, 2));
};

try {
  run();
} catch (error) {
  const failure = {
    status: "failed",
    generatedAt: new Date().toISOString(),
    source: {
      path: inputPath,
    },
    error: error instanceof Error ? error.message : String(error),
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  console.error("[incident-evidence] FAILED");
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}

import fs from "node:fs";
import path from "node:path";

const baseUrl = (process.env.DRILL_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const authCookie = process.env.DRILL_AUTH_COOKIE || "";
const csrfToken = process.env.DRILL_CSRF_TOKEN || "";
const pollMs = Number.parseInt(process.env.DRILL_POLL_MS || "3000", 10);
const timeoutMs = Number.parseInt(process.env.DRILL_TIMEOUT_MS || "300000", 10);
const outputPath = process.env.DRILL_OUTPUT_PATH
  || path.resolve(process.cwd(), "docs", "evidence", "restore-drill-latest.json");

const headersWithAuth = {
  Accept: "application/json",
  ...(authCookie ? { cookie: authCookie, "x-gcm-auth": "VALID" } : {}),
  ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
};

const ensureDir = (filePath) => {
  const directory = path.dirname(filePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestJson = async (url, init = {}) => {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(`Request failed (${response.status}) for ${url}`);
    error.response = response;
    error.data = data;
    throw error;
  }

  return { response, data };
};

const pollBackupStatus = async (jobId) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await requestJson(`${baseUrl}/api/v1/system/backup/status?job_id=${jobId}`, {
      method: "GET",
      headers: headersWithAuth,
    });

    if (data.status === "success") {
      return {
        status: data,
        completedObservedAtMs: Date.now(),
      };
    }

    if (data.status === "failed") {
      throw new Error(`Backup job ${jobId} failed: ${data.errorMessage || "Unknown failure"}`);
    }

    await sleep(pollMs);
  }

  throw new Error(`Timed out waiting for backup job ${jobId} to complete.`);
};

const downloadBackupArtifact = async () => {
  const response = await fetch(`${baseUrl}/api/v1/system/backup/download?format=sql`, {
    method: "GET",
    headers: headersWithAuth,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Backup download failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new Error("Downloaded backup artifact is empty.");
  }

  return {
    buffer,
    fileName: `restore-drill-${Date.now()}.sql`,
  };
};

const restoreFromArtifact = async ({ buffer, fileName }) => {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: "application/sql" });
  formData.set("backup_file", blob, fileName);

  const response = await fetch(`${baseUrl}/api/v1/system/backup/restore`, {
    method: "POST",
    headers: {
      ...(authCookie ? { cookie: authCookie, "x-gcm-auth": "VALID" } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
    },
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Restore endpoint failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
};

const verifyReadPath = async (pathSuffix) => {
  const { response } = await requestJson(`${baseUrl}${pathSuffix}`, {
    method: "GET",
    headers: headersWithAuth,
  });
  return response.status;
};

const run = async () => {
  if (!authCookie) {
    throw new Error("DRILL_AUTH_COOKIE is required to run restore drill endpoints.");
  }

  const startedAtIso = new Date().toISOString();
  const startedAtMs = Date.now();

  const trigger = await requestJson(`${baseUrl}/api/v1/system/backup/trigger`, {
    method: "POST",
    headers: {
      ...headersWithAuth,
      "x-scheduler-source": "restore-drill",
      "x-idempotency-key": `restore-drill-${Date.now()}`,
    },
  });

  const jobId = trigger.data?.jobId;
  if (!jobId) {
    throw new Error(`Backup trigger did not return jobId: ${JSON.stringify(trigger.data)}`);
  }

  const backupStatus = await pollBackupStatus(jobId);
  const artifact = await downloadBackupArtifact();
  const restoreStartedAtMs = Date.now();
  const restorePayload = await restoreFromArtifact(artifact);

  const verification = {
    projects: await verifyReadPath("/api/v1/projects"),
    companies: await verifyReadPath("/api/v1/companies"),
    trips: await verifyReadPath("/api/v1/trips"),
    backupStatus: await verifyReadPath(`/api/v1/system/backup/status?job_id=${jobId}`),
  };

  const endedAtMs = Date.now();
  const endedAtIso = new Date().toISOString();

  const rtoMinutes = Number(((endedAtMs - startedAtMs) / 60000).toFixed(2));
  const rpoMinutes = Number(Math.max(0, (restoreStartedAtMs - backupStatus.completedObservedAtMs) / 60000).toFixed(2));

  const evidence = {
    status: "success",
    baseUrl,
    startedAt: startedAtIso,
    endedAt: endedAtIso,
    rtoMinutes,
    rpoMinutes,
    targets: {
      rtoMaxMinutes: 60,
      rpoMaxMinutes: 15,
    },
    pass: {
      rto: rtoMinutes <= 60,
      rpo: rpoMinutes <= 15,
    },
    backup: {
      jobId,
      trigger: trigger.data,
      status: backupStatus.status,
      artifactFileName: artifact.fileName,
      artifactBytes: artifact.buffer.byteLength,
    },
    restore: {
      payload: restorePayload,
      verification,
    },
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`[restore-drill] Evidence written: ${outputPath}`);
  console.log(JSON.stringify(evidence, null, 2));
};

run().catch((error) => {
  const failure = {
    status: "failed",
    baseUrl,
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  };

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(failure, null, 2)}\n`, "utf8");
  console.error("[restore-drill] FAILED");
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
});

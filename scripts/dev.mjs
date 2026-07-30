import { createServer } from "node:net";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { execa } from "execa";

const ROOT = process.cwd();

const FRONTEND_DIR = path.join(ROOT, "frontend");
const BACKEND_MODULE = "App.main:app";

const isWindows = process.platform === "win32";

const VENV_DIR = existsSync(path.join(ROOT, "venv"))
  ? "venv"
  : existsSync(path.join(ROOT, ".venv"))
  ? ".venv"
  : null;

const UVICORN = isWindows
  ? path.join(ROOT, VENV_DIR, "Scripts", "uvicorn.exe")
  : path.join(ROOT, VENV_DIR, "bin", "uvicorn");

let backend = null;
let frontend = null;
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function portAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.once("error", () => {
      reject(new Error(`Port ${port} is already occupied.`));
    });

    server.once("listening", () => {
      server.close(() => resolve());
    });

    server.listen(port, "127.0.0.1");
  });
}

async function waitForURL(url, timeoutMs, name) {
  const timeout = Date.now() + timeoutMs;

  while (Date.now() < timeout) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {}

    await sleep(250);
  }

  throw new Error(`${name} did not become available.`);
}
async function stopProcess(proc, name) {
  if (!proc) {
    return;
  }

  console.log(`Stopping ${name}...`);

  try {
    if (isWindows) {
      proc.kill("SIGTERM");
    } else {
      process.kill(-proc.pid, "SIGTERM");
    }

    await sleep(1000);

  } catch {}

  try {
    if (proc.exitCode === null) {
      if (isWindows) {
        proc.kill("SIGKILL");
      } else {
        process.kill(-proc.pid, "SIGKILL");
      }
    }
  } catch {}
}

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log("\nStopping services...");

  await Promise.allSettled([
    stopProcess(frontend, "frontend"),
    stopProcess(backend, "backend"),
  ]);

  console.log("Local servers stopped.");

  process.exitCode = 0;
}

async function start() {
  if (!existsSync(FRONTEND_DIR)) {
    throw new Error("Frontend folder missing.");
  }

  if (!existsSync(UVICORN)) {
    throw new Error("Backend virtual environment missing. Expected venv/.");
  }

  console.log("Checking ports...");

  const occupiedPorts = [];

  for (const port of [5173, 8000]) {
    try {
      await portAvailable(port);
    } catch {
      occupiedPorts.push(port);
    }
  }

  if (occupiedPorts.length) {
    console.error("\nStartup blocked.");

    for (const port of occupiedPorts) {
      console.error(`Port ${port} is already occupied.`);
    }

    console.error("\nNo services were started.");

    process.exitCode = 1;
    return;
  }

  console.log("Ports available.");

  console.log("Starting backend...");

  backend = execa(
    UVICORN,
    [
      BACKEND_MODULE,
      "--reload",
      "--host",
      "127.0.0.1",
      "--port",
      "8000",
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
      cleanup: true,
      forceKillAfterTimeout: 2000,
      detached: !isWindows,
    },
  );

  backend.catch((err) => {
    if (!shuttingDown && err.signal !== "SIGTERM") {
      console.error(err);
    }
  });

  await waitForURL(
    "http://127.0.0.1:8000/docs",
    15000,
    "FastAPI",
  );

  console.log("Backend ready.");

  console.log("Starting frontend...");

  frontend = execa(
    "npm",
    ["run", "dev"],
    {
      cwd: FRONTEND_DIR,
      stdio: "inherit",
      shell: isWindows,
      cleanup: true,
      forceKillAfterTimeout: 2000,
      detached: !isWindows,
    },
  );

  frontend.catch((err) => {
    if (!shuttingDown && err.signal !== "SIGTERM") {
      console.error(err);
    }
  });

  await waitForURL(
    "http://127.0.0.1:5173",
    10000,
    "Frontend",
  );

  console.log(`
Aegis running:

Frontend:
http://localhost:5173

Backend:
http://localhost:8000

Press Ctrl+C to shut down local servers.
`);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch(async (err) => {
  console.error("\nStartup failed:");
  console.error(err.message);

  await shutdown();
});
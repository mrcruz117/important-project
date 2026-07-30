import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const isWindows = process.platform === "win32";
const python = path.join(root, "venv", isWindows ? "Scripts/python.exe" : "bin/python");
const vite = path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js");

for (const file of [python, vite]) {
  if (!existsSync(file)) {
    throw new Error(`Missing ${file}. Run npm run setup first.`);
  }
}

const services = [
  spawn(python, ["-m", "uvicorn", "App.main:app", "--port", "8000"], {
    cwd: root,
    stdio: "inherit",
  }),
  spawn(process.execPath, [vite], {
    cwd: path.join(root, "frontend"),
    stdio: "inherit",
  }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  if (process.connected) process.disconnect();

  for (const service of services) {
    if (service.exitCode === null) service.kill("SIGTERM");
  }
}

for (const service of services) {
  service.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });

  service.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
process.on("message", (message) => {
  if (message === "shutdown") stop();
});

console.log("Frontend: http://localhost:5173");
console.log("Backend:  http://localhost:8000");
console.log("Press Ctrl+C to stop both.");

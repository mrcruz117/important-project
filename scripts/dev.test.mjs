import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import test from "node:test";

const urls = ["http://127.0.0.1:8000/docs", "http://127.0.0.1:5173"];

function portIsAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

async function waitFor(url, reachable) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (reachable && response.ok) return;
    } catch {
      if (!reachable) return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  assert.fail(`${url} did not become ${reachable ? "reachable" : "unreachable"}`);
}

test("devup starts and stops both services", async () => {
  assert.equal(await portIsAvailable(8000), true, "port 8000 is occupied");
  assert.equal(await portIsAvailable(5173), true, "port 5173 is occupied");

  const dev = spawn(process.execPath, ["scripts/dev.ts"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let errors = "";
  dev.stderr.on("data", (data) => {
    errors += data;
  });

  try {
    await Promise.all(urls.map((url) => waitFor(url, true)));
    dev.send("shutdown");
    const exitCode = await new Promise((resolve) => dev.once("exit", resolve));
    assert.equal(exitCode, 0, errors);
  } finally {
    if (dev.exitCode === null) dev.kill("SIGTERM");
  }

  await Promise.all(urls.map((url) => waitFor(url, false)));
});

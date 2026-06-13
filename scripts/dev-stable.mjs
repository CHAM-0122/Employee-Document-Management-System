import { rmSync, existsSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const nextCacheDir = path.join(projectRoot, ".next");
const port = process.env.PORT || "3048";

cleanupPort(port);

if (existsSync(nextCacheDir)) {
  rmSync(nextCacheDir, { recursive: true, force: true });
}

const nextBin = path.join(projectRoot, "node_modules", ".bin", "next");
const child = spawn(nextBin, ["dev", "--port", port], {
  cwd: projectRoot,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

process.exit(code ?? 0);
});

function cleanupPort(targetPort) {
  let output = "";

  try {
    output = execFileSync("lsof", ["-ti", `:${targetPort}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return;
  }

  const pids = output
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
      console.log(`Cleaned up stale dev server on port ${targetPort}: ${pid}`);
    } catch {
      // The process may have already exited between lsof and kill.
    }
  }
}

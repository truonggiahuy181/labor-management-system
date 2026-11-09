import { access, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const backendDirectory = join(rootDirectory, "backend");
const frontendDirectory = join(rootDirectory, "frontend");
const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const prepareOnly = process.argv.includes("--prepare-only");
const backendPort = process.env.LOCAL_BACKEND_PORT ?? "3000";
const frontendPort = process.env.LOCAL_FRONTEND_PORT ?? "3001";

function npmArguments(args) {
  return isWindows ? ["/d", "/s", "/c", "npm.cmd", ...args] : args;
}

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyIfMissing(source, target) {
  if (await exists(target)) return;
  await copyFile(source, target, constants.COPYFILE_EXCL);
  console.log(
    `Created ${target.slice(rootDirectory.length + 1)} from its example file.`,
  );
}

function run(command, args, cwd, label) {
  return new Promise((resolve, reject) => {
    console.log(`\n[local-dev] ${label}`);
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${label} failed${signal ? ` (${signal})` : ` with exit code ${code ?? "unknown"}`}.`,
        ),
      );
    });
  });
}

async function ensureDependencies(directory, requiredExecutable, label) {
  if (
    await exists(join(directory, "node_modules", ".bin", requiredExecutable))
  ) {
    return;
  }
  await run(
    npmCommand,
    npmArguments(["ci"]),
    directory,
    `Installing ${label} dependencies`,
  );
}

await copyIfMissing(
  join(backendDirectory, ".env.example"),
  join(backendDirectory, ".env"),
);
await copyIfMissing(
  join(frontendDirectory, ".env.example"),
  join(frontendDirectory, ".env.local"),
);

await Promise.all([
  ensureDependencies(
    backendDirectory,
    process.platform === "win32" ? "nest.cmd" : "nest",
    "backend",
  ),
  ensureDependencies(
    frontendDirectory,
    process.platform === "win32" ? "next.cmd" : "next",
    "frontend",
  ),
]);

await run(
  "docker",
  ["compose", "up", "-d", "--wait"],
  backendDirectory,
  "Starting PostgreSQL and Redis",
);

if (prepareOnly) {
  console.log("\n[local-dev] Local dependencies and infrastructure are ready.");
  process.exit(0);
}

console.log(
  "\n[local-dev] Starting the application. Press Ctrl+C to stop both servers.",
);
const backendEnvironment = {
  ...process.env,
  PORT: backendPort,
  FRONTEND_URL: `http://localhost:${frontendPort}`,
  LOCAL_API_BASE_URL: `http://localhost:${backendPort}`,
};
const frontendEnvironment = {
  ...process.env,
  NEXT_PUBLIC_API_URL: `http://localhost:${backendPort}/api/v1`,
};
const children = [
  spawn(npmCommand, npmArguments(["run", "start:dev"]), {
    cwd: backendDirectory,
    stdio: "inherit",
    env: backendEnvironment,
  }),
  spawn(
    npmCommand,
    npmArguments(["run", "dev:local", "--", "-p", frontendPort]),
    {
      cwd: frontendDirectory,
      stdio: "inherit",
      env: frontendEnvironment,
    },
  ),
];

let stopping = false;
function stop(exitCode) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 500);
}

process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));

for (const [index, child] of children.entries()) {
  child.once("error", (error) => {
    console.error(
      `[local-dev] Cannot start ${index === 0 ? "backend" : "frontend"}.`,
      error,
    );
    stop(1);
  });
  child.once("exit", (code, signal) => {
    if (stopping) return;
    console.error(
      `[local-dev] ${index === 0 ? "Backend" : "Frontend"} stopped${signal ? ` (${signal})` : ` with exit code ${code ?? "unknown"}`}.`,
    );
    stop(code === 0 ? 0 : 1);
  });
}

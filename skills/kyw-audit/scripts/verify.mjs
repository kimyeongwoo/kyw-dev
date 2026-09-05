import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, copyFile, lstat, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
const credentialName = /^(?:\.git|\.env(?:\..*)?|\.npmrc|\.netrc|\.ssh|\.aws|\.azure|\.config|\.codex|credentials(?:\..*)?|auth\.json|id_rsa|id_ed25519)$/iu;

function relativeFile(value) {
  if (typeof value !== "string" || !value || value.includes("\\") || value.includes(":") ||
    value.split("/").some((part) => !part || part === "." || part === ".." || credentialName.test(part)) ||
    /\.(?:pem|key|p12|pfx)$/iu.test(value)) throw new Error("Only reviewed repository-relative non-credential files may enter the audit copy");
  return value;
}

async function physicalFile(root, relative) {
  let current = root;
  const parts = relative.split("/");
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const info = await lstat(current);
    if (info.isSymbolicLink() || (index === parts.length - 1 ? !info.isFile() : !info.isDirectory())) {
      throw new Error("Audit inputs must be regular files beneath link-free directories");
    }
  }
  return current;
}

// A Docker container is an optional execution boundary. A copy by itself is not.
// The caller reviews the file list for embedded secrets; no ambient host environment
// or credential files are passed into the container. This is not a raw-shell broker.
export async function verifyInAuditSandbox({ repositoryRoot, files, command,
  image = "node:22", runner = execute, temporaryParent = tmpdir() } = {}) {
  if (!Array.isArray(files) || files.length === 0 || files.length > 2048 ||
    new Set(files).size !== files.length) throw new Error("Provide a bounded, unique reviewed file list");
  const selected = files.map(relativeFile);
  if (!Array.isArray(command) || command.length === 0 || command.length > 64 ||
    command.some((part) => typeof part !== "string" || !part || part.includes("\0"))) {
    throw new Error("Provide the test executable and arguments as an array");
  }
  if (typeof image !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._/:@-]*$/u.test(image)) throw new Error("Invalid local image identity");
  const root = await realpath(repositoryRoot);
  const sources = await Promise.all(selected.map((file) => physicalFile(root, file)));
  let imageId;
  try {
    const inspected = await runner("docker", ["image", "inspect", "--format", "{{.Id}}", image],
      { timeout: 10000, maxBuffer: 4096, windowsHide: true });
    imageId = inspected.stdout?.trim();
    if (!/^sha256:[0-9a-f]{64}$/u.test(imageId ?? "")) throw new Error("Image identity unavailable");
  } catch {
    return { status: "UNAVAILABLE", executed: false,
      reason: "A locally available Docker image and daemon are required; no host test was run." };
  }
  const parent = await realpath(temporaryParent);
  if (/[,\r\n]/u.test(parent)) throw new Error("Audit temporary path is not representable as one Docker mount");
  if (parent === root || path.relative(root, parent).split(path.sep)[0] !== ".." &&
      !path.isAbsolute(path.relative(root, parent))) throw new Error("Audit temporary root must be outside the source repository");
  const owned = await mkdtemp(path.join(parent, "kyw-audit-"));
  const identity = await lstat(owned);
  const workspace = path.join(owned, "work");
  await mkdir(workspace);
  const containerName = `kyw-audit-${randomUUID()}`;
  let started = false;
  try {
    await chmod(workspace, 0o777);
    for (let index = 0; index < selected.length; index += 1) {
      const source = await physicalFile(root, selected[index]);
      const sourceState = await lstat(source);
      if (source !== sources[index]) throw new Error("Audit source identity changed");
      const destination = path.join(workspace, ...selected[index].split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      let directory = path.dirname(destination);
      while (directory !== workspace) {
        await chmod(directory, 0o777);
        directory = path.dirname(directory);
      }
      await copyFile(source, destination, constants.COPYFILE_EXCL);
      await chmod(destination, 0o666 | (sourceState.mode & 0o111));
    }
    const args = ["run", "--rm", "--name", containerName, "--label", `kyw.audit=${containerName}`,
      "--pull=never", "--network=none", "--read-only",
      "--cap-drop=ALL", "--security-opt=no-new-privileges", "--pids-limit=128",
      "--memory=512m", "--cpus=1", "--user=1000:1000", "--tmpfs=/tmp:rw,noexec,nosuid,size=64m",
      "--mount", `type=bind,source=${workspace},target=/work`, "--workdir=/work",
      "--env=HOME=/tmp", "--env=npm_config_cache=/tmp", imageId, ...command];
    try {
      started = true;
      const result = await runner("docker", args, { timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true });
      return { status: "PASSED", executed: true, stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      return { status: "BLOCKED", executed: true, reason: "Isolated verification failed or could not finish.",
        stdout: error.stdout, stderr: error.stderr };
    }
  } finally {
    if (started) {
      let container;
      try {
        container = await runner("docker", ["container", "inspect", "--format", '{{index .Config.Labels "kyw.audit"}}', containerName],
          { timeout: 10000, maxBuffer: 4096, windowsHide: true });
      } catch (error) {
        if (!/No such (?:object|container)/iu.test(error.stderr ?? "")) throw new Error("Audit container cleanup state is unknown; temporary files preserved");
      }
      if (container) {
        if (container.stdout?.trim() !== containerName) throw new Error("Audit container ownership changed; cleanup blocked");
        await runner("docker", ["container", "rm", "--force", containerName],
          { timeout: 10000, maxBuffer: 4096, windowsHide: true });
      }
    }
    const current = await lstat(owned);
    if (current.isSymbolicLink() || !current.isDirectory() || current.dev !== identity.dev || current.ino !== identity.ino ||
      path.dirname(await realpath(owned)) !== parent) throw new Error("Audit cleanup ownership changed; temporary path preserved");
    await rm(owned, { recursive: true, force: false });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [repositoryRoot, image, filesJson, ...command] = process.argv.slice(2);
  try {
    const result = await verifyInAuditSandbox({ repositoryRoot, image, files: JSON.parse(filesJson), command });
    console.log(JSON.stringify(result));
    if (result.status !== "PASSED") process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

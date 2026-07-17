import { readPackageInfo } from "../core/package-info.mjs";
import {
  EXIT_CODES,
  SkillInstallationError,
  diagnoseInstallations,
  formatDoctorReport,
  installManagedSkills,
  resolveUserHome,
  uninstallManagedSkills,
  updateManagedSkills,
} from "../core/skill-installation.mjs";

const { version } = readPackageInfo();

export const VERSION = version;

export const HELP_TEXT = `kyw-dev ${VERSION}

Usage:
  kyw-dev install --scope <user|project>
  kyw-dev update --scope <user|project>
  kyw-dev uninstall --scope <user|project> [--force]
  kyw-dev doctor
  kyw-dev [--help|--version]

Options:
  --scope <scope>  Select user or project installation scope
  --force          Remove modified managed files during uninstall
  -h, --help       Show this help message
  -V, --version    Show the version

Exit codes:
  0 success, 1 usage, 2 runtime, 3 scope, 4 conflict,
  5 invalid state, 6 filesystem/permission, 7 recovery required
`;

function parseScopedCommand(args) {
  const [command, ...options] = args;
  let scope;
  let force = false;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--scope") {
      if (scope !== undefined) {
        return { error: "--scope may be provided only once" };
      }
      const value = options[index + 1];
      if (value === undefined || value.startsWith("--")) {
        return { error: "--scope requires user or project" };
      }
      if (!["user", "project"].includes(value)) {
        return { error: `--scope must be user or project, received ${value}` };
      }
      scope = value;
      index += 1;
    } else if (option === "--force") {
      if (command !== "uninstall") {
        return { error: `--force is supported only by uninstall` };
      }
      if (force) {
        return { error: "--force may be provided only once" };
      }
      force = true;
    } else {
      return { error: `unknown option for ${command}: ${option}` };
    }
  }

  if (!scope) {
    return { error: `${command} requires --scope <user|project>` };
  }
  return { command, scope, force };
}

function writeUsageError(message, stderr) {
  stderr.write(`kyw-dev: usage error: ${message}\n\n${HELP_TEXT}`);
  return EXIT_CODES.USAGE;
}

function writeMutationResult(result, stdout) {
  if (result.recovery?.recovered) {
    stdout.write(`Recovered prior ${result.recovery.action} transaction.\n`);
  }
  if (result.operation === "install") {
    stdout.write(
      `Installed ${result.skillCount} kyw-dev Skills (${result.fileCount} managed files) at ${result.skillsRoot}.\n`,
    );
  } else if (result.operation === "update") {
    stdout.write(
      `Updated ${result.skillCount} kyw-dev Skills from ${result.previousVersion} to ${result.version} at ${result.skillsRoot}.\n`,
    );
  } else {
    stdout.write(
      `Uninstalled kyw-dev ${result.version} managed files from ${result.skillsRoot}; unrelated files were preserved.\n`,
    );
  }
}

export function runCli(
  args,
  {
    stdout = process.stdout,
    stderr = process.stderr,
    cwd = process.cwd(),
    home,
    sourceRoot,
    now,
    hooks,
    nodeVersion,
    commandRunner,
    accessChecker,
  } = {},
) {
  if (args.length === 0 || (args.length === 1 && ["-h", "--help"].includes(args[0]))) {
    stdout.write(HELP_TEXT);
    return 0;
  }

  if (args.length === 1 && ["-V", "--version"].includes(args[0])) {
    stdout.write(`${VERSION}\n`);
    return 0;
  }

  const command = args[0];
  if (["install", "update", "uninstall"].includes(command)) {
    const parsed = parseScopedCommand(args);
    if (parsed.error) {
      return writeUsageError(parsed.error, stderr);
    }
    try {
      const common = {
        scope: parsed.scope,
        cwd,
        home: home ?? resolveUserHome(),
        sourceRoot,
        now,
        hooks,
        nodeVersion,
      };
      const result =
        command === "install"
          ? installManagedSkills(common)
          : command === "update"
            ? updateManagedSkills(common)
            : uninstallManagedSkills({ ...common, force: parsed.force });
      writeMutationResult(result, stdout);
      return EXIT_CODES.OK;
    } catch (error) {
      if (error instanceof SkillInstallationError) {
        stderr.write(`kyw-dev: ${error.code}: ${error.message}\n`);
        return error.exitCode;
      }
      throw error;
    }
  }

  if (command === "doctor") {
    if (args.length !== 1) {
      return writeUsageError("doctor does not accept options", stderr);
    }
    try {
      const report = diagnoseInstallations({
        cwd,
        home: home ?? resolveUserHome(),
        sourceRoot,
        nodeVersion,
        commandRunner,
        accessChecker,
      });
      stdout.write(formatDoctorReport(report));
      return report.exitCode;
    } catch (error) {
      if (error instanceof SkillInstallationError) {
        stderr.write(`kyw-dev: ${error.code}: ${error.message}\n`);
        return error.exitCode;
      }
      throw error;
    }
  }

  const label = args.length === 1 ? "argument" : "arguments";
  stderr.write(`kyw-dev: unknown ${label}: ${args.join(" ")}\n\n${HELP_TEXT}`);
  return EXIT_CODES.USAGE;
}

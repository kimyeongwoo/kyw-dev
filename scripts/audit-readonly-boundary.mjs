const COMMAND_SHELLS = new Set(["posix", "powershell"]);
const SHELL_WRAPPERS = new Set([
  "bash",
  "cmd",
  "dash",
  "ksh",
  "powershell",
  "pwsh",
  "sh",
  "zsh",
]);
const MAX_CONTEXT_LENGTH = 160;

function normalizedExecutable(value) {
  return value.toLowerCase().replace(/\.exe$/, "");
}

function boundedTokenContext(command, offset, length = 1) {
  const contextLength = Math.max(1, Math.min(length, MAX_CONTEXT_LENGTH));
  return {
    context: command.slice(offset, offset + contextLength),
    contextStart: offset,
  };
}

function issue(command, shell, kind, message, offset, length = 1, quoteState = "unquoted") {
  return {
    ...boundedTokenContext(command, offset, length),
    kind,
    message,
    offset,
    quoteState,
    shell,
  };
}

function tokenIssue(command, shell, token, kind, message) {
  return issue(
    command,
    shell,
    kind,
    message,
    token.start,
    Math.max(1, token.end - token.start),
    token.quoteState,
  );
}

function tokenizeLiteralCommand(command, shell) {
  const tokens = [];
  for (let index = 0; index < command.length; ) {
    if (command[index] === " " || command[index] === "\t") {
      index += 1;
      continue;
    }
    const character = command[index];
    if (character === "\r" || character === "\n") {
      return {
        issues: [
          issue(
            command,
            shell,
            "MULTI_COMMAND_UNSUPPORTED",
            "read-only inspection accepts one command on one line",
            index,
          ),
        ],
        tokens,
      };
    }
    if (character === '"') {
      return {
        issues: [
          issue(
            command,
            shell,
            "DOUBLE_QUOTE_UNSUPPORTED",
            "double-quoted shell text is outside the literal read-only boundary",
            index,
          ),
        ],
        tokens,
      };
    }
    if (character === "'") {
      const start = index;
      index += 1;
      let value = "";
      while (index < command.length && command[index] !== "'") {
        if (command[index] === "\r" || command[index] === "\n") {
          return {
            issues: [
              issue(
                command,
                shell,
                "MULTILINE_LITERAL_UNSUPPORTED",
                "literal read-only arguments cannot span lines",
                start,
              ),
            ],
            tokens,
          };
        }
        value += command[index];
        index += 1;
      }
      if (index >= command.length) {
        return {
          issues: [
            issue(
              command,
              shell,
              "UNTERMINATED_LITERAL",
              "single-quoted literal has no closing quote",
              start,
            ),
          ],
          tokens,
        };
      }
      index += 1;
      if (index < command.length && !/[ \t]/.test(command[index])) {
        return {
          issues: [
            issue(
              command,
              shell,
              "QUOTED_FRAGMENT_UNSUPPORTED",
              "quoted and unquoted argument fragments cannot be combined",
              index,
            ),
          ],
          tokens,
        };
      }
      tokens.push({ end: index, quoteState: "single", start, value });
      continue;
    }

    const operatorKinds = {
      ">": ["REDIRECTION_UNSUPPORTED", "output redirection is outside the read-only boundary"],
      "<": ["REDIRECTION_UNSUPPORTED", "input and here-document redirection are outside the read-only boundary"],
      "|": ["CONTROL_OPERATOR_UNSUPPORTED", "pipelines are outside the single-command boundary"],
      "&": ["CONTROL_OPERATOR_UNSUPPORTED", "shell control operators are outside the single-command boundary"],
      ";": ["CONTROL_OPERATOR_UNSUPPORTED", "shell control operators are outside the single-command boundary"],
      "$": ["DYNAMIC_EXPANSION_UNSUPPORTED", "shell variables and substitutions are outside the literal boundary"],
      "`": ["DYNAMIC_EXPANSION_UNSUPPORTED", "shell escaping and substitutions are outside the literal boundary"],
      "(": ["SHELL_EXPRESSION_UNSUPPORTED", "shell grouping and expressions are outside the literal boundary"],
      ")": ["SHELL_EXPRESSION_UNSUPPORTED", "shell grouping and expressions are outside the literal boundary"],
      "{": ["SHELL_EXPRESSION_UNSUPPORTED", "shell grouping and expressions are outside the literal boundary"],
      "}": ["SHELL_EXPRESSION_UNSUPPORTED", "shell grouping and expressions are outside the literal boundary"],
      "#": ["SHELL_COMMENT_UNSUPPORTED", "shell comments are outside the literal boundary"],
      ",": ["SHELL_EXPRESSION_UNSUPPORTED", "shell list expressions are outside the literal boundary"],
      "@": ["DYNAMIC_EXPANSION_UNSUPPORTED", "shell splatting and dynamic arguments are outside the literal boundary"],
    };
    if (Object.hasOwn(operatorKinds, character)) {
      const [kind, message] = operatorKinds[character];
      return { issues: [issue(command, shell, kind, message, index)], tokens };
    }
    if (character === "\\" && shell === "posix") {
      return {
        issues: [
          issue(
            command,
            shell,
            "SHELL_ESCAPE_UNSUPPORTED",
            "POSIX shell escapes are outside the literal boundary",
            index,
          ),
        ],
        tokens,
      };
    }

    const start = index;
    while (
      index < command.length &&
      !/[ \t\r\n"'<>|&;$`(){}#,]/.test(command[index]) &&
      !(shell === "posix" && command[index] === "\\")
    ) {
      index += 1;
    }
    if (index === start) {
      return {
        issues: [
          issue(
            command,
            shell,
            "TOKEN_UNSUPPORTED",
            "command contains a token outside the literal boundary",
            index,
          ),
        ],
        tokens,
      };
    }
    tokens.push({
      end: index,
      quoteState: "unquoted",
      start,
      value: command.slice(start, index),
    });
  }
  return { issues: [], tokens };
}

function isRepositoryRelativePath(value) {
  if (!value || value === "." || value.startsWith("/") || value.startsWith("~")) {
    return value === ".";
  }
  if (
    value.includes("\\") ||
    value.includes(":") ||
    /[\0-\x1f*?[\]]/.test(value)
  ) {
    return false;
  }
  const components = value.split("/");
  return (
    components.every((component) => component && component !== "..") &&
    !components.some((component) => component.toLowerCase() === ".git")
  );
}

function pathIssues(command, shell, tokens) {
  const invalid = tokens.find((token) => !isRepositoryRelativePath(token.value));
  return invalid
    ? [
        tokenIssue(
          command,
          shell,
          invalid,
          "REPOSITORY_PATH_REQUIRED",
          "inspection paths must be lexical repository-relative paths without traversal or .git access",
        ),
      ]
    : [];
}

function argumentIssue(command, shell, token, message) {
  return [
    tokenIssue(
      command,
      shell,
      token,
      "ARGUMENT_SHAPE_NOT_ALLOWED",
      message,
    ),
  ];
}

function commandIssue(command, shell, token, kind, message) {
  return [tokenIssue(command, shell, token, kind, message)];
}

function validateGetContent(command, shell, tokens) {
  if (shell !== "powershell") {
    return commandIssue(
      command,
      shell,
      tokens[0],
      "PLATFORM_COMMAND_NOT_ALLOWED",
      "Get-Content is allowed only under the PowerShell boundary",
    );
  }
  if (
    tokens.length !== 4 ||
    tokens[1].value.toLowerCase() !== "-raw" ||
    tokens[2].value.toLowerCase() !== "-literalpath"
  ) {
    return argumentIssue(
      command,
      shell,
      tokens[1] ?? tokens[0],
      "Get-Content must use: Get-Content -Raw -LiteralPath '<repository-relative-path>'",
    );
  }
  return pathIssues(command, shell, [tokens[3]]);
}

function validateCat(command, shell, tokens) {
  if (shell !== "posix") {
    return commandIssue(
      command,
      shell,
      tokens[0],
      "PLATFORM_COMMAND_NOT_ALLOWED",
      "cat is allowed only under the POSIX boundary",
    );
  }
  if (tokens.length < 3 || tokens[1].value !== "--") {
    return argumentIssue(
      command,
      shell,
      tokens[1] ?? tokens[0],
      "cat must use: cat -- '<repository-relative-path>'",
    );
  }
  return pathIssues(command, shell, tokens.slice(2));
}

function validateSed(command, shell, tokens) {
  if (shell !== "posix") {
    return commandIssue(
      command,
      shell,
      tokens[0],
      "PLATFORM_COMMAND_NOT_ALLOWED",
      "sed is allowed only under the POSIX boundary",
    );
  }
  if (
    tokens.length !== 5 ||
    tokens[1].value !== "-n" ||
    !/^\d+(?:,\d+)?p$/.test(tokens[2].value) ||
    tokens[3].value !== "--"
  ) {
    return argumentIssue(
      command,
      shell,
      tokens[1] ?? tokens[0],
      "sed must use: sed -n '<line-or-range>p' -- '<repository-relative-path>'",
    );
  }
  return pathIssues(command, shell, [tokens[4]]);
}

function validateRipgrep(command, shell, tokens) {
  if (tokens[1]?.value === "--files") {
    if (tokens.slice(2).some((token) => token.value.startsWith("-"))) {
      const invalid = tokens.slice(2).find((token) => token.value.startsWith("-"));
      return argumentIssue(command, shell, invalid, "rg --files accepts only repository-relative paths");
    }
    return pathIssues(command, shell, tokens.slice(2));
  }
  const fixed = tokens[2]?.value === "-F";
  const separatorIndex = fixed ? 3 : 2;
  if (
    tokens[1]?.value !== "-n" ||
    (fixed ? tokens[2]?.value !== "-F" : false) ||
    tokens[separatorIndex]?.value !== "--" ||
    tokens.length < separatorIndex + 3
  ) {
    return argumentIssue(
      command,
      shell,
      tokens[1] ?? tokens[0],
      "rg must use rg --files [paths] or rg -n [-F] -- '<literal-pattern>' '<repository-relative-path>'",
    );
  }
  const pattern = tokens[separatorIndex + 1];
  if (pattern.quoteState !== "single") {
    return argumentIssue(
      command,
      shell,
      pattern,
      "rg search patterns must be single-quoted literal data",
    );
  }
  return pathIssues(command, shell, tokens.slice(separatorIndex + 2));
}

function isSafeRevision(value) {
  return /^[A-Za-z0-9._/@~^:+-]+(?:\.\.[A-Za-z0-9._/@~^:+-]+)?$/.test(value);
}

function validatePathsAfterSeparator(command, shell, tokens, allowedFlags, {
  allowRevisions = false,
  requireDiffGuards = false,
} = {}) {
  if (
    requireDiffGuards &&
    (!tokens.some((token) => token.value === "--no-ext-diff") ||
      !tokens.some((token) => token.value === "--no-textconv"))
  ) {
    return argumentIssue(
      command,
      shell,
      tokens[0],
      "history and diff inspection requires --no-ext-diff and --no-textconv",
    );
  }
  const separator = tokens.findIndex((token) => token.value === "--");
  const optionsAndRevisions = separator === -1 ? tokens : tokens.slice(0, separator);
  for (const token of optionsAndRevisions) {
    const value = token.value;
    if (
      allowedFlags.has(value) ||
      [...allowedFlags].some((flag) => flag.endsWith("=") && value.startsWith(flag)) ||
      allowRevisions && isSafeRevision(value)
    ) {
      continue;
    }
    return argumentIssue(command, shell, token, "git argument is outside the documented read-only shape");
  }
  return separator === -1 ? [] : pathIssues(command, shell, tokens.slice(separator + 1));
}

function validateGit(command, shell, tokens) {
  if (
    tokens[1]?.value !== "--no-optional-locks" ||
    tokens[2]?.value !== "--no-pager" ||
    !tokens[3]
  ) {
    return argumentIssue(
      command,
      shell,
      tokens[1] ?? tokens[0],
      "git inspection requires: git --no-optional-locks --no-pager <allowed-subcommand>",
    );
  }
  const subcommand = tokens[3].value;
  const args = tokens.slice(4);
  if (subcommand === "status") {
    const allowed = new Set(["--branch", "--short", "--untracked-files=all"]);
    const invalid = args.find((token) => !allowed.has(token.value));
    if (invalid || !args.some((token) => token.value === "--short")) {
      return argumentIssue(
        command,
        shell,
        invalid ?? tokens[3],
        "git status accepts only --short, --branch, and --untracked-files=all",
      );
    }
    return [];
  }
  if (subcommand === "diff") {
    return validatePathsAfterSeparator(
      command,
      shell,
      args,
      new Set([
        "--cached",
        "--check",
        "--name-only",
        "--name-status",
        "--no-ext-diff",
        "--no-textconv",
        "--staged",
        "--stat",
      ]),
      { allowRevisions: true, requireDiffGuards: true },
    );
  }
  if (subcommand === "show" || subcommand === "log") {
    return validatePathsAfterSeparator(
      command,
      shell,
      args,
      new Set([
        "--all",
        "--decorate",
        "--format=",
        "--graph",
        "--max-count=",
        "--name-only",
        "--name-status",
        "--no-ext-diff",
        "--no-textconv",
        "--oneline",
        "--pretty=",
        "--stat",
        "--summary",
        "--topo-order",
      ]),
      { allowRevisions: true, requireDiffGuards: true },
    );
  }
  if (subcommand === "rev-parse") {
    const allowed = new Set(["--is-inside-work-tree", "--show-toplevel", "--verify"]);
    const invalid = args.find((token) => !allowed.has(token.value) && !isSafeRevision(token.value));
    return invalid
      ? argumentIssue(command, shell, invalid, "git rev-parse argument is outside the read-only shape")
      : [];
  }
  if (subcommand === "merge-base") {
    const values = args.filter((token) => token.value !== "--is-ancestor");
    const invalid = values.find((token) => !isSafeRevision(token.value));
    if (
      invalid ||
      values.length !== 2 ||
      args.some((token) => token.value.startsWith("-") && token.value !== "--is-ancestor")
    ) {
      return argumentIssue(
        command,
        shell,
        invalid ?? args[0] ?? tokens[3],
        "git merge-base accepts two literal revisions and optional --is-ancestor",
      );
    }
    return [];
  }
  if (subcommand === "ls-files") {
    return validatePathsAfterSeparator(
      command,
      shell,
      args,
      new Set([
        "--cached",
        "--deleted",
        "--exclude-standard",
        "--modified",
        "--others",
        "--stage",
      ]),
    );
  }
  if (subcommand === "ls-tree") {
    return validatePathsAfterSeparator(
      command,
      shell,
      args,
      new Set(["-r", "--full-tree", "--name-only"]),
      { allowRevisions: true },
    );
  }
  return commandIssue(
    command,
    shell,
    tokens[3],
    "GIT_SUBCOMMAND_NOT_ALLOWED",
    `git ${subcommand} is outside the explicit read-only boundary`,
  );
}

function validateNode(command, shell, tokens) {
  const allowedScripts = new Set([
    ".agents/skills/kyw-task/scripts/task-artifacts.mjs",
    "skills/kyw-task/scripts/task-artifacts.mjs",
  ]);
  if (
    tokens.length !== 5 ||
    !allowedScripts.has(tokens[1]?.value) ||
    tokens[2]?.value !== "validate" ||
    tokens[3]?.value !== "--task-directory"
  ) {
    return argumentIssue(
      command,
      shell,
      tokens[1] ?? tokens[0],
      "node is allowed only for the packaged Task pair validator's validate operation",
    );
  }
  return pathIssues(command, shell, [tokens[1], tokens[4]]);
}

export function commandShellForPlatform(platform = process.platform) {
  return platform === "win32" ? "powershell" : "posix";
}

export function inspectReadOnlyCommand(
  value,
  { shell = commandShellForPlatform() } = {},
) {
  if (!COMMAND_SHELLS.has(shell)) {
    throw new Error(`Unsupported command shell: ${shell}`);
  }
  const command = String(value ?? "");
  const parsed = tokenizeLiteralCommand(command, shell);
  if (parsed.issues.length > 0) {
    return { allowed: false, executable: null, issues: parsed.issues };
  }
  if (parsed.tokens.length === 0) {
    return {
      allowed: false,
      executable: null,
      issues: [
        issue(
          command,
          shell,
          "EMPTY_COMMAND",
          "read-only inspection command cannot be empty",
          0,
        ),
      ],
    };
  }
  const executableToken = parsed.tokens[0];
  if (executableToken.quoteState !== "unquoted") {
    return {
      allowed: false,
      executable: null,
      issues: commandIssue(
        command,
        shell,
        executableToken,
        "EXECUTABLE_LITERAL_REQUIRED",
        "the allowed executable name must be an unquoted literal",
      ),
    };
  }
  const executable = normalizedExecutable(executableToken.value);
  const validators = new Map([
    ["cat", validateCat],
    ["get-content", validateGetContent],
    ["git", validateGit],
    ["node", validateNode],
    ["rg", validateRipgrep],
    ["sed", validateSed],
  ]);
  if (!validators.has(executable)) {
    const wrapper = SHELL_WRAPPERS.has(executable);
    return {
      allowed: false,
      executable,
      issues: commandIssue(
        command,
        shell,
        executableToken,
        wrapper ? "SHELL_WRAPPER_UNSUPPORTED" : "COMMAND_NOT_ALLOWED",
        wrapper
          ? "shell wrappers and command-string launchers are outside the read-only boundary"
          : `${executableToken.value} is not an allowed read-only inspection executable`,
      ),
    };
  }
  const issues = validators.get(executable)(command, shell, parsed.tokens);
  return { allowed: issues.length === 0, executable, issues };
}

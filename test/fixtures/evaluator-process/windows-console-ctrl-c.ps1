param(
  [Parameter(Mandatory = $true)][string]$NodePath,
  [Parameter(Mandatory = $true)][string]$Entrypoint,
  [Parameter(Mandatory = $true)][ValidateSet('audit', 'grilling')][string]$Flow,
  [Parameter(Mandatory = $true)][string]$StateDirectory,
  [Parameter(Mandatory = $true)][string]$ResultPath
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;

public static class EvaluatorConsoleControl {
    public const uint CREATE_NEW_CONSOLE = 0x00000010;
    public const uint STARTF_USESHOWWINDOW = 0x00000001;
    public const short SW_HIDE = 0;
    public const uint CTRL_C_EVENT = 0;
    public const uint WAIT_OBJECT_0 = 0;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public uint cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public uint dwX;
        public uint dwY;
        public uint dwXSize;
        public uint dwYSize;
        public uint dwXCountChars;
        public uint dwYCountChars;
        public uint dwFillAttribute;
        public uint dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint dwProcessId;
        public uint dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern bool CreateProcessW(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        IntPtr environment,
        string currentDirectory,
        ref STARTUPINFO startupInfo,
        out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool FreeConsole();

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AttachConsole(uint processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetConsoleCtrlHandler(IntPtr handlerRoutine, bool add);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GenerateConsoleCtrlEvent(uint ctrlEvent, uint processGroupId);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr handle);

    public static PROCESS_INFORMATION Start(string application, string commandLine, string currentDirectory) {
        STARTUPINFO startup = new STARTUPINFO();
        startup.cb = (uint)Marshal.SizeOf(startup);
        startup.dwFlags = STARTF_USESHOWWINDOW;
        startup.wShowWindow = SW_HIDE;
        PROCESS_INFORMATION process;
        if (!CreateProcessW(application, new StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, false,
            CREATE_NEW_CONSOLE, IntPtr.Zero, currentDirectory, ref startup, out process)) {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "CreateProcessW failed");
        }
        return process;
    }
}
'@

function Quote-NativeArgument([string]$Value) {
  return '"' + ($Value -replace '"', '\"') + '"'
}

New-Item -ItemType Directory -Path $StateDirectory -Force | Out-Null
$commandLine = @(
  (Quote-NativeArgument $NodePath),
  (Quote-NativeArgument $Entrypoint),
  (Quote-NativeArgument $Flow),
  (Quote-NativeArgument $StateDirectory),
  'hang'
) -join ' '
$process = [EvaluatorConsoleControl]::Start($NodePath, $commandLine, (Split-Path -Parent $Entrypoint))
$launchPath = Join-Path $StateDirectory 'console-launch.json'
[IO.File]::WriteAllText(
  $launchPath,
  (@{ evaluatorPid = $process.dwProcessId } | ConvertTo-Json) + [Environment]::NewLine,
  [Text.UTF8Encoding]::new($false)
)
$readyPath = Join-Path $StateDirectory 'ready.json'
$deadline = [DateTime]::UtcNow.AddSeconds(20)
while (-not (Test-Path -LiteralPath $readyPath)) {
  if ([DateTime]::UtcNow -ge $deadline) { throw 'Evaluator readiness marker timed out' }
  Start-Sleep -Milliseconds 25
}

[EvaluatorConsoleControl]::FreeConsole() | Out-Null
if (-not [EvaluatorConsoleControl]::AttachConsole($process.dwProcessId)) {
  throw "AttachConsole failed: $([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
}
[EvaluatorConsoleControl]::SetConsoleCtrlHandler([IntPtr]::Zero, $true) | Out-Null
$generated = [EvaluatorConsoleControl]::GenerateConsoleCtrlEvent(
  [EvaluatorConsoleControl]::CTRL_C_EVENT,
  0
)
Start-Sleep -Milliseconds 100
[EvaluatorConsoleControl]::FreeConsole() | Out-Null
$wait = [EvaluatorConsoleControl]::WaitForSingleObject($process.hProcess, 30000)
$exitCode = [uint32]0
$exitCodeRead = [EvaluatorConsoleControl]::GetExitCodeProcess($process.hProcess, [ref]$exitCode)
[EvaluatorConsoleControl]::CloseHandle($process.hThread) | Out-Null
[EvaluatorConsoleControl]::CloseHandle($process.hProcess) | Out-Null

$resultJson = @{
  attachedPid = $process.dwProcessId
  ctrlCGenerated = $generated
  exitCode = $exitCode
  exitCodeRead = $exitCodeRead
  waitCompleted = ($wait -eq [EvaluatorConsoleControl]::WAIT_OBJECT_0)
} | ConvertTo-Json
[IO.File]::WriteAllText(
  $ResultPath,
  $resultJson + [Environment]::NewLine,
  [Text.UTF8Encoding]::new($false)
)

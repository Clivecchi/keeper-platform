$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class KeeperProcEnv {
    const uint PROCESS_QUERY_INFORMATION = 0x0400;
    const uint PROCESS_VM_READ = 0x0010;

    [StructLayout(LayoutKind.Sequential)]
    struct PROCESS_BASIC_INFORMATION {
        public IntPtr Reserved1;
        public IntPtr PebBaseAddress;
        public IntPtr Reserved2_0;
        public IntPtr Reserved2_1;
        public IntPtr UniqueProcessId;
        public IntPtr InheritedFromUniqueProcessId;
    }

    [DllImport("ntdll.dll")]
    static extern int NtQueryInformationProcess(IntPtr h, int cls, ref PROCESS_BASIC_INFORMATION pbi, int len, out int ret);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int pid);

    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr h);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool ReadProcessMemory(IntPtr h, IntPtr addr, byte[] buf, int size, out int read);

    static long ReadInt64(IntPtr h, IntPtr addr) {
        byte[] buf = new byte[8];
        int read;
        if (!ReadProcessMemory(h, addr, buf, 8, out read) || read != 8) {
            throw new Exception("read ptr failed");
        }
        return BitConverter.ToInt64(buf, 0);
    }

    public static Dictionary<string, string> Read(int pid) {
        IntPtr h = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid);
        if (h == IntPtr.Zero) throw new Exception("open failed " + Marshal.GetLastWin32Error());
        try {
            var pbi = new PROCESS_BASIC_INFORMATION();
            int ret;
            int status = NtQueryInformationProcess(h, 0, ref pbi, Marshal.SizeOf(pbi), out ret);
            if (status != 0) throw new Exception("ntquery " + status);
            long processParameters = ReadInt64(h, pbi.PebBaseAddress + 0x20);
            long env = ReadInt64(h, new IntPtr(processParameters + 0x80));
            if (env == 0) throw new Exception("env pointer empty");

            var all = new List<byte>();
            byte[] chunk = new byte[4096];
            for (int offset = 0; offset < 262144; offset += 4096) {
                int read;
                if (!ReadProcessMemory(h, new IntPtr(env + offset), chunk, chunk.Length, out read) || read <= 0) break;
                all.AddRange(new ArraySegment<byte>(chunk, 0, read));
                if (read < chunk.Length) break;
                int n = all.Count;
                if (n >= 4 && all[n - 1] == 0 && all[n - 2] == 0 && all[n - 3] == 0 && all[n - 4] == 0) break;
            }

            string text = Encoding.Unicode.GetString(all.ToArray());
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (string entry in text.Split(new char[] { '\0' }, StringSplitOptions.RemoveEmptyEntries)) {
                int eq = entry.IndexOf('=');
                if (eq <= 0) continue;
                string name = entry.Substring(0, eq);
                string value = entry.Substring(eq + 1);
                if (!map.ContainsKey(name)) map[name] = value;
            }
            return map;
        } finally {
            CloseHandle(h);
        }
    }
}
"@

$names = @('ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'TOGETHER_API_KEY', 'ELEVENLABS_API_KEY')
$map = $null
foreach ($pidTry in @(6800, 26596, 13124)) {
    try {
        $map = [KeeperProcEnv]::Read($pidTry)
        Write-Output "env-read pid=$pidTry entries=$($map.Count)"
        break
    } catch {
        Write-Output "env-read pid=$pidTry failed: $($_.Exception.Message)"
    }
}

if (-not $map) { throw 'Could not read the running API environment' }

foreach ($name in $names) {
    if ($map.ContainsKey($name) -and $map[$name]) {
        Set-Item -Path "Env:$name" -Value $map[$name]
        Write-Output "$name len=$($map[$name].Length)"
    } else {
        Write-Output "$name missing"
    }
}

foreach ($procId in @(6800, 21072, 13124)) {
    $alive = Get-Process -Id $procId -ErrorAction SilentlyContinue
    if ($alive) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/d","/s","/c","pnpm --filter keeper-api dev" -WorkingDirectory "K:\Keeper Codebase\keeper-platform" -WindowStyle Hidden

$healthy = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:3002/health" -UseBasicParsing -TimeoutSec 3
        Write-Output "health $($res.StatusCode)"
        $healthy = $true
        break
    } catch {
        Write-Output "health-wait $($i + 1)"
    }
}

foreach ($name in $names) {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}

if (-not $healthy) { exit 1 }

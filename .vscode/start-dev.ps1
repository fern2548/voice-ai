# สคริปต์สตาร์ทเซิร์ฟเวอร์สำหรับ VS Code tasks
#
# ทำไมต้องแยกเป็นไฟล์: ถ้าเขียนคำสั่งยาว ๆ ที่มี pipe กับ ; ไว้ใน tasks.json โดยตรง
# VS Code จะใส่เครื่องหมายคำพูดครอบให้ แล้ว PowerShell ตีความเป็นข้อความธรรมดา ไม่ใช่คำสั่ง
# ทำให้เซิร์ฟเวอร์ไม่สตาร์ท โดยไม่มี error ที่อ่านรู้เรื่อง
#
# หน้าที่: 1) ฆ่าโปรเซสที่ค้างบนพอร์ต  2) สตาร์ทเซิร์ฟเวอร์  3) เปิดเบราว์เซอร์ให้ (ถ้าสั่ง)

param(
  [Parameter(Mandatory = $true)][int]$Port,
  [Parameter(Mandatory = $true)][string]$Dir,
  [Parameter(Mandatory = $true)][string]$Exe,
  # รับเป็นข้อความเดียวคั่นด้วยคอมมา แล้วค่อยแยกเอง
  # (ถ้าประกาศเป็น [string[]] จะขึ้นกับว่า VS Code ใส่ quote ครอบหรือไม่ ซึ่งไม่แน่นอน)
  [Parameter(Mandatory = $true)][string]$ExeArgs,
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Continue'

# ---- 1. เคลียร์พอร์ตที่ค้าง ----
$stale = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
if ($stale) {
  foreach ($procId in $stale) {
    Write-Host "[start-dev] พอร์ต $Port ถูกจับอยู่ ปิด PID $procId ก่อน"
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 700
}

# ---- 2. เปิดเบราว์เซอร์เมื่อเซิร์ฟเวอร์พร้อม (ทำแยกไม่ให้ไปบล็อกตัวเซิร์ฟเวอร์) ----
# ไม่ใช้ open:true ของ Vite เพราะ VS Code รัน task ในโหมด NonInteractive
# การสั่งเปิดเบราว์เซอร์จากตรงนั้นไม่น่าเชื่อถือ
if ($OpenBrowser) {
  $url = "http://localhost:$Port/"
  Start-Job -ScriptBlock {
    param($u, $p)
    for ($i = 0; $i -lt 60; $i++) {
      Start-Sleep -Milliseconds 500
      $up = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
      if ($up) { Start-Process $u; break }
    }
  } -ArgumentList $url, $Port | Out-Null
}

# ---- 3. สตาร์ทเซิร์ฟเวอร์ (ทำงานค้างไว้ใน terminal นี้) ----
Set-Location -Path $Dir
$argList = $ExeArgs.Split(',') | Where-Object { $_ -ne '' }
Write-Host "[start-dev] เริ่ม $Exe $($argList -join ' ') ที่ $Dir (พอร์ต $Port)"
& $Exe @argList

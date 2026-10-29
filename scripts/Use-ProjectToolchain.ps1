$toolchainRoot = Join-Path $env:LOCALAPPDATA 'us-mobile-toolchain'
$projectNode = Join-Path $toolchainRoot 'node-v22.23.4-win-x64'
$projectJava = Join-Path $toolchainRoot 'jdk-21.0.12.1+1'

foreach ($executable in @("$projectNode\node.exe", "$projectJava\bin\java.exe")) {
    if (-not (Test-Path -LiteralPath $executable)) {
        throw "Missing project tool: $executable. See docs/development-setup.md."
    }
}

# Keep these versions local to this terminal so other projects retain their defaults.
$env:JAVA_HOME = $projectJava
$env:Path = "$projectNode;$projectJava\bin;$PSScriptRoot\..\node_modules\.bin;$env:Path"
$androidSdk = Join-Path $env:LOCALAPPDATA 'Android\Sdk'
if (Test-Path -LiteralPath "$androidSdk\platform-tools\adb.exe") {
    $env:ANDROID_HOME = $androidSdk
    $env:Path = "$androidSdk\platform-tools;$env:Path"
}
Write-Host 'Project tools active: Node 22.23.4, Java 21.0.12.1. Use npm.cmd/npx.cmd in PowerShell.'

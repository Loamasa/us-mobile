---
description: restart emulators and expo for phone testing
---

# Ready to Test

Use this after finishing an implementation when the user wants to test on their phone via Expo Go.

Emulators and Metro may already be running — this kills them cleanly and restarts fresh.

## Steps

1. Kill all Java (emulator) and Node (Metro) processes:

// turbo
2. Run:

```powershell
Get-Process -Name "java","node" -ErrorAction SilentlyContinue | ForEach-Object { try { $_.Kill(); Write-Host "Killed $($_.Name) PID $($_.Id)" } catch {} }
```

Wait 2 seconds, then continue.

// turbo
3. Start Firebase emulators:

```powershell
firebase emulators:start --project demo-us-app
```

Wait until you see `All emulators ready!`.

// turbo
4. Start Expo dev server:

```powershell
npx expo start --clear
```

5. Open **Expo Go** on phone → scan the QR code.

6. Tell the user:
   > "✅ App is ready. Scan the QR code in Expo Go. If emulator doesn't connect, go to **Settings → Developer → Seed Test Data**."

@echo off
cd /d "c:\Users\Admin\Desktop\WEB"
echo.
echo === Step 1: Backfill override timezones ===
npx ts-node --transpile-only prisma/scripts/backfill-override-timezone.ts
echo.
echo === Step 2: Initial conflict scan ===
npx ts-node --transpile-only prisma/scripts/initial-conflict-scan.ts
echo.
echo === Step 3: TypeScript check ===
npx tsc --noEmit
echo.
echo === Step 4: Git add and push ===
git add -A
git status
git commit -m "feat: timezone conflict detection — complete implementation" --allow-empty
git push origin main
echo.
echo === DONE ===
pause

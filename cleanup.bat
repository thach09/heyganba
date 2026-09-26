@echo off
cd /d d:\GitHub\heyganba
del /q next.config.ts postcss.config.mjs eslint.config.mjs package.json package-lock.json tsconfig.json README.md 2>nul
rmdir /s /q app 2>nul
rmdir /s /q public 2>nul
echo DONE

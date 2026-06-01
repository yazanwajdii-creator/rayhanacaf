# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 05-accounting.spec.js >> Accounting math — هذه أرقام مال، يجب أن تكون صحيحة 100% >> المصاريف الإجمالية = COGS + oblPaid + mSalPaid (لا تشمل الـ pmts)
- Location: e2e/05-accounting.spec.js:77:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /opt/pw-browsers/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```
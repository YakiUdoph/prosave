<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# SAVE Developer Governance & Coding Guidelines

This document contains mandatory instructions for every AI coding agent working on the SAVE codebase. These rules are designed to prevent **product drift**, maintain visual fidelity, enforce security practices, and ensure native sponsor integrations.

---

## 🚫 Absolute Rules (No Exceptions)

- **NEVER** modify or redesign the approved frontend components, color palettes, visual hierarchies, card design, or layout composition. Design system changes are locked.
- **NEVER** commit `.env` or configuration files containing real API secrets, passphrases, or private keys.
- **NEVER** expose private keys or server-side keys to client-side bundles or browser console outputs.
- **NEVER** hardcode private RPC URLs containing authorization tokens.
- **NEVER** fabricate transactions, mock execution outcomes as real on-chain events under live status labels, or claim unverified token contracts are verified.
- **NEVER** mix live blockchain balances with demo data without distinct internal state flags (`dataSource: "live"` vs `"demo"`/`"unverified"`).

---

## 🛠️ Step-by-Step Coding Workflow (Anti-Drift Protocol)

Every time you are assigned a task, follow this exact sequence:

```
[READ GOVERNANCE DOCS] 
   └─> PRD, Sponsor Integration Map, Drift Log, Roadmap, Design Spec (if UI)
[INSPECT WORKING DIRECTORY]
   └─> Run git status, verify active commit & clean working tree
[IMPLEMENT INCREMENTALLY]
   └─> Small, focused modifications. Do not write monolithic changes
[BUILD VERIFICATION]
   └─> Always run: npm run build (must exit 0 with no syntax/typescript warnings)
[MANUAL / AUTOMATED TEST]
   └─> Verify logic against expected RPC or contract state
[COMPARE AGAINST PRD]
   └─> Confirm no unintended side-effects or feature drift occurred
[UPDATE DRIFT LOG]
   └─> Document any new limitations, contract changes, or workarounds discovered
[GIT COMMIT]
   └─> Create a clean logical commit representing the step completed
```

---

## 🚦 Stop Conditions

Stop implementation immediately and request explicit user confirmation if:
1. A sponsor API integration behaves differently than documented (e.g., OKX API returns unexpected quote schemas).
2. A smart contract address listed in baseline metadata fails bytecode verification (returns `0x`).
3. An RPC endpoint goes down permanently or requires authentication tokens that cannot be securely held on the server.
4. Implementing a functionality requires modifying the approved visual design system.
5. You suspect any API credential, private key, or private endpoint URL has been logged or staged in git history.
6. A package installation significantly alters existing routing, SSR, or build pipeline dynamics.

---

## 📝 Document Checklist for Task Startup

Before starting code edits, verify you have read:
- [`SAVE_PRD.md`](file:///c:/Users/PC/Desktop/SAVE-XLayer/SAVE_PRD.md)
- [`SAVE_SPONSOR_INTEGRATION.md`](file:///c:/Users/PC/Desktop/SAVE-XLayer/SAVE_SPONSOR_INTEGRATION.md)
- [`DRIFT_LOG.md`](file:///c:/Users/PC/Desktop/SAVE-XLayer/DRIFT_LOG.md)
- [`SAVE_IMPLEMENTATION_ROADMAP.md`](file:///c:/Users/PC/Desktop/SAVE-XLayer/SAVE_IMPLEMENTATION_ROADMAP.md)
- [`SAVE_DESIGN_SYSTEM.md`](file:///c:/Users/PC/Desktop/SAVE-XLayer/SAVE_DESIGN_SYSTEM.md)

*Every coding session must keep the working directory clean and build outputs error-free. Failure to follow these rules constitutes a delivery failure.*

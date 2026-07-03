<p align="center">
  <img src="assets/logo.png" alt="" width="94">
</p>


<h1 align="center">pi-discuss-mode — Safety Without the Planning</h1>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-6C5CE7?style=flat-square">
  <img src="https://img.shields.io/badge/tests-16%20passed-2ea44f?style=flat-square">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square">
</p>

<p align="center">
  <strong>A read-only discussion mode for code review, architecture analysis, and safe exploration.<br>
  Toggle it on — edits are blocked, bash is restricted, and your code stays untouched.</strong>
</p>

---

## Watch the Demo

If you want the fastest way to understand `pi-discuss-mode`, start with this short demo.

https://github.com/user-attachments/assets/0a8cdc37-6413-4d6e-88ec-e0adec7fc036

## 💡 Why pi-discuss-mode?

I use Claude Code's **plan mode** a lot. Not because I need to make plans — but because it gives me **safety**. It won't write files, won't edit code, won't `rm -rf` anything, and won't `git push` without asking. I can just talk to the AI and know nothing bad will happen.

But plan mode comes with a workflow I don't always want. I don't need a plan — I just want to **discuss**. Explore a codebase, ask architecture questions, review a PR, think out loud. No planning overhead, no "this is my plan".

That's where **discuss mode** comes from.

| Plan mode | Discuss mode |
|---|---|
| I want to propose changes | I want to talk about code |
| I need a structured plan | I just want to explore |
| Changes will follow | Nothing will change |

Discuss mode is plan mode's **safety without the planning**. One toggle, same protection.

Special thanks to the Pi team for the [plan-mode example](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/examples/extensions/plan-mode), which this extension is built on top of. The bash allowlist and blocklist are directly reused from plan mode so discuss mode keeps the same permission boundary while removing the planning workflow.

## 🎯 Start Here

| If you want to... | Start here |
|---|---|
| **Use discuss mode right now** | [Quick Start ↓](#-quick-start) |
| **Understand the safety model** | [Safe Command Policy ↓](#-safe-command-policy) |
| **See how it works internally** | [Architecture ↓](#-architecture) |
| **Run tests / contribute** | [Development ↓](#-development) |

## 🚀 Quick Start

### Install

```bash
pi install npm:pi-discuss-mode
```

### Use

| Method | Action |
|---|---|
| **Command** | Type `/discuss` in chat |
| **Shortcut** | Press `Ctrl+Alt+D` |
| **Flag** | Start Pi with `--discuss` |

### What happens

Once discuss mode is active:

<p align="center">
  <img src="assets/discuss-mode-on.png" width="80%">
  <br>
  <em>Pi startup with discuss mode ON — status bar shows 💬 discuss indicator</em>
</p>

- ✅ **Read** files freely
- ✅ **Bash** only safe commands (`cat`, `grep`, `ls`, `git status`, `curl`, etc.)
- ❌ **Edit / Write** tools — blocked with a clear error message
- ❌ **Destructive bash** (`rm`, `sudo`, `npm install`, `git push`, etc.) — blocked
- 💬 **Status bar** shows `💬 discuss` indicator
- 🔄 Toggle again to restore full access

## 🏗️ Architecture

Discuss Mode uses a **two-layer safety design**:

```
┌─────────────────────────────────────────────────┐
│  Layer 1: before_agent_start (on switch only)   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Injects [DISCUSS MODE] / [DISC MODE ENDED]  │ │
│ │ system message on the next agent request    │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│  Layer 2: tool_call interceptor (always active) │
│ ┌─────────────────────────────────────────────┐ │
│ │  Edit/Write?  -->  Block                    │ │
│ │  Bash?        -->  isSafeCommand() check    │ │
│ │                 ├─ Safe        --> Allow    │ │
│ │                 └─ Destructive --> Block    │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Layer 1** — `before_agent_start` hook injects a system message telling the LLM it's in discuss mode. This only fires when toggling, so no overhead during normal use.

**Layer 2** — `tool_call` hook acts as a real-time safety net that's always on. Even if the LLM ignores the system message (or a different model is used mid-session), the tool call is intercepted before any damage is done.

## 🔒 Safe Command Policy

<p align="center">
  <img src="assets/discuss-mode-blocked.png" width="80%">
  <br>
  <em>Attempting to write a file — blocked with a clear error message</em>
</p>

### ✅ Allowed (read-only)

```
cat, head, tail, less, more      # View files
grep, find, rg, fd, awk, sed -n  # Search
ls, pwd, tree, stat, file, du, df # Filesystem info
echo, printf, wc, sort, uniq     # Output & text tools
git status/log/diff/show/branch   # Git read-only commands
curl, wget -O -                   # Network (read only)
ps, top, htop, free, uptime       # System info
node --version, python --version  # Version checks
```

### ❌ Blocked (destructive)

```
rm, rmdir, mv, cp, mkdir, touch      # File operations
chmod, chown, chgrp, ln, tee, dd     # System operations
npm install/..., yarn add/..., pip install   # Package install
git add/commit/push/pull/merge/reset/checkout # Git write operations
sudo, su                             # Privilege escalation
kill, pkill, reboot, shutdown        # Process & system control
vim, nano, code, subl                # Interactive editors
```

### ⚡ Edge Cases

- **Piped commands** (`echo "rm file"`) — blocked if any destructive keyword is detected, even in arguments
- **Leading whitespace** (`  cat file.txt`) — correctly recognized as safe
- **Empty input** — always blocked

## 🧪 Development

```bash
# Install dependencies
npm install

# Run tests (16 test cases)
npm test

# Test output
✓ cat file.txt should be allowed
✓ grep foo bar.txt should be allowed
✓ rm file.txt should NOT be allowed
✓ npm install foo should NOT be allowed
✓ empty string should NOT be allowed
... (16 total, all pass)
```

### Project Structure

```
pi-discuss-mode/
├── index.ts          # Extension entry point, toggle logic, hooks
├── utils.ts          # Safe/destructive command definitions, isSafeCommand()
├── package.json
└── test/
    └── utils.test.ts  # 16 vitest cases
```

## 📝 License

MIT

---

<p align="center">
  <sub>MIT License · Built for Pi Coding Agent</sub>
</p>

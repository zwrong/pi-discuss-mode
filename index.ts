/**
 * Discuss Mode Extension
 *
 * Read-only discussion mode for code review, architecture discussion, and analysis.
 * When enabled, edit/write tools are blocked and bash is restricted to safe commands.
 *
 * Features:
 * - /discuss command or Ctrl+Alt+D to toggle
 * - before_agent_start injects system message (only on mode switch)
 * - tool_call interception as safety net (always active)
 * - Bash restricted to allowlisted read-only commands
 */

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";
import { isSafeCommand } from "./utils.ts";

// === Prompt constants (hardcoded, no external templates) ===

const DISCUSS_MODE_ENTER_PROMPT = `[DISCUSS MODE]
We are now in discuss mode. This is a read-only discussion for code review, architecture discussion and analysis.

You CAN use:
- read
- bash (only read-only commands like cat, grep, git status, curl, etc.)

You CANNOT use:
- edit, write (file modifications are disabled)
- destructive bash commands (rm, mv, sudo, npm install, git push, etc.)

Please do NOT attempt to modify any files. If changes are needed, describe what should be done.`;

const DISCUSS_MODE_EXIT_PROMPT = `[DISCUSS MODE ENDED]
The discussion is over. You now have full access again.
You can use edit, write, and all bash commands normally.`;

// === Error message constants (no mention of /discuss) ===

const DISCUSS_MODE_PREFIX = "💬 Discuss mode";

function discussModeBlockReason(toolName: string): string {
  return `${DISCUSS_MODE_PREFIX}: cannot use ${toolName}. File modifications are disabled.`;
}

const DISCUSS_MODE_COMMAND_NOT_ALLOWED = `${DISCUSS_MODE_PREFIX}: command not allowed.`;

// === Extension entry point ===

export default function discussModeExtension(pi: ExtensionAPI): void {
  let discussMode = false;
  let pendingEnterMessage = false;
  let pendingExitMessage = false;

  // ── Flag: --discuss ──

  pi.registerFlag("discuss", {
    description: "Start in discuss mode (read-only discussion)",
    type: "boolean",
    default: false,
  });

  // ── UI helpers ──

  function updateFooter(ctx: ExtensionContext): void {
    if (discussMode) {
      ctx.ui.setStatus("discuss-mode", ctx.ui.theme.fg("accent", "💬 discuss"));
    } else {
      ctx.ui.setStatus("discuss-mode", undefined);
    }
  }

  // ── Toggle logic ──

  function toggleDiscussMode(ctx: ExtensionContext): void {
    if (discussMode) {
      // After exiting discuss mode: LLM still thinks it's in readonly mode
      // Set pendingExitMessage so before_agent_start injects
      // [DISCUSS MODE ENDED] on the next agent request
      discussMode = false;
      pendingExitMessage = true;
      pendingEnterMessage = false;
      ctx.ui.notify("💬 Discuss mode OFF — Full access restored.");
    } else {
      // After entering discuss mode: set pendingEnterMessage so
      // before_agent_start injects [DISCUSS MODE] on the next request
      discussMode = true;
      pendingEnterMessage = true;
      pendingExitMessage = false;
      ctx.ui.notify("💬 Discuss mode ON — Read only, no changes allowed.");
    }
    updateFooter(ctx);
  }

  // ── /discuss command ──

  pi.registerCommand("discuss", {
    description: "Toggle discuss mode (read-only discussion)",
    handler: async (_args, ctx) => toggleDiscussMode(ctx),
  });

  // ── Ctrl+Alt+D shortcut ──

  pi.registerShortcut(Key.ctrlAlt("d"), {
    description: "Toggle discuss mode",
    handler: async (ctx) => toggleDiscussMode(ctx),
  });

  // ── Layer 1: before_agent_start — inject system message (only on switch) ──

  pi.on("before_agent_start", async () => {
    if (pendingEnterMessage) {
      pendingEnterMessage = false;
      return {
        message: {
          role: "system",
          customType: "discuss-mode-context",
          content: DISCUSS_MODE_ENTER_PROMPT,
          display: false,
        },
      };
    }

    if (pendingExitMessage) {
      pendingExitMessage = false;
      return {
        message: {
          role: "system",
          customType: "discuss-mode-context",
          content: DISCUSS_MODE_EXIT_PROMPT,
          display: false,
        },
      };
    }
  });

  // ── Layer 2: tool_call — safety net (always active) ──

  pi.on("tool_call", async (event) => {
    if (!discussMode) return;

    if (event.toolName === "edit" || event.toolName === "write") {
      return {
        block: true,
        reason: discussModeBlockReason(event.toolName),
      };
    }

    if (event.toolName === "bash") {
      const command = event.input.command as string;
      if (!isSafeCommand(command)) {
        return {
          block: true,
          reason: DISCUSS_MODE_COMMAND_NOT_ALLOWED,
        };
      }
    }
  });

  // ── Session start: restore state and handle --discuss flag ──

  pi.on("session_start", async (_event, ctx) => {
    if (pi.getFlag("discuss") === true) {
      discussMode = true;
      pendingEnterMessage = true;
      pendingExitMessage = false;
      updateFooter(ctx);
    }
  });
}

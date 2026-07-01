import { test, expect } from "vitest";
import { isSafeCommand } from "./utils";

// === 安全命令（应该放行） ===

test("cat file.txt should be allowed", () => {
  expect(isSafeCommand("cat file.txt")).toBe(true);
});

test("grep foo bar.txt should be allowed", () => {
  expect(isSafeCommand("grep foo bar.txt")).toBe(true);
});

test("ls -la should be allowed", () => {
  expect(isSafeCommand("ls -la")).toBe(true);
});

test("git status should be allowed", () => {
  expect(isSafeCommand("git status")).toBe(true);
});

test("git diff HEAD should be allowed", () => {
  expect(isSafeCommand("git diff HEAD")).toBe(true);
});

test("curl https://example.com should be allowed", () => {
  expect(isSafeCommand("curl https://example.com")).toBe(true);
});

test("node --version should be allowed", () => {
  expect(isSafeCommand("node --version")).toBe(true);
});

// === 破坏性命令（应该拦截） ===

test("rm file.txt should NOT be allowed", () => {
  expect(isSafeCommand("rm file.txt")).toBe(false);
});

test("npm install foo should NOT be allowed", () => {
  expect(isSafeCommand("npm install foo")).toBe(false);
});

test("git push should NOT be allowed", () => {
  expect(isSafeCommand("git push")).toBe(false);
});

test("sudo something should NOT be allowed", () => {
  expect(isSafeCommand("sudo rm -rf /")).toBe(false);
});

test("mv file1 file2 should NOT be allowed", () => {
  expect(isSafeCommand("mv file1 file2")).toBe(false);
});

test("echo with rm in args should NOT be allowed (blacklist matches rm)", () => {
  // Even though echo is safe, the presence of "rm" in args triggers destructive check
  expect(isSafeCommand("echo rm")).toBe(false);
});

// === 边界情况 ===

test("empty string should NOT be allowed", () => {
  expect(isSafeCommand("")).toBe(false);
});

test("whitespace-only should NOT be allowed", () => {
  expect(isSafeCommand("   ")).toBe(false);
});

test("command with leading whitespace should still match safe patterns", () => {
  expect(isSafeCommand("  cat file.txt")).toBe(true);
});

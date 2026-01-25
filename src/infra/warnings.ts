const warningFilterKey = Symbol.for("clawdbot.warning-filter");

type Warning = Error & {
  code?: string;
  name?: string;
  message?: string;
};

type WarningFilterState = {
  installed: boolean;
  listener?: (warning: Warning) => void;
};

function shouldIgnoreWarning(warning: Warning): boolean {
  if (warning.code === "DEP0040" && warning.message?.includes("punycode")) {
    return true;
  }
  if (warning.code === "DEP0060" && warning.message?.includes("util._extend")) {
    return true;
  }
  if (
    warning.name === "ExperimentalWarning" &&
    warning.message?.includes("SQLite is an experimental feature")
  ) {
    return true;
  }
  return false;
}

/**
 * Install a process warning filter that suppresses known benign warnings.
 * Returns a cleanup function to remove the listener (useful for test teardown).
 */
export function installProcessWarningFilter(): () => void {
  const globalState = globalThis as typeof globalThis & {
    [warningFilterKey]?: WarningFilterState;
  };
  if (globalState[warningFilterKey]?.installed) {
    // Already installed - return a no-op cleanup
    return () => {};
  }

  const listener = (warning: Warning) => {
    if (shouldIgnoreWarning(warning)) return;
    process.stderr.write(`${warning.stack ?? warning.toString()}\n`);
  };

  globalState[warningFilterKey] = { installed: true, listener };
  process.on("warning", listener);

  return () => {
    const state = globalState[warningFilterKey];
    if (state?.listener) {
      process.off("warning", state.listener);
      state.listener = undefined;
      state.installed = false;
    }
  };
}

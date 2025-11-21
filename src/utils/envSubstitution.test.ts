import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  substituteEnvVars,
  substituteInArray,
  substituteInObject,
} from "./envSubstitution.js";

describe("substituteEnvVars", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    // Reset process.env to a clean state with test variables
    process.env = {
      ...originalEnv,
      TEST_VAR: "test-value",
      HOME: "/home/testuser",
      APP_NAME: "myapp",
      API_KEY: "secret-key-123",
      EMPTY_VAR: "",
    };
    // Spy on console.warn to verify warning messages
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
  describe("basic substitution with ${VAR} syntax", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute a single ${VAR} syntax", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${TEST_VAR}");
      expect(result).toBe("test-value");
    });

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute ${VAR} in the middle of a string", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("prefix-${TEST_VAR}-suffix");
      expect(result).toBe("prefix-test-value-suffix");
    });

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute ${VAR} at the start of string", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${TEST_VAR}-end");
      expect(result).toBe("test-value-end");
    });

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute ${VAR} at the end of string", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("start-${TEST_VAR}");
      expect(result).toBe("start-test-value");
    });
  });

  describe("$VAR syntax should NOT be substituted", () => {
    it("should NOT substitute $VAR syntax (remains as-is)", () => {
      const result = substituteEnvVars("$TEST_VAR");
      expect(result).toBe("$TEST_VAR");
    });

    it("should NOT substitute $VAR in the middle of a string", () => {
      const result = substituteEnvVars("prefix-$TEST_VAR-suffix");
      expect(result).toBe("prefix-$TEST_VAR-suffix");
    });

    it("should NOT substitute adjacent $VAR variables", () => {
      const result = substituteEnvVars("$HOME$APP_NAME");
      expect(result).toBe("$HOME$APP_NAME");
    });

    it("should preserve values like hoge$hoge", () => {
      const result = substituteEnvVars("hoge$hoge");
      expect(result).toBe("hoge$hoge");
    });

    it("should preserve complex token-like values with dollar signs", () => {
      const result = substituteEnvVars("token$abc123$def");
      expect(result).toBe("token$abc123$def");
    });
  });

  describe("multiple variables", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute multiple ${VAR} in a string", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${HOME}/.config/${APP_NAME}");
      expect(result).toBe("/home/testuser/.config/myapp");
    });

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute adjacent ${VAR} variables", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${HOME}${APP_NAME}");
      expect(result).toBe("/home/testusermyapp");
    });

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should substitute ${VAR} but keep $VAR as-is in mixed syntax", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("$HOME/.config/${APP_NAME}");
      expect(result).toBe("$HOME/.config/myapp");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = substituteEnvVars("");
      expect(result).toBe("");
    });

    it("should pass through strings without variables", () => {
      const result = substituteEnvVars("no variables here");
      expect(result).toBe("no variables here");
    });

    it("should substitute variable with empty value", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("value:${EMPTY_VAR}:end");
      expect(result).toBe("value::end");
    });

    it("should handle underscore in variable name", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${API_KEY}");
      expect(result).toBe("secret-key-123");
    });

    it("should handle numbers in variable name", () => {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      process.env["VAR123"] = "numeric-var";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${VAR123}");
      expect(result).toBe("numeric-var");
    });
  });

  describe("undefined environment variables (graceful fallback)", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should NOT throw error for missing ${VAR}, return original with warning", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${MISSING_VAR}");
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      expect(result).toBe("${MISSING_VAR}");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Warning: Environment variable 'MISSING_VAR' is not defined. Keeping original placeholder.",
      );
    });

    it("should preserve multiple missing variables with warnings", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${MISSING1}-${MISSING2}");
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      expect(result).toBe("${MISSING1}-${MISSING2}");
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });

    it("should substitute defined vars and preserve undefined vars", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${HOME}/path/${UNDEFINED_VAR}");
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      expect(result).toBe("/home/testuser/path/${UNDEFINED_VAR}");
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it("should NOT warn for $VAR format (not matched at all)", () => {
      const result = substituteEnvVars("$MISSING_VAR");
      expect(result).toBe("$MISSING_VAR");
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("special characters and partial matches", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    it("should handle ${VAR} with similar names correctly", () => {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      process.env["HOME_DIR"] = "/home/dir";
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${HOME_DIR}");
      expect(result).toBe("/home/dir");
    });

    it("should handle dollar sign not part of variable pattern", () => {
      // A dollar sign followed by non-word characters should be left as-is
      const result = substituteEnvVars("price: $100");
      expect(result).toBe("price: $100");
    });

    it("should handle multiple dollar signs", () => {
      const result = substituteEnvVars("$$");
      expect(result).toBe("$$");
    });

    it("should handle dollar sign at end of string", () => {
      const result = substituteEnvVars("cost$");
      expect(result).toBe("cost$");
    });
  });
});

describe("substituteInObject", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      API_KEY: "secret-123",
      LOG_DIR: "/var/log",
      HOME: "/home/user",
    };
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
  it("should substitute all values in an object using ${VAR} syntax", () => {
    const input = {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      key1: "${API_KEY}",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      key2: "${LOG_DIR}/app.log",
      key3: "no-vars",
    };

    const result = substituteInObject(input);

    expect(result).toEqual({
      key1: "secret-123",
      key2: "/var/log/app.log",
      key3: "no-vars",
    });
  });

  it("should NOT substitute $VAR syntax in object values", () => {
    const input = {
      key1: "$API_KEY",
      key2: "hoge$hoge",
    };

    const result = substituteInObject(input);

    expect(result).toEqual({
      key1: "$API_KEY",
      key2: "hoge$hoge",
    });
  });

  it("should handle empty object", () => {
    const result = substituteInObject({});
    expect(result).toEqual({});
  });

  it("should not mutate original object", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    const input = { key: "${HOME}" };
    const result = substituteInObject(input);

    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    expect(input["key"]).toBe("${HOME}");
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(result["key"]).toBe("/home/user");
  });

  it("should preserve undefined variables with warning in object values", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    const input = { key: "${MISSING}" };
    const result = substituteInObject(input);

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    expect(result).toEqual({ key: "${MISSING}" });
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});

describe("substituteInArray", () => {
  const originalEnv = process.env;
  let consoleWarnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HOME: "/home/user",
      CONFIG_DIR: "/etc/app",
      APP_NAME: "myapp",
    };
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleWarnSpy.mockRestore();
  });

  // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
  it("should substitute all elements in an array using ${VAR} syntax", () => {
    const input = [
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      "${HOME}/.config",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      "${CONFIG_DIR}/config.json",
      "plain-string",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      "${APP_NAME}",
    ];

    const result = substituteInArray(input);

    expect(result).toEqual([
      "/home/user/.config",
      "/etc/app/config.json",
      "plain-string",
      "myapp",
    ]);
  });

  it("should NOT substitute $VAR syntax in array elements", () => {
    const input = ["$HOME/.config", "$APP_NAME", "hoge$hoge"];

    const result = substituteInArray(input);

    expect(result).toEqual(["$HOME/.config", "$APP_NAME", "hoge$hoge"]);
  });

  it("should handle empty array", () => {
    const result = substituteInArray([]);
    expect(result).toEqual([]);
  });

  it("should not mutate original array", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    const input = ["${HOME}"];
    const result = substituteInArray(input);

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    expect(input[0]).toBe("${HOME}");
    expect(result[0]).toBe("/home/user");
  });

  it("should preserve undefined variables with warning in array elements", () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    const input = ["${MISSING}"];
    const result = substituteInArray(input);

    // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
    expect(result).toEqual(["${MISSING}"]);
    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});

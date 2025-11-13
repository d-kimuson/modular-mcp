import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  substituteEnvVars,
  substituteInArray,
  substituteInObject,
} from "./envSubstitution.js";

describe("substituteEnvVars", () => {
  const originalEnv = process.env;

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
  });

  afterEach(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  describe("basic substitution", () => {
    it("should substitute a single $VAR syntax", () => {
      const result = substituteEnvVars("$TEST_VAR");
      expect(result).toBe("test-value");
    });

    it("should substitute a single ${VAR} syntax", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("${TEST_VAR}");
      expect(result).toBe("test-value");
    });

    it("should substitute $VAR in the middle of a string", () => {
      const result = substituteEnvVars("prefix-$TEST_VAR-suffix");
      expect(result).toBe("prefix-test-value-suffix");
    });

    it("should substitute ${VAR} in the middle of a string", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("prefix-${TEST_VAR}-suffix");
      expect(result).toBe("prefix-test-value-suffix");
    });
  });

  describe("multiple variables", () => {
    it("should substitute multiple variables in a string", () => {
      const result = substituteEnvVars("$HOME/.config/$APP_NAME");
      expect(result).toBe("/home/testuser/.config/myapp");
    });

    it("should substitute adjacent variables", () => {
      const result = substituteEnvVars("$HOME$APP_NAME");
      expect(result).toBe("/home/testusermyapp");
    });

    it("should substitute mixed syntax", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      const result = substituteEnvVars("$HOME/.config/${APP_NAME}");
      expect(result).toBe("/home/testuser/.config/myapp");
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
      const result = substituteEnvVars("value:$EMPTY_VAR:end");
      expect(result).toBe("value::end");
    });

    it("should handle variable at the start of string", () => {
      const result = substituteEnvVars("$TEST_VAR-end");
      expect(result).toBe("test-value-end");
    });

    it("should handle variable at the end of string", () => {
      const result = substituteEnvVars("start-$TEST_VAR");
      expect(result).toBe("start-test-value");
    });

    it("should handle underscore in variable name", () => {
      const result = substituteEnvVars("$API_KEY");
      expect(result).toBe("secret-key-123");
    });

    it("should handle numbers in variable name", () => {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      process.env["VAR123"] = "numeric-var";
      const result = substituteEnvVars("$VAR123");
      expect(result).toBe("numeric-var");
    });
  });

  describe("missing environment variables", () => {
    it("should throw error for missing $VAR", () => {
      expect(() => substituteEnvVars("$MISSING_VAR")).toThrow(
        "Environment variable 'MISSING_VAR' is not defined",
      );
    });

    it("should throw error for missing ${VAR}", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      expect(() => substituteEnvVars("${MISSING_VAR}")).toThrow(
        "Environment variable 'MISSING_VAR' is not defined",
      );
    });

    it("should throw error with context when part of larger string", () => {
      expect(() => substituteEnvVars("prefix-$MISSING_VAR-suffix")).toThrow(
        "Environment variable 'MISSING_VAR' is not defined",
      );
    });
  });

  describe("special characters and partial matches", () => {
    it("should not substitute partial matches", () => {
      // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
      process.env["HOME_DIR"] = "/home/dir";
      const result = substituteEnvVars("$HOME_DIR");
      expect(result).toBe("/home/dir");
      // HOME should not match HOME_DIR
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
  });
});

describe("substituteInObject", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      API_KEY: "secret-123",
      LOG_DIR: "/var/log",
      HOME: "/home/user",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should substitute all values in an object", () => {
    const input = {
      key1: "$API_KEY",
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

  it("should handle empty object", () => {
    const result = substituteInObject({});
    expect(result).toEqual({});
  });

  it("should not mutate original object", () => {
    const input = { key: "$HOME" };
    const result = substituteInObject(input);

    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(input["key"]).toBe("$HOME");
    // biome-ignore lint/complexity/useLiteralKeys: TypeScript requires bracket notation for index signatures
    expect(result["key"]).toBe("/home/user");
  });

  it("should throw error for missing variables in object values", () => {
    const input = { key: "$MISSING" };
    expect(() => substituteInObject(input)).toThrow(
      "Environment variable 'MISSING' is not defined",
    );
  });
});

describe("substituteInArray", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HOME: "/home/user",
      CONFIG_DIR: "/etc/app",
      APP_NAME: "myapp",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should substitute all elements in an array", () => {
    const input = [
      "$HOME/.config",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Testing literal string substitution
      "${CONFIG_DIR}/config.json",
      "plain-string",
      "$APP_NAME",
    ];

    const result = substituteInArray(input);

    expect(result).toEqual([
      "/home/user/.config",
      "/etc/app/config.json",
      "plain-string",
      "myapp",
    ]);
  });

  it("should handle empty array", () => {
    const result = substituteInArray([]);
    expect(result).toEqual([]);
  });

  it("should not mutate original array", () => {
    const input = ["$HOME"];
    const result = substituteInArray(input);

    expect(input[0]).toBe("$HOME");
    expect(result[0]).toBe("/home/user");
  });

  it("should throw error for missing variables in array elements", () => {
    const input = ["$MISSING"];
    expect(() => substituteInArray(input)).toThrow(
      "Environment variable 'MISSING' is not defined",
    );
  });
});

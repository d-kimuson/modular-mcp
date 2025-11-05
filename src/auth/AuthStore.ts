import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  OAuthClientInformationFullSchema,
  OAuthTokensSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { PersistenceFileContent, PersistenceFileKind } from "./types.js";

const moduleMcpDirectory = resolve(homedir(), ".modular-mcp");
const oauthServersDirectory = resolve(moduleMcpDirectory, "oauth-servers");

if (!existsSync(oauthServersDirectory)) {
  mkdirSync(oauthServersDirectory, { recursive: true });
}

export class AuthStore {
  public async getPersistenceFile<K extends PersistenceFileKind>(
    serverUrl: string,
    kind: K,
  ): Promise<PersistenceFileContent[K] | undefined> {
    try {
      const basePath = resolve(
        oauthServersDirectory,
        createHash("md5").update(serverUrl).digest("hex"),
      );

      if (kind === "client") {
        try {
          return OAuthClientInformationFullSchema.parse(
            JSON.parse(
              await readFile(resolve(basePath, "client.json"), "utf-8"),
            ),
          ) satisfies PersistenceFileContent["client"] as PersistenceFileContent[K];
        } catch {
          return undefined;
        }
      }

      if (kind === "tokens") {
        return OAuthTokensSchema.parse(
          JSON.parse(await readFile(resolve(basePath, "tokens.json"), "utf-8")),
        ) satisfies PersistenceFileContent["tokens"] as PersistenceFileContent[K];
      }

      if (kind === "verifier") {
        return (await readFile(
          resolve(basePath, "verifier.txt"),
          "utf-8",
        )) satisfies PersistenceFileContent["verifier"] as PersistenceFileContent[K];
      }

      kind satisfies never;
      throw new Error(`Invalid kind: ${kind}`);
    } catch (_error) {
      return undefined;
    }
  }

  public async savePersistenceFile<K extends PersistenceFileKind>(
    serverUrl: string,
    kind: K,
    content: PersistenceFileContent[K],
  ): Promise<void> {
    const basePath = resolve(
      oauthServersDirectory,
      createHash("md5").update(serverUrl).digest("hex"),
    );

    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }

    if (kind === "client") {
      await writeFile(
        resolve(basePath, "client.json"),
        JSON.stringify(content, null, 2),
        "utf-8",
      );
      return;
    }

    if (kind === "tokens") {
      await writeFile(
        resolve(basePath, "tokens.json"),
        JSON.stringify(content, null, 2),
        "utf-8",
      );
      return;
    }

    if (kind === "verifier") {
      await writeFile(
        resolve(basePath, "verifier.txt"),
        content as PersistenceFileContent["verifier"],
        "utf-8",
      );
      return;
    }

    kind satisfies never;
    throw new Error(`Invalid kind: ${kind}`);
  }

  public async deletePersistenceFile<K extends PersistenceFileKind>(
    serverUrl: string,
    kind: K,
  ): Promise<void> {
    const basePath = resolve(
      oauthServersDirectory,
      createHash("md5").update(serverUrl).digest("hex"),
    );

    if (kind === "verifier") {
      await rm(resolve(basePath, "verifier.txt"));
      return;
    }

    if (kind === "tokens") {
      await rm(resolve(basePath, "tokens.json"));
      return;
    }

    if (kind === "client") {
      await rm(resolve(basePath, "client.json"));
      return;
    }

    kind satisfies never;
    throw new Error(`Invalid kind: ${kind}`);
  }
}

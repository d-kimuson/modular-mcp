import { randomUUID } from "node:crypto";
import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationFull,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import open from "open";
import { sanitizeUrl } from "strict-url-sanitise";

import packageJson from "../../package.json" with { type: "json" };
import { logger } from "../utils/logger.js";
import { AuthStore } from "./AuthStore.js";
import { lockAuthServer } from "./lockAuthServer.js";
import type {
  AuthServerConfig,
  McpServerInfo,
  OAuthClientConfig,
} from "./types.js";

type AwaitAuthCompleted = () => void | Promise<void>;

export class ProxyOAuthClientProvider implements OAuthClientProvider {
  private readonly authStore: AuthStore;
  private awaitAuthCompleted: AwaitAuthCompleted | undefined;

  private constructor(
    private readonly oauthClientConfig: OAuthClientConfig,
    private readonly authServerConfig: AuthServerConfig,
    private readonly mcpServerInfo: McpServerInfo,
    private readonly mutableState: {
      state: string;
    },
  ) {
    this.authStore = new AuthStore();
  }

  public static async create(options: {
    remoteMcpServerUrl: string;
    authorizeResource?: string | undefined;
    callbackPort: number;
  }) {
    const {
      remoteMcpServerUrl,
      callbackPort,
      authorizeResource = undefined,
    } = options;

    const provider = new ProxyOAuthClientProvider(
      {
        name: "Modular MCP OAuth Client",
        uri: "https://github.com/d-kimuson/modular-mcp",
        softwareId: "a8e667eb-1a70-4a87-9a05-8e9d7734f6c7",
        softwareVersion: packageJson.version,
      },
      {
        host: "localhost",
        port: callbackPort,
        path: "/oauth/callback",
      },
      {
        remoteMcpServerUrl,
        authorizeResource,
      },
      {
        state: randomUUID(),
      },
    );

    return {
      provider,
    } as const;
  }

  public setAwaitAuthCompleted(cb: () => void | Promise<void>) {
    this.awaitAuthCompleted = cb;
  }

  // interface api
  get redirectUrl(): string {
    return new URL(
      this.authServerConfig.path,
      `http://${this.authServerConfig.host}:${this.authServerConfig.port}`,
    ).href;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.redirectUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: this.oauthClientConfig.name,
      client_uri: this.oauthClientConfig.uri,
      software_id: this.oauthClientConfig.softwareId,
      software_version: this.oauthClientConfig.softwareVersion,
    };
  }

  state(): string {
    return this.mutableState.state;
  }

  async clientInformation(): Promise<OAuthClientInformationFull | undefined> {
    const persistenceInfo = await this.authStore.getPersistenceFile(
      this.authServerConfig.host,
      "client",
    );

    // check if the port has changed
    if (persistenceInfo?.redirect_uris?.at(0) !== this.redirectUrl) {
      return undefined;
    }

    return persistenceInfo;
  }

  async saveClientInformation(
    clientInformation: OAuthClientInformationFull,
  ): Promise<void> {
    await this.authStore.savePersistenceFile(
      this.authServerConfig.host,
      "client",
      clientInformation,
    );
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    const tokens = await this.authStore.getPersistenceFile(
      this.authServerConfig.host,
      "tokens",
    );

    return tokens;
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    await this.authStore.savePersistenceFile(
      this.authServerConfig.host,
      "tokens",
      tokens,
    );
  }

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    if (this.mcpServerInfo.authorizeResource !== undefined) {
      authorizationUrl.searchParams.set(
        "resource",
        this.mcpServerInfo.authorizeResource,
      );
    }

    const { release } = await lockAuthServer();

    try {
      logger.info(
        "Open the authorization URL, and proceed with the authentication process.",
      );
      logger.info(`URL: ${sanitizeUrl(authorizationUrl.toString())}`);
      await open(sanitizeUrl(authorizationUrl.toString()));
    } catch {
      // do nothing
    } finally {
      await this.awaitAuthCompleted?.();
      release();
    }
  }

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    await this.authStore.savePersistenceFile(
      this.authServerConfig.host,
      "verifier",
      codeVerifier,
    );
  }

  async codeVerifier(): Promise<string> {
    const codeVerifier = await this.authStore.getPersistenceFile(
      this.authServerConfig.host,
      "verifier",
    );
    if (codeVerifier === undefined) {
      throw new Error("Code verifier not found");
    }
    return codeVerifier;
  }

  // Only supports public clients, so we don't need to implement addClientAuthentication.
  // async addClientAuthentication(
  //   _headers: Headers,
  //   _params: URLSearchParams,
  //   _url: string | URL,
  //   _metadata?: AuthorizationServerMetadata,
  // ): Promise<void> {
  //   throw new Error("Method not implemented.");
  // }

  async validateResourceURL(
    serverUrl: string | URL,
    resource?: string,
  ): Promise<URL | undefined> {
    if (
      this.mcpServerInfo.authorizeResource !== undefined &&
      resource !== this.mcpServerInfo.authorizeResource
    ) {
      logger.error(
        `Invalid resource: ${resource} is not allowed for this MCP Server. Allowed resource: ${this.mcpServerInfo.authorizeResource}`,
      );
      return undefined;
    }

    const urlObject =
      typeof serverUrl === "string" ? new URL(serverUrl) : serverUrl;
    if (
      urlObject.host !== new URL(this.mcpServerInfo.remoteMcpServerUrl).host
    ) {
      logger.error(
        `Invalid server URL: ${serverUrl} is not allowed for this MCP Server. Allowed server URL: ${this.mcpServerInfo.remoteMcpServerUrl}`,
      );
      return undefined;
    }

    return urlObject;
  }

  async invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier",
  ): Promise<void> {
    await Promise.all([
      (async () => {
        if (scope === "all" || scope === "client") {
          await this.authStore.deletePersistenceFile(
            this.authServerConfig.host,
            "client",
          );
        }
      })(),
      (async () => {
        if (scope === "all" || scope === "tokens") {
          await this.authStore.deletePersistenceFile(
            this.authServerConfig.host,
            "tokens",
          );
        }
      })(),
      (async () => {
        if (scope === "all" || scope === "verifier") {
          await this.authStore.deletePersistenceFile(
            this.authServerConfig.host,
            "verifier",
          );
        }
      })(),
    ]);
  }
}

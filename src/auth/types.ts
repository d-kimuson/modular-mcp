import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

export type AuthServerConfig = {
  host: string;
  port: number;
  path: string;
};

export type OAuthClientConfig = {
  name: string;
  uri: string;
  softwareId: string;
  softwareVersion: string;
};

export type McpServerInfo = {
  remoteMcpServerUrl: string;
  authorizeResource: string | undefined;
};

export type PersistenceFileKind =
  | "client"
  | "tokens"
  | "verifier"
  | "callback-port";

export type PersistenceFileContent = {
  client: OAuthClientInformationFull;
  tokens: OAuthTokens;
  verifier: string;
  "callback-port": number;
};

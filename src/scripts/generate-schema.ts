import { writeFile } from "node:fs/promises";
import { toJsonSchema } from "@valibot/to-json-schema";
import * as v from "valibot";
import { mcpServerConfigSchema } from "../config/schema.js";

const configJsonSchema = await toJsonSchema(
  v.object({
    mcpServers: v.record(v.string(), mcpServerConfigSchema),
  }),
);

await writeFile(
  "config-schema.json",
  JSON.stringify(configJsonSchema, null, 2),
);

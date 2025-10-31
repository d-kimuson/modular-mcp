import { writeFile } from "node:fs/promises";
import { toJsonSchema } from "@valibot/to-json-schema";
import { serverConfigSchema } from "../types.js";

const configJsonSchema = await toJsonSchema(serverConfigSchema);

await writeFile(
  "config-schema.json",
  JSON.stringify(configJsonSchema, null, 2),
);

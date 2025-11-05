import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { mcpServerConfigSchema } from "../config/schema.js";

const configJsonSchema = z.toJSONSchema(
  z.object({
    mcpServers: z.record(z.string(), mcpServerConfigSchema),
  }),
);

await writeFile(
  "config-schema.json",
  JSON.stringify(configJsonSchema, null, 2),
);

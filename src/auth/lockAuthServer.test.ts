import { setTimeout } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { lockAuthServer } from "./lockAuthServer.js";

describe("lockAuthServer", () => {
  it("should acquire and release a lock", async () => {
    const { release } = await lockAuthServer();
    release();

    const { release: release2 } = await lockAuthServer();
    release2();
  });

  it("should queue multiple locks and process them sequentially", async () => {
    const events: string[] = [];

    const seriesFn = async (index: number) => {
      events.push(`${index}-pending`);
      const { release } = await lockAuthServer();
      events.push(`${index}-process`);
      await setTimeout(100);
      release();
      events.push(`${index}-release`);
    };

    await Promise.all([seriesFn(1), seriesFn(2), seriesFn(3)]);

    expect(events).toEqual([
      "1-pending",
      "2-pending",
      "3-pending",
      "1-process",
      "1-release",
      "2-process",
      "2-release",
      "3-process",
      "3-release",
    ]);
  });
});

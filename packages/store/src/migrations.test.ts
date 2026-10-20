import { describe, expect, it } from "vitest";

import { MIGRATIONS, pendingMigrations } from "./migrations";

describe("pendingMigrations", () => {
  it("shouldReturnEveryMigrationForAnEmptyDatabase", () => {
    expect(pendingMigrations([])).toEqual(MIGRATIONS);
  });

  it("shouldReturnNothingWhenAllAreApplied", () => {
    expect(pendingMigrations(MIGRATIONS.map((migration) => migration.id))).toEqual([]);
  });

  it("shouldRefuseADatabaseNewerThanTheBuild", () => {
    expect(() => pendingMigrations(["9999_from_the_future"])).toThrow(/Upgrade Symbolon/);
  });
});

describe("MIGRATIONS", () => {
  it("shouldHaveUniqueIdsInSortedOrder", () => {
    const ids = MIGRATIONS.map((migration) => migration.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });
});

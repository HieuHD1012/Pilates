import { describe, expect, it, vi } from "vitest";

import { createQueryClient } from "./query-client";
import { queryKeys } from "./api/query-keys";

describe("private photo resources", () => {
  it("revokes replaced, deleted and signed-out photo URLs", () => {
    const revoke = vi.fn();
    vi.stubGlobal("URL", Object.assign(URL, { revokeObjectURL: revoke }));
    const client = createQueryClient();
    const key = queryKeys.students.photoFile(1, 2);
    client.setQueryData(key, "blob:old");
    client.setQueryData(key, "blob:new");
    expect(revoke).toHaveBeenCalledWith("blob:old");
    client.removeQueries({ queryKey: key });
    expect(revoke).toHaveBeenCalledWith("blob:new");
    client.setQueryData(queryKeys.trainers.photo(3), "blob:trainer");
    client.clear();
    expect(revoke).toHaveBeenCalledWith("blob:trainer");
    expect(revoke).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
  });
});

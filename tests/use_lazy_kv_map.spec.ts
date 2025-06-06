import { renderHook } from "@testing-library/react";

import useLazyKVMap from "@/hooks/lazy_kv_map";

describe("useLazyKVMap", () => {
  const data = [
    { id: 1, name: "Alice", children: [{ id: 2, name: "Bob" }] },
    { id: 3, name: "Charlie" },
  ];

  const getRowKey = (record: { id: number }) => record.id;

  it("should retrieve the correct record by key", () => {
    const { result } = renderHook(() =>
      useLazyKVMap(data, "children", getRowKey),
    );
    const getRecordByKey = result.current[0];

    expect(getRecordByKey(1)).toEqual({
      id: 1,
      name: "Alice",
      children: [{ id: 2, name: "Bob" }],
    });
    expect(getRecordByKey(2)).toEqual({ id: 2, name: "Bob" });
    expect(getRecordByKey(3)).toEqual({ id: 3, name: "Charlie" });
  });

  it("should return undefined for non-existent keys", () => {
    const { result } = renderHook(() =>
      useLazyKVMap(data, "children", getRowKey),
    );
    const getRecordByKey = result.current[0];

    expect(getRecordByKey(99)).toBeUndefined();
  });
});

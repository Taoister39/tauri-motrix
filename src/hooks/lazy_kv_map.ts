/**
 * @see https://github.com/ant-design/ant-design/blob/master/components/table/hooks/useLazyKVMap.ts
 */
import { useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObject = Record<PropertyKey, any>;

export type Key = React.Key;

export type GetRowKey<RecordType> = (record: RecordType, index?: number) => Key;

interface MapCache<RecordType = AnyObject> {
  data?: readonly RecordType[];
  childrenColumnName?: string;
  kvMap: Map<Key, RecordType>;
  getRowKey?: (record: RecordType, index: number) => Key;
}

const useLazyKVMap = <RecordType extends AnyObject = AnyObject>(
  data: readonly RecordType[],
  childrenColumnName: string,
  getRowKey: GetRowKey<RecordType>,
) => {
  const mapCacheRef = useRef<MapCache<RecordType>>({
    kvMap: new Map<Key, RecordType>(),
  });

  function getRecordByKey(key: Key): RecordType {
    if (
      !mapCacheRef.current ||
      mapCacheRef.current.data !== data ||
      mapCacheRef.current.childrenColumnName !== childrenColumnName ||
      mapCacheRef.current.getRowKey !== getRowKey
    ) {
      const kvMap = mapCacheRef.current.kvMap;

      function dig(records: readonly RecordType[]) {
        records.forEach((record, index) => {
          const rowKey = getRowKey(record, index);
          kvMap.set(rowKey, record);

          if (
            record &&
            typeof record === "object" &&
            childrenColumnName in record
          ) {
            dig(record[childrenColumnName] || []);
          }
        });
      }

      dig(data);

      mapCacheRef.current = {
        data,
        childrenColumnName,
        kvMap,
        getRowKey,
      };
    }

    return mapCacheRef.current.kvMap.get(key)!;
  }

  return [getRecordByKey] as const;
};

export default useLazyKVMap;

import SchemaError from "./schema-error";
import { Schema, StoreRecord } from "./types";

const isNullOrUndefined = (x: any): boolean => x === null || x === undefined;
const hasValue = (x: any) => !isNullOrUndefined(x);

const isFunction = (x: any) => typeof x === "function";

const arrify = <T>(x: T | T[]): T[] => {
  return isNullOrUndefined(x) ? [] : Array.isArray(x) ? x : [x];
};

/**
 *
 */
export default <T extends { [key: string]: any }>(
  schemas: Schema<T>[] = [],
  schemaName: string,
) => {
  const schemaKeys = schemas.map(x => x.key);

  function isValidType(schema: Schema<T>, value: any) {
    return !schema.type || arrify(schema.type).indexOf(typeof value) !== -1;
  }

  function defaultValue(schema: Schema<T>) {
    return isFunction(schema.default) ? schema.default() : schema.default;
  }

  function inSchema(key: any) {
    return schemaKeys.indexOf(key) !== -1;
  }

  function concat<T>(keys: (keyof T)[], other: (keyof T)[]): (keyof T)[] {
    return keys.concat(other.filter(x => keys.indexOf(x) === -1));
  }

  const validate = async (
    record: [string, Partial<T> | T], // Record
    findMany: () => Promise<StoreRecord<T>[]>,
  ): Promise<void> => {
    if (!schemaKeys.length) return;

    const [key, data] = record;

    const dataKeys = concat(Object.keys(data) as (keyof T)[], schemaKeys);

    for (const dataKey of dataKeys) {
      if (!inSchema(dataKey))
        return Promise.reject(
          new SchemaError(`${dataKey} Not in ${schemaName}`),
        );

      const schema = schemas.find(x => x.key === dataKey)!;

      if (schema.notNull && isNullOrUndefined(data[schema.key]))
        return Promise.reject(
          new SchemaError(`${schemaName}: '${schema.key}' cannot be null`),
        );

      // can't check null, if can't be null, should be checked before
      if (
        hasValue(data[schema.key]) &&
        !isValidType(schema, data[schema.key])
      ) {
        return Promise.reject(
          new SchemaError(
            `${schemaName}: '${schema.key}' expected Type '${arrify(
              schema.type,
            ).join("|")}' got '${typeof data[schema.key]}'`,
          ),
        );
      }

      if (schema.unique) {
        const records = await findMany();
        const prev = records.find(([index, record]) => {
          return index !== key && record[dataKey] === data[schema.key];
        });
        if (prev) {
          return Promise.reject(
            new SchemaError(`${schemaName}: '${dataKey}' 'Must be unique'`),
          );
        }
      }
    }
  };

  const applyDefaultValues = (
    data: Partial<T> | T, // Record
  ): Partial<T> | T => {
    if (!schemaKeys.length) return data;
    let out: Partial<T> = {};
    for (const key of schemaKeys) {
      const schema = schemas.find(x => x.key === key);
      if (schema && isNullOrUndefined(data[schema.key])) {
        out[schema.key] = defaultValue(schema);
      }
    }
    return {
      ...data,
      ...out,
    };
  };

  return {
    validate,
    applyDefaultValues,
  };
};

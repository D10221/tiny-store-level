import { SchemaError } from "./schema-error";
import { isArray } from "util";

export type Schema<T> = {
  key: keyof T;
  notNull?: boolean | undefined;
  unique?: boolean | undefined;
  default?: any | undefined;
  /**
   * whatever returns typeof
   */
  type?: string | string[];
};

const isNull = (x: any): boolean => x === null || x === undefined;

const isFunction = (x: any) => typeof x === "function";

const arrify = <T>(x: T | T[]): T[] => {
  return isNull(x) ? [] : isArray(x) ? x : [x];
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

  const validate = (data: T, indexes: { key: keyof T; values: any[] }[], ignore?: Partial<T>) => {
    if (!schemaKeys.length) return data;

    const keys = concat((Object.keys(data) as (keyof T)[]), schemaKeys);

    return keys.reduce(
      (out, key) => {
        if (!inSchema(key))
          throw new SchemaError(`${key} Not in ${schemaName}`);
        const schema = schemas.find(x => x.key === key);

        const value = !isNull(data[schema.key])
          ? data[schema.key]
          : defaultValue(schema);

        if (schema.notNull && isNull(value))
          throw new SchemaError(
            `${schemaName}: '${schema.key}' cannot be null`,
          );
        // can't check null, if can't be null, should be checked before
        if (!isNull(value) && !isValidType(schema, value)) {
          throw new SchemaError(
            `${schemaName}: '${schema.key}' expected Type '${
            arrify(schema.type).join("|")
            }' got '${typeof value}'`,
          );
        }
        if (schema.unique && indexes && indexes.length) {
          const { values } = indexes.find(x => x.key === key);
          const prev = values && values.indexOf(value) !== -1;
          if (prev) {
            if(!ignore || value !== ignore[key])
            throw new SchemaError(`${schemaName}: '${key}' 'Must be unique'`);
          }          
        }

        out[key] = value;
        return out;
      },
      { ...data as any},
    );
  };

  return {
    validate,
  };
};

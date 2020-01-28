import { Schema, StoreRecord } from "./types";

export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
  }
}
const isNullOrUndefined = (x: any): boolean => x === null || x === undefined;
const hasValue = (x: any) => !isNullOrUndefined(x);
const isFunction = (x: any) => typeof x === "function";
const arrify = <T>(x: T | T[]): T[] => {
  return isNullOrUndefined(x) ? [] : Array.isArray(x) ? x : [x];
};
function isValidType<T>(schema: Schema<T>, value: any) {
  if (!schema.type) return true;
  function check(type: any) {
    switch (type) {
      case "number":
        return schema.type === typeof value;
      case "string":
        return schema.type === typeof value;
      case "boolean":
        return schema.type === typeof value;
      case "object":
        return schema.type === typeof value;
      case "array":
        return Array.isArray(value);
      case "date":
        return value instanceof Date;
      default:
        return false;
    }
  }
  for (const t of arrify(schema.type)) {
    if (check(t)) return true;
  }
  return false;
}
function defaultValue<T>(schema: Schema<T>) {
  return isFunction(schema.default) ? schema.default() : schema.default;
}
const DEFAULT_SCHEMA: Schema<StoreRecord<any>> = {
  key: "$id",
  primaryKey: true,
  notNull: true,
  type: "string",
};
/**
 *
 */
export default function Schemas<T>(
  schemas: Schema<StoreRecord<T>>[] = [],
  schemaName: string,
) {
  // Assign default $id
  schemas =
    schemas && schemas.length
      ? schemas.find(x => Boolean(x.primaryKey))
        ? schemas
        : schemas.concat(DEFAULT_SCHEMA)
      : [DEFAULT_SCHEMA];

  const primaryKeys = schemas.filter(x => Boolean(x.primaryKey));
  if (primaryKeys.length < 1) {
    throw new SchemaError("Missing primary key");
  }
  if (primaryKeys.length > 1) {
    throw new SchemaError(
      `Too Many primary keys [${schemas.map(x => x.key).join(" ,")}]`,
    );
  }
  const primaryKey = primaryKeys[0];
  const schemaKeys = schemas.map(x => x.key) as (keyof T)[]; //.filter(x => x !== primaryKey.key) as (keyof T)[];
  /**
   *  Dont validate $id
   */
  const validate = async (
    record: Partial<StoreRecord<T>>, // Record
    findMany: () => Promise<StoreRecord<T>[]>,
  ): Promise<void> => {
    if (schemaKeys.length === 1) {
      if (schemaKeys[0] === primaryKey.key) {
        // if primary is the Key Only schema, asumme type is untytped.
        return;
      }
      return Promise.reject(
        new Error(
          `Expected primary key ${primaryKey.key} instead of ${schemaKeys[0]} `,
        ),
      );
    }

    // find data keys not in schema
    const dataKeys = Object.keys(record).filter(
      key => !Boolean(schemaKeys.find(x => x === key)),
    );
    if (dataKeys.length > 0) {
      return Promise.reject(
        new SchemaError(
          `[${dataKeys.map(x => `"${x}"`).join(", ")}] Not in Schema: ` +
            ` ${schemaKeys.map(x => `"${x}"`).join(", ")} `,
        ),
      );
    }

    for (const schemaKey of schemaKeys) {
      const schema = schemas.find(x => x.key === schemaKey)!;

      if (schema.notNull && isNullOrUndefined(record[schema.key]))
        return Promise.reject(
          new SchemaError(`${schemaName}: '${schema.key}' cannot be null`),
        );

      // can't check null, if can't be null, should be checked before
      if (
        hasValue(record[schema.key]) &&
        !isValidType(schema, record[schema.key])
      ) {
        return Promise.reject(
          new SchemaError(
            `${schemaName}: '${schema.key}' expected Type '${arrify(
              schema.type,
            ).join("|")} ' got '${typeof record[schema.key]} '`,
          ),
        );
      }
      // ...
      if (schema.unique) {
        const records = await findMany();
        const prev = records
          .filter(x => x[primaryKey.key] !== record[primaryKey.key])
          .find(x => x[schemaKey] === record[schemaKey]);
        if (Boolean(prev)) {
          return Promise.reject(
            new SchemaError(`${schemaName}: '${schemaKey}' 'Must be unique'`),
          );
        }
      }
    }
  };
  const applyDefaultValues = (
    data: Partial<StoreRecord<T>>, // Record
  ): Partial<StoreRecord<T>> | T => {
    if (!schemaKeys.length) return data;
    let out: Partial<StoreRecord<T>> = {};
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
    primaryKey,
  };
}

import { Schema, StoreRecord, Schemap } from "./types";
import memoize from "./memoize";
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
function defaultValue(schema: Schema<any>) {
  return isFunction(schema.default) ? schema.default() : schema.default;
}
const DEFAULT_SCHEMA: Schema<StoreRecord<any>> = {
  key: "_id_",
  primaryKey: true,
  notNull: true,
  type: "string",
};
const keys = memoize(Object.keys);
const isKey = (x: Schema<StoreRecord<any>>) => Boolean(x.primaryKey);
const not = <X>(f: (x: X) => boolean) => memoize((args: X) => !f(args));
const filter = memoize(<X>(xxx: X[]) => Array.prototype.filter.bind(xxx));

const fromMap = <T>(schemas?: Schemap<StoreRecord<T>>) => {
  schemas =
    schemas ||
    ({ [DEFAULT_SCHEMA.key]: DEFAULT_SCHEMA } as Schemap<StoreRecord<T>>);
  const schemaKeys: (keyof StoreRecord<T>)[] = keys(schemas) as any;
  const schemaList = schemaKeys.map(k => schemas![k]);
  // default schema
  if (schemaList.filter(isKey).length < 1) {
    schemas = {
      ...schemas,
      [DEFAULT_SCHEMA.key]: DEFAULT_SCHEMA,
    };
  }
  return {
    schemas,
    schemaList,
    schemaKeys,
  };
};

const fromList = <T>(input: Schema<StoreRecord<T>>[]) => {
  const schemaList = input || [DEFAULT_SCHEMA];
  // default schema
  if (schemaList.filter(isKey).length < 1) {
    schemaList.push(DEFAULT_SCHEMA);
  }
  const schemaKeys = schemaList.map(x => x.key) as (keyof StoreRecord<T>)[];
  return {
    schemas: schemaKeys.reduce((out, key) => {
      out[key] = schemaList.find(x => x.key === key)!;
      return out;
    }, {} as Schemap<StoreRecord<T>>),
    schemaList,
    schemaKeys,
  };
};
/**
 *
 */
export default function Schemas<T>(
  schemaName: string,
  schemapOrList?: Schemap<StoreRecord<T>> | Schema<StoreRecord<T>>[],
) {
  const { schemas, schemaList, schemaKeys } = Array.isArray(schemapOrList)
    ? fromList(schemapOrList)
    : fromMap(schemapOrList);
  // find dupl keys
  const dups = schemaList.filter(
    (s, i, all) =>
      all
        .slice(i + 1)
        .map(x => x.key)
        .indexOf(s.key) !== -1,
  );
  if (dups && dups.length) {
    throw new SchemaError("Dup keys " + dups.map(x => x.key).join(", "));
  }
  const keysNotInSchema = (o: {}) => filter(keys(o))(not(isSchema));

  const rejectNotInSchema = (record: Partial<StoreRecord<T>>) => {
    if (keysNotInSchema(record).length > 0) {
      throw new SchemaError(
        `[${keysNotInSchema(record)
          .map(x => `"${x}"`)
          .join(", ")}] Not in Schema: ` +
          ` ${schemaKeys.map(x => `"${x}"`).join(", ")} `,
      );
    }
  };

  const primaryKeys = filter(schemaList)(isKey);
  if (primaryKeys.length < 1) {
    throw new SchemaError("Missing primary key");
  }
  if (primaryKeys.length > 1) {
    throw new SchemaError(
      `Too Many primary keys [${schemaList.map(x => x.key).join(" ,")}]`,
    );
  }
  const primaryKey: Schema<StoreRecord<T>> = primaryKeys[0];

  if (primaryKey.notNull === false) {
    throw new SchemaError("primary key can't be null");
  }
  if (primaryKey.type && primaryKey.type !== "string") {
    throw new SchemaError("primary key type can only be string");
  }
  if (primaryKey.default) {
    throw new SchemaError("primary key default value: Not Implemented");
  }

  let untyped = false;
  if (schemaKeys.length === 1) {
    if (schemaKeys[0] === primaryKey.key) {
      // if primary is the Key Only schema, asumme type is untytped.
      untyped = true;
    } else {
      throw new Error(
        `Expected primary key ${primaryKey.key} instead of ${schemaKeys[0]} `,
      );
    }
  }
  const isSchema = memoize((key: string) =>
    Boolean(schemaKeys.find(x => x === key)),
  );

  /**
   *  Dont validate _id_
   */
  const validate = async (
    record: Partial<StoreRecord<T>>, // Record
    findMany: () => Promise<StoreRecord<T>[]>,
  ): Promise<void> => {
    if (untyped) return Promise.resolve();
    // find data keys not in schema
    rejectNotInSchema(record);

    for (const schemaKey of schemaKeys) {
      const schema = schemas![schemaKey]!;

      if (schema.notNull && isNullOrUndefined(record[schema.key]))
        return Promise.reject(
          new SchemaError(`${schemaName}: '${schema.key}' cannot be null`),
        );

      if (
        hasValue(record[schema.key]) &&
        !isValidType(schema as any, record[schema.key])
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
      const schema = schemas![key];
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

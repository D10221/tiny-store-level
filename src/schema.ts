import { Schema, StoreRecord, Schemap, SchemaValueType, SchemaValueTypes } from "./types";
import {
  arrify,
  isFunction,
  memoize,
  isNullOrUndefined,
  hasValue,
} from "./util";
export class SchemaError extends Error {
  constructor(message: string) {
    super(message);
  }
}
function isValidType(schema: Schema<any>, value: any) {
  function check(type: SchemaValueType | SchemaValueType[] | undefined) {
    if (!schema.type) return true;
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
  key: "id",
  primaryKey: true,
  notNull: true,
  type: "string",
};
const isKey = (x: Schema<StoreRecord<any>>) => Boolean(x.primaryKey);
const not = <X>(f: (x: X) => boolean) => (args: X) => !f(args);

const fromMap = <T>(schemas?: Schemap<StoreRecord<T>>) => {
  schemas =
    schemas ||
    ({ [DEFAULT_SCHEMA.key]: DEFAULT_SCHEMA } as Schemap<StoreRecord<T>>);
  const schemaKeys: (keyof StoreRecord<T>)[] = Object.keys(schemas) as any;
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
  const keysNotInSchema = (o: {}) => Object.keys(o).filter(not(isSchema));

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
  const primaryKeys = schemaList.filter(isKey);
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
  //
  for (const xTypes of schemaList
    .filter(x => Boolean(x.type))
    .map(x => x.type)
    .map(arrify)) {
    if (xTypes.find(x => x && SchemaValueTypes.indexOf(x) === -1)) {
      throw new Error(`Invalid schema type:[${xTypes.join(" ,")}]`);
    }
  }
  /**
   *  validate record
   */
  const validate = async (
    record: StoreRecord<T>, // Record
    findMany: () => Promise<StoreRecord<T>[]>,
  ): Promise<StoreRecord<T>> => {
    if (untyped) return record;
    try {
      rejectNotInSchema(record); // find data keys not in schema, throws!
      for (const schemaKey of schemaKeys) {
        const schema = schemas[schemaKey];
        if (schema.notNull && isNullOrUndefined(record[schema.key]))
          throw new SchemaError(
            `'${schema.key}' cannot be null`,
          );
        if (schema.type)
          if (hasValue(record[schema.key])) {
            if (!isValidType(schema, record[schema.key]))
              throw new SchemaError(
                `'${schema.key}' expected Type '${arrify(
                  schema.type,
                ).join("|")} ' got '${typeof record[schema.key]} '`,
              );
          }
        // ...
        if (schema.unique) {
          const records = await findMany();
          const prev = records
            .filter(x => x[primaryKey.key] !== record[primaryKey.key])
            .find(x => x[schemaKey] === record[schemaKey]);
          if (Boolean(prev))
            throw new SchemaError(
              `'${schemaKey}' 'Must be unique'`,
            );
        }
      }
      return record;
    } catch (error) {
      return Promise.reject(error);
    }
  };
  const applyDefaults = (
    data: StoreRecord<T>, // Record
  ): StoreRecord<T> | T => {
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
    applyDefaults,
    primaryKey,
  };
}

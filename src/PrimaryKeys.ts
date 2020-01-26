
const PrimaryKeys =  (primaryKeys: string[]) => {  

  const add = (id: string) => <X>(x: X): X => {
    primaryKeys.push(id);
    return x;
  };

  const remove = (id: string) => <X>(x: X): X => {
    primaryKeys = primaryKeys.filter(k => k !== id);
    return x;
  };

  const clear = () => <X>(x: X): X => {
    primaryKeys = [];
    return x;
  };

  return {
    add,
    remove,
    clear,
  };
};

export default PrimaryKeys;

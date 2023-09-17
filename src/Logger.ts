export function Log(obj: any, msg: string, indent: number = 0) {
  let name = obj.constructor.name;
  if (obj.LoggerName !== undefined) {
    name = obj.LoggerName();
  }
  console.log(`[${name}]:${"\t".repeat(indent)} ${msg}`);
}

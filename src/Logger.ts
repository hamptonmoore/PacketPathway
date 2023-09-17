export function Log(obj: any, msg: string) {
    let name = obj.constructor.name;
    if (obj.LoggerName !== undefined) {
        name = obj.LoggerName();
    }
    console.log(`${name}: ${msg}`);
}
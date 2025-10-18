export function throwError(message: string): asserts message is string {
    console.error(message);
    process.exit(1);
}
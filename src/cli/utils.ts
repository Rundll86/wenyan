import fs from "fs/promises";

export async function readFromStdin(): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        process.stdin.setEncoding("utf8");
        process.stdin.resume();
        process.stdin.on("data", chunks.push);
        process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
        process.stdin.on("error", reject);
    });
}
export async function readCode(filepath?: string): Promise<string> {
    if (filepath) {
        return fs.readFile(filepath, "utf-8");
    } else {
        return readFromStdin();
    }
}
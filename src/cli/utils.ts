import fs from "fs/promises";

export async function readFromStdin(): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        process.stdin.on("data", (chunk) => {
            chunks.push(chunk);
        });
        process.stdin.on("end", () => {
            resolve(Buffer.concat(chunks).toString("utf-8"));
        });
        process.stdin.on("error", reject);
    });
}
export async function readCode(filepath?: string): Promise<string> {
    if (filepath) {
        return fs.readFile(filepath, "utf-8");
    } else {
        process.stdin.setEncoding("utf8");
        process.stdin.resume();
        return readFromStdin();
    }
}
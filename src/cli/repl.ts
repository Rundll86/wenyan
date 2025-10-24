#!/usr/bin/env node

import { run } from "./step";
import { Runtime } from "../engine";
import readline from "readline/promises";

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const runtime = new Runtime();
    while (true) {
        let input: string = "";
        try {
            input = await rl.question(" · ");
        } catch {
            process.exit(0);
        };
        if (input.trim() === "致知") {
            process.exit(0);
        } else run(input, runtime, false);
    }
}

main();
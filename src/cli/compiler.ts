#!/usr/bin/env node

import { program } from ".";
import fs from "fs/promises";
import { getAST, getTokens } from "./step";
import { readCode } from "./utils";

program.command("译 [文章之所在]")
    .option("-树, --抽象树 <文书之所在>", "抽象树阵 文书之所在")
    .option("-牌, --令牌 <文书之所在>", "令牌阵 文书之所在")
    .option("-时, --测时", "测时", false)
    .description("译古文为法理之树。无文则从令入")
    .action(async (file, options) => {
        let startTime = Date.now();
        const code = await readCode(file);
        const tokens = getTokens(code);
        if (options.测时) console.log(`令牌：${Date.now() - startTime}ms`);
        startTime = Date.now();
        const ast = getAST(code);
        if (options.测时) console.log(`抽象树：${Date.now() - startTime}ms`);
        if (options.令牌) {
            await fs.writeFile(options.令牌, JSON.stringify(tokens, null, 4));
        };
        if (options.抽象树) {
            await fs.writeFile(options.抽象树, JSON.stringify(ast, null, 4));
        };
    });

program.parse();

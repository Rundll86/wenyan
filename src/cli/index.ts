import { program } from "commander";
import fs from "fs/promises";
import { getAST, getTokens, run } from "./step";
import pack from "../../package.json";
import { DESCRIPTIONS, PROJECT_NAME } from "../engine/common/constans";

program.name(PROJECT_NAME)
    .nameFromFilename(PROJECT_NAME)
    .version(pack.version, "-序, --刊序", "请示刊序")
    .description(DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)])
    .usage("<指示>");

program.helpCommand("助 <指示>", "对指示陈其辅佐之法");
program.helpOption("-助, --助也", "陈以辅佐之法");

program.command("译 [文章之所在]")
    .option("-树, --抽象树 <文书之所在>", "抽象树阵 文书之所在")
    .option("-牌, --令牌 <文书之所在>", "令牌阵 文书之所在")
    .description("译古文为法理之树。无文则从令入")
    .action(async (file, options: Record<"抽象树" | "令牌", string>) => {
        const tokens = await getTokens(file);
        const ast = await getAST(file);
        if (options.令牌) {
            await fs.writeFile(options.令牌, JSON.stringify(tokens, null, 4));
        } else console.log("令牌 =", JSON.stringify(tokens, null, 4));
        if (options.抽象树) {
            await fs.writeFile(options.抽象树, JSON.stringify(ast, null, 4));
        } else console.log("抽象树 =", JSON.stringify(ast, null, 4));
    });
program.command("运转 [文章之所在]")
    .description("运转古文，以观其效。无文则从令入")
    .action(run);
program.parse();

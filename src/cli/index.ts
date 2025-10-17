import { program } from "commander";
import { Parser } from "../engine/compiler/parser";
import { Lexer } from "../engine/compiler/lexer";
import fs from "fs/promises";
import path from "path";

program.command("build <file>")
    .option("-a, --ast <file>", "Output ast location")
    .option("-t, --tokens <file>", "Output tokens location")
    .description("Build the project")
    .action(async (file, options) => {
        const filename = path.basename(file, path.extname(file));
        const tokens = new Lexer(await fs.readFile(file, "utf-8")).tokenize();
        const ast = new Parser(tokens).parse();
        await fs.mkdir(filename, { recursive: true });
        await fs.writeFile(options.ast || `${filename}/ast.json`, JSON.stringify(ast, null, 4));
        await fs.writeFile(options.tokens || `${filename}/tokens.json`, JSON.stringify(tokens, null, 4));
    });
program.parse();

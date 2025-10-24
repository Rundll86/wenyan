#!/usr/bin/env node

import { program } from ".";
import { run } from "./step";
import { readCode } from "./utils";

program.command("运转 [文章之所在]")
    .description("运转古文，以观其效。无文则从令入")
    .action(async (file) => run(await readCode(file)) ?? undefined);

program.parse();

#!/usr/bin/env node

import { createRequire } from 'module';
import { createProject } from '../src/index.js';

const require = createRequire(import.meta.url);
const { Command } = require('commander');
const program = new Command();

program
    .version('1.0.0')
    .description('nanotpl从模板创建项目的cli工具');

program
    .command('create <project-name>')
    .description('从模板创建项目。项目名称默认为demo+时间戳')
    .action(async (projectName) => {
        try {
            // const name = projectName || `demo${Date.now()}`;
            await createProject(projectName);
        } catch (error) {
            console.error('Error:', error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import axios from 'axios';

// 模板配置
const templates = [
  {
    name: '在html中使用tailwindcss的模板项目',
    value: {
      repo: 'JacksionGT/temlates',
      folder: 'tailwind-in-static-html' // 指定文件夹路径
    },
    description: '使用tailwindcss cli编译产出index.css'
  },
  {
    name: 'koa-ts模板',
    value: {
      repo: 'JacksionGT/temlates',
      folder: 'koa-ts' // 指定文件夹路径
    },
    description: '使用koa + typescript构建web应用和接口'
  },
  // 可以添加更多模板配置
];

export async function createProject(projectName) {

  const defaultPrompts = [
    {
      type: 'list',
      name: 'template',
      message: '选择模板:',
      choices: templates.map(t => ({
        name: `${t.name} - ${t.description}`,
        value: t.value
      }))
    }
  ]
  // 检查项目目录是否已存在
  if (fs.existsSync(projectName)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `文件夹 ${chalk.yellow(projectName)} 已存在. 是否覆盖?`,
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.yellow('创建项目被中止.'));
      return;
    }
  }

  let prompts = defaultPrompts;
  if (!projectName) {
    projectName = `demo${Date.now()}`;
    const tipInputProjectName = [
      {
        type: 'input',
        name: 'projectName',
        message: '请输入项目名称',
        default: projectName
      }
    ]
    prompts = [...tipInputProjectName, ...defaultPrompts]
  }

  // 选择模板
  const { template } = await inquirer.prompt(prompts);

  // 下载指定文件夹
  const spinner = ora('Downloading template files...').start();

  try {
    await downloadFolder(template.repo, template.folder, projectName);
    spinner.succeed('Template files downloaded successfully');

    // 安装依赖
    await installDependencies(projectName);

    console.log(chalk.green(`\nProject ${chalk.bold(projectName)} created successfully!`));
    console.log(chalk.yellow(`\nTo get started:\n`));
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan(`  npm start`)); // 或其他适当的启动命令
  } catch (error) {
    spinner.fail('Failed to create project');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function downloadFolder(repo, folderPath, targetDir) {
  const [owner, repoName] = repo.split('/');
  const octokit = new Octokit();

  // 获取文件夹内容
  const { data } = await octokit.repos.getContent({
    owner,
    repo: repoName,
    path: folderPath
  });

  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 下载每个文件
  for (const item of data) {
    if (item.type === 'file') {
      const fileUrl = item.download_url;
      const response = await axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream'
      });

      const filePath = path.join(targetDir, path.basename(item.path));
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } else if (item.type === 'dir') {
      // 递归处理子目录
      await downloadFolder(repo, item.path, path.join(targetDir, path.basename(item.path)));
    }
  }
}

async function installDependencies(projectName) {
  const spinner = ora('Installing dependencies...').start();

  try {
    await execa('pnpm', ['install'], { cwd: projectName });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    throw new Error(error.message);
  }
}
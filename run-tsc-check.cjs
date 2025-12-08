const fs = require('fs');
const path = require('path');
const ts = require('./apps/api/node_modules/typescript');

const projectPath = path.resolve('apps/api');
const configPath = path.join(projectPath, 'tsconfig.json');

const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) {
  const message = ts.formatDiagnosticsWithColorAndContext([configFile.error], {
    getCurrentDirectory: () => process.cwd(),
    getCanonicalFileName: fileName => fileName,
    getNewLine: () => ts.sys.newLine,
  });
  fs.writeFileSync('tsc-diagnostics.log', message);
  process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectPath
);

const program = ts.createProgram({
  rootNames: parsedConfig.fileNames,
  options: parsedConfig.options,
});

const diagnostics = ts.getPreEmitDiagnostics(program);

const formatterHost = {
  getCurrentDirectory: () => process.cwd(),
  getCanonicalFileName: fileName => fileName,
  getNewLine: () => ts.sys.newLine,
};

const output = diagnostics.length
  ? ts.formatDiagnosticsWithColorAndContext(diagnostics, formatterHost)
  : 'No diagnostics';

fs.writeFileSync('tsc-diagnostics.log', output);

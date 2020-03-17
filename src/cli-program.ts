#!/usr/bin/env node
import handleTestAction from './handlers/tests-handler';
import * as commander from 'commander';
const program = new commander.Command();
const packageJson = require('../package.json');

program.version(packageJson.version);

const collectTestParam = (testParam: string, testParamsStore: any) => {
    const splitIndex = testParam.indexOf('=');

    let paramKey, paramVal: string;
    // you can use variables that are in the local environment (like with `docker run` -e option)
    if (splitIndex == -1) {
        paramKey = testParam;
        paramVal = process.env[paramKey];
    } else {
        paramKey = testParam.substring(0, splitIndex);
        paramVal = testParam.substring(splitIndex + 1);
    }

    // if same key defined multiple times, it will override.
    // this behavior is the same as `docker run` -e option which override silently
    testParamsStore[paramKey] = paramVal;
    return testParamsStore;
};

program
    .arguments('<cmd> <url>')
    .option(
        '-p, --package <package>',
        "Which package to test\nIf none provided, we'll try to get it from your package.json"
    )
    .option(
        '-t, --token <token>',
        'Your authentication token, provided at https://app.aspecto.io/app/integration.\nAlternatively, can be passed as ASPECTO_TOKEN env param.'
    )
    .requiredOption('-e, --env <envs>', 'csv of environments the we generate the tests from (i.e. prod,dev)')
    .option(
        '-o, --timeout <timeout>',
        `how long to wait before timing out an API call as part of the test suites, default is dynamic per route based our production analytics.
You can override the dynamic timeout by setting this argument.`
    )
    .option(
        '-m, --allow-methods <methods>',
        'csv of which type of http request methods to test (i.e. get,post,put), default is all'
    )
    .option(
        '-c, --allow-codes <codes>',
        'csv of which type of http response codes to test (i.e. 200,400,404), default is all'
    )
    .option('-a, --allow-fail', 'Whether to fail the process')
    .option(
        '-f, --fail-strategy <strategy>',
        'soft - fail the process only on failed tests. strict - fail the process on any kind of failure',
        'soft'
    )
    .option(
        '-r, --test-param <key=value>',
        'key and value parameter to use for assignment in tests to alter requests',
        collectTestParam,
        {}
    )
    .option('-v --verbose', 'Print debug logs')
    .action((command: string, url: string, prog: any) => {
        if (command !== 'test') {
            console.log('Unknown command, available commands are: test');
            return;
        }
        handleTestAction(url, prog.opts());
    });

program.name('aspecto test').usage('<url to test> [options]');

program.on('--help', () => {
    console.log('Examples:');
    console.log(
        '  $ aspecto test http://localhost:3030 --package my-service --env staging --allow-methods get,post --allow-codes 200,204'
    );
    console.log('  $ aspecto test http://localhost:3030 --allow-fail\n');
});

program.on('option:verbose', function() {
    (global as any).verbose = this.verbose;
});

program.parse(process.argv);

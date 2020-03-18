import { logger } from '../services/logger';
import { AssertionResponse, AssertionResult } from '../types';
import 'colors';

const printRunSummary = (
    startTime: number,
    suitesCount: number,
    suitesPassCount: number,
    testCount: number,
    testPassCount: number
) => {
    const duration = Date.now() - startTime;
    const suitesFailCount = suitesCount - suitesPassCount;
    const testsFailCount = testCount - testPassCount;

    logger.info(
        `${'\nRoutes:'.padEnd(7).bold} ${
            suitesFailCount > 0 ? (`${suitesFailCount} failed`.bold as any).brightRed + ', ' : ''
        }${(`${suitesPassCount} passed`.bold as any).brightGreen}, ${suitesCount} total`
    );
    logger.info(
        `${'Tests:'.padEnd(7).bold} ${
            testsFailCount > 0 ? (`${testsFailCount} failed`.bold as any).brightRed + ', ' : ''
        }${(`${testPassCount} passed`.bold as any).brightGreen}, ${testCount} total`
    );
    const time = duration > 1000 ? `${duration / 1000}s` : `${duration}ms`;
    logger.info(`${'Time:'.padEnd(7).bold} ${time}`);
};

const testNameForPrinting = (test: AssertionResult): string => {
    return `${test.testSnapshot.verb} ${test.actualRequest?.url ?? test.testSnapshot.route} - ${
        test.testSnapshot.statusCode
    } (env: ${test.env})`;
};

export const printAssertionResults = (results: AssertionResponse[], startTime: number) => {
    const suitesCount = results.length;
    let suitesPassCount = 0;

    let testCount = 0;
    let testPassCount = 0;

    results.forEach((suiteResult) => {
        if (suiteResult.success) suitesPassCount++;

        const badge =
            (suiteResult.success ? '✅ ' : '❌ ') +
            ' Route '.bold +
            suiteResult.route.italic.bold +
            (suiteResult.success ? ' passed!' : ' failed:').bold;
        logger.info(badge);

        suiteResult.assertions.forEach((routeAssert) => {
            const assertionResult = routeAssert.assertionResult;
            testCount++;
            if (assertionResult.success) testPassCount++;

            const testName = testNameForPrinting(routeAssert);
            logger.debug(
                (!assertionResult.success ? ('  ✗ ' as any).brightRed : ('  ✓ ' as any).brightGreen) + testName.gray
            );
        });

        !suiteResult.success && logger.newLine();

        suiteResult.assertions
            .filter((r) => !r.assertionResult.success)
            .forEach((routeAssert) => {
                const testName = testNameForPrinting(routeAssert);
                // @ts-ignore
                logger.info(`  ● ${testName}`.italic.brightRed);
                routeAssert.assertionResult.log.split('\n').forEach((x: string) => logger.info(`   ${x}`));
                logger.newLine();
            });
        if (suiteResult.success) logger.debug('');
    });
    printRunSummary(startTime, suitesCount, suitesPassCount, testCount, testPassCount);
};

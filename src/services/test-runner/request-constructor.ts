import { StringObject, AspectoTest, TestRule, RuleTypes, ExtractionParamValue } from '../../types';
import { AxiosRequestConfig, Method } from 'axios';
import calculateTimeout from './timeout-calculator';
import { globalExtractedParams } from '.';

const constructQuery = (queryObject?: StringObject): string => {
    const query: string[] = [];
    if (queryObject) {
        Object.entries(queryObject).forEach(([queryName, value]) => {
            if (Array.isArray(value)) {
                value.forEach((v: string) => query.push(`${queryName}=${encodeURIComponent(v)}`));
            } else query.push(`${queryName}=${encodeURIComponent(value)}`);
        });
    }
    return query.length > 0 ? '?' + query.join('&') : '';
};

const constructUrl = (originalRoute: string, envUrl: string, assignmentRules: any[], testParams: any): string => {
    const originalRouteSegments: string[] = originalRoute.split('/');
    const envSegments: string[] = envUrl.split('/');
    const rulesByUrlSegmentName = assignmentRules.reduce((map, rule) => {
        map[rule.assignment.assignToPath] = rule;
        return map;
    }, {});

    const rulesApplied = originalRouteSegments.map((segment, i) => {
        const rule: TestRule = rulesByUrlSegmentName[segment];
        if (!rule) return envSegments[i];

        const sourceId = rule.assignment?.sourceId;
        switch (rule.subType) {
            case 'cli-param':
                const paramValue = testParams[sourceId];
                if (!paramValue)
                    throw Error(
                        `Missing required CLI test-param '${sourceId}' for URL paramter '${segment}' in route '${originalRoute}'.\nYou can supply the value using CLI option --test-param "${sourceId}={your-param-value}"`
                    );
                return paramValue;

            case 'from-extraction':
                const extractionParamValue: ExtractionParamValue = globalExtractedParams[sourceId];
                if (!extractionParamValue)
                    throw Error(
                        `Test requires parameter from previous test which was not set. Parameter id: '${sourceId}'`
                    );

                if (extractionParamValue.value == undefined)
                    throw Error(
                        `Test requires parameter from previous test which could not be extracted. Parameter id: '${sourceId}'. ${extractionParamValue.error}`
                    );

                return extractionParamValue.value;

            default:
                throw Error(`Unable to apply test rule with unsupported subType '${rule.subType}'`);
        }
    });
    return rulesApplied.join('/');
};

export default (test: AspectoTest, testParams: any): AxiosRequestConfig => {
    const envValues = test.envValues[0].values;

    const assignmentRules: TestRule[] = test.rules.rules.filter((r) => r.type === RuleTypes.Assignment);

    const url = constructUrl(
        test.route,
        envValues.url,
        assignmentRules.filter((r) => r.assignment.assignOn === 'urlParam'),
        testParams
    );

    const config: AxiosRequestConfig = {
        method: test.verb as Method,
        baseURL: global.url,
        url: `${url}${constructQuery(envValues.queryPrams)}`,
        data: envValues.requestBody,
        headers: {
            ...envValues.requestHeaders,
            'X-Origin': 'Aspecto-CLI',
        },
        validateStatus: () => true,
        timeout: calculateTimeout(test),
        // timeout: 10000,
    };

    return config;
};

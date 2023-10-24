import { Octokit as OctokitCore } from '@octokit/core';
import { throttling } from '@octokit/plugin-throttling';

const Octokit = OctokitCore.plugin(throttling);
function onRateLimit(limitName) {
    return (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(
            `${limitName} exceeded for request ${JSON.stringify(options)}`,
        );

        if (retryCount < 2) {
            // Retry twice, to avoid https://github.com/octokit/plugin-throttling.js/issues/599.
            console.info(`Retrying after ${retryAfter} seconds.`);
            return true;
        }
    };
}
const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
    userAgent: 'https://github.com/jyasskin/testing',
    throttle: {
        onRateLimit: onRateLimit('Rate limit'),
        onSecondaryRateLimit: onRateLimit('Secondary rate limit'),
    },
});

console.log(await octokit.graphql(
    `query {
      rateLimit {
        limit
        remaining
        resetAt
      }
    }`));

for (let i = 1; i < 25; i++) {
    const result = await octokit.graphql(`query {
        rateLimit {
            cost
            remaining
            resetAt
        }
        repository(owner: "jyasskin", name: "testing") {
            pullRequests(first: 100) {
                nodes {
                    reviewThreads(first:90){
                        nodes {
                            comments (first:50){
                                nodes
                                {
                                    publishedAt
                                }
                            }
                        }
                    }
                }
            }
        }
    }`);
    console.log(new Date().toISOString(), result.rateLimit);
}

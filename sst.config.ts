// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "shualletjs-nextjs-boilerplate",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: input.stage === "production" ? "hodlocker-production" : "hodlocker-dev"
        }
      }
    };
  },
  async run() {
    const bucket = new sst.aws.Bucket("MyBucket", {
      access: "public"
    });

    new sst.aws.Nextjs("MyWeb"), {
      domain: "hodlocker.com",
      link: [bucket],
      dns: false,
      cert: "arn:aws:acm:us-east-2:861276120584:certificate/88e1a47c-e42d-475a-9530-17d2d434c843"
    }
  },
});

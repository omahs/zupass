import { PCDCollection } from "@pcd/pcd-collection";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { expect } from "chai";
import "mocha";
import MockDate from "mockdate";
import path from "path";
import { CredentialManager } from "../src/CredentialManager";
import { FeedSubscriptionManager } from "../src/SubscriptionManager";
import { MockFeedApi } from "./MockFeedApi";

const identity = new Identity();

describe("feed host", async function () {
  const mockFeedApi = new MockFeedApi();

  this.timeout(1000 * 10);

  this.beforeEach(() => {
    // Means that the time won't change during the test, which could cause
    // spurious issues with timestamps in feed credentials.
    MockDate.set(new Date());
  });

  this.afterEach(() => {
    MockDate.reset();
  });

  this.beforeAll(async () => {
    const fullPath = path.join(__dirname, "../artifacts/");

    await SemaphoreSignaturePCDPackage.init?.({
      wasmFilePath: fullPath + "16.wasm",
      zkeyFilePath: fullPath + "16.zkey"
    });
  });

  it("expired credentials should be rejected", async function () {
    // October 5th 2023, 14:30:00
    const clientDate = new Date(2023, 10, 5, 14, 30, 0, 0);
    // October 5th 2023, 15:30:00, one hour later
    const serverDate = new Date(2023, 10, 5, 15, 30, 0, 0);

    MockDate.set(clientDate);

    const futureFeedApi = new MockFeedApi(serverDate);

    const manager = new FeedSubscriptionManager(futureFeedApi);

    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const response = await manager.listFeeds(firstProviderUrl);
    const feedThatVerifiesCredential = response.feeds[0];

    const collection = new PCDCollection([]);
    const credentialManager = new CredentialManager(identity, collection);

    const sub = await manager.subscribe(
      firstProviderUrl,
      feedThatVerifiesCredential
    );
    await manager.pollSubscriptions(credentialManager);

    // Request fails with expired credentials
    expect(manager.getAllErrors().size).to.eq(1);
    expect(manager.getError(sub.id)?.type).to.eq("fetch-error");

    // Make client use server date
    MockDate.set(serverDate);
    await manager.pollSubscriptions(credentialManager);
    // Request should now succeed
    expect(manager.getAllErrors().size).to.eq(0);
  });

  it("grace period for expired credentials should apply", async function () {
    // October 5th 2023, 14:59:00
    const clientDate = new Date(2023, 10, 5, 14, 59, 0, 0);
    // October 5th 2023, 15:00:00, one minute later
    const serverDate = new Date(2023, 10, 5, 15, 0, 0, 0);

    MockDate.set(clientDate);

    const futureFeedApi = new MockFeedApi(serverDate);

    const manager = new FeedSubscriptionManager(futureFeedApi);

    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const response = await manager.listFeeds(firstProviderUrl);
    const feedThatVerifiesCredential = response.feeds[0];

    const collection = new PCDCollection([]);
    const credentialManager = new CredentialManager(identity, collection);

    await manager.subscribe(firstProviderUrl, feedThatVerifiesCredential);
    await manager.pollSubscriptions(credentialManager);
    // Request should succeed
    expect(manager.getAllErrors().size).to.eq(0);

    // Reset client to original date
    MockDate.set(clientDate);
    // Move the server forward one minute and one second
    serverDate.setMinutes(1);
    serverDate.setSeconds(1);

    await manager.pollSubscriptions(credentialManager);
    // Request should fail
    expect(manager.getAllErrors().size).to.eq(1);
  });

  it("grace period for premature credentials should apply", async function () {
    // October 5th 2023, 15:00:00
    const clientDate = new Date(2023, 10, 5, 15, 0, 0, 0);
    // October 5th 2023, 14:59:00, one minute behind
    const serverDate = new Date(2023, 10, 5, 14, 59, 0, 0);

    MockDate.set(clientDate);

    const futureFeedApi = new MockFeedApi(serverDate);

    const manager = new FeedSubscriptionManager(futureFeedApi);

    const firstProviderUrl = mockFeedApi.getProviderUrls()[0];
    manager.addProvider(firstProviderUrl, "Mock Provider");
    const response = await manager.listFeeds(firstProviderUrl);
    const feedThatVerifiesCredential = response.feeds[0];

    await manager.subscribe(firstProviderUrl, feedThatVerifiesCredential);

    const collection = new PCDCollection([]);
    const credentialManager = new CredentialManager(identity, collection);

    // This is the equivalent of generating a credential at 15:00, but making
    // a request to a server whose clock is set to 14:59
    await manager.pollSubscriptions(credentialManager);
    // Request should succeed
    expect(manager.getAllErrors().size).to.eq(0);

    // Reset client to original date
    MockDate.set(clientDate);
    // Move the server back one minute, so the client has a timestamp of 15:00
    // and the server has 14:58
    serverDate.setMinutes(58);

    await manager.pollSubscriptions(credentialManager);
    // Request should fail
    expect(manager.getAllErrors().size).to.eq(1);
  });
});

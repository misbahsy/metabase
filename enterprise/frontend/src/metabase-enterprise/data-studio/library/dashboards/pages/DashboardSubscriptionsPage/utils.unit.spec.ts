import type { ChannelSpec, ChannelType } from "metabase-types/api";
import {
  createMockChannel,
  createMockDashboardSubscription,
  createMockParameter,
  createMockUser,
} from "metabase-types/api/mocks";

import {
  filterSubscriptionRows,
  getEditUnavailableReason,
  getSubscriptionRows,
} from "./utils";

const CATEGORY_PARAMETER = createMockParameter({
  id: "1",
  name: "Category",
  slug: "category",
  type: "string/=",
});

const EMAIL_SUBSCRIPTION = createMockDashboardSubscription({
  id: 1,
  creator: createMockUser({ common_name: "Bobby Tables" }),
  channels: [
    createMockChannel({
      schedule_type: "hourly",
      recipients: [createMockUser({ common_name: "Ada Lovelace" })],
    }),
  ],
  parameters: [createMockParameter({ id: "1", value: "Gizmo" })],
});

const SLACK_SUBSCRIPTION = createMockDashboardSubscription({
  id: 2,
  creator: createMockUser({ common_name: "Grace Hopper" }),
  channels: [
    createMockChannel({
      channel_type: "slack",
      schedule_type: "daily",
      schedule_hour: 8,
      details: { channel: "#sales" },
    }),
  ],
});

describe("getSubscriptionRows", () => {
  it("formats a row per subscription", () => {
    expect(
      getSubscriptionRows(
        [EMAIL_SUBSCRIPTION, SLACK_SUBSCRIPTION],
        [CATEGORY_PARAMETER],
      ),
    ).toEqual([
      {
        id: 1,
        channelType: "email",
        schedule: "Hourly",
        recipients: "Ada Lovelace",
        filters: "Category: Gizmo",
        creatorName: "Bobby Tables",
      },
      {
        id: 2,
        channelType: "slack",
        schedule: "Daily at 8:00 AM",
        recipients: "#sales",
        filters: "",
        creatorName: "Grace Hopper",
      },
    ]);
  });

  it("skips a subscription without a channel", () => {
    expect(
      getSubscriptionRows(
        [createMockDashboardSubscription({ channels: [] })],
        [],
      ),
    ).toEqual([]);
  });
});

describe("filterSubscriptionRows", () => {
  const rows = getSubscriptionRows(
    [EMAIL_SUBSCRIPTION, SLACK_SUBSCRIPTION],
    [CATEGORY_PARAMETER],
  );

  it("matches any column case-insensitively", () => {
    expect(filterSubscriptionRows(rows, " HOPPER ")).toEqual([rows[1]]);
    expect(filterSubscriptionRows(rows, "gizmo")).toEqual([rows[0]]);
  });

  it("returns every row for a blank query", () => {
    expect(filterSubscriptionRows(rows, "  ")).toEqual(rows);
  });
});

describe("getEditUnavailableReason", () => {
  function createChannelSpec(
    type: ChannelType,
    configured: boolean,
  ): ChannelSpec {
    return {
      type,
      name: type,
      schedules: ["hourly"],
      schedule_type: "hourly",
      allows_recipients: true,
      configured,
    };
  }

  it("allows editing when the channel is configured", () => {
    expect(
      getEditUnavailableReason(createMockChannel({ channel_type: "email" }), {
        channels: {
          email: {
            ...createChannelSpec("email", true),
            recipients: ["user", "email"],
          },
        },
      }),
    ).toBeUndefined();
  });

  it("names the channel that is not set up", () => {
    expect(
      getEditUnavailableReason(createMockChannel({ channel_type: "slack" }), {
        channels: {
          slack: { ...createChannelSpec("slack", false), fields: [] },
        },
      }),
    ).toBe("Slack isn't set up");
  });

  it("blocks webhook subscriptions even when webhooks are configured", () => {
    expect(
      getEditUnavailableReason(createMockChannel({ channel_type: "http" }), {
        channels: { http: createChannelSpec("http", true) },
      }),
    ).toBe("Webhook subscriptions can't be edited on the dashboard");
  });
});

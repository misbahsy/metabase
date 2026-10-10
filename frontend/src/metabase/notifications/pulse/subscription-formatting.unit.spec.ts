import { createMockUiParameter } from "metabase-lib/v1/parameters/mock";
import type { ParameterValueOrArray } from "metabase-types/api";
import {
  createMockChannel,
  createMockDashboardSubscription,
  createMockParameter,
  createMockUser,
} from "metabase-types/api/mocks";

import {
  buildFilterText,
  buildRecipientText,
  formatFilter,
  formatSubscriptionSchedule,
} from "./subscription-formatting";

jest.mock("metabase/parameters/utils/date-formatting", () => ({
  formatDateValue: jest.fn((_parameter, value) =>
    value === "2024-01-15" ? "January 15, 2024" : null,
  ),
}));

describe("buildFilterText", () => {
  const stateParameter = createMockUiParameter({
    id: "1",
    name: "State",
    slug: "state",
    type: "string/=",
  });

  const buildPulse = (value: ParameterValueOrArray) =>
    createMockDashboardSubscription({
      parameters: [createMockParameter({ id: "1", value })],
    });

  it("returns an empty string when no parameters have values", () => {
    expect(
      buildFilterText(createMockDashboardSubscription(), [stateParameter]),
    ).toBe("");
  });

  it("renders a single value", () => {
    expect(buildFilterText(buildPulse("CA"), [stateParameter])).toBe(
      "State: CA",
    );
  });

  it("renders a single-element array value", () => {
    expect(buildFilterText(buildPulse(["CA"]), [stateParameter])).toBe(
      "State: CA",
    );
  });

  it("renders a numeric value", () => {
    expect(buildFilterText(buildPulse(42), [stateParameter])).toBe("State: 42");
  });

  it("summarizes multi-value selections", () => {
    expect(buildFilterText(buildPulse(["CA", "NY"]), [stateParameter])).toBe(
      "State: 2 selections",
    );
  });

  it("drops nullish array entries instead of rendering them", () => {
    expect(buildFilterText(buildPulse([null]), [stateParameter])).toBe(
      "State: ",
    );
  });

  it("mentions the number of additional filters", () => {
    const cityParameter = createMockUiParameter({
      id: "2",
      name: "City",
      slug: "city",
      type: "string/=",
    });
    const pulse = createMockDashboardSubscription({
      parameters: [
        createMockParameter({ id: "1", value: "CA" }),
        createMockParameter({ id: "2", value: "SF" }),
      ],
    });
    expect(buildFilterText(pulse, [stateParameter, cityParameter])).toBe(
      "State: CA and 1 more filter",
    );
  });

  it("formats date parameter values", () => {
    const dateParameter = createMockUiParameter({
      id: "3",
      name: "Created At",
      slug: "created_at",
      type: "date/single",
    });
    const pulse = createMockDashboardSubscription({
      parameters: [createMockParameter({ id: "3", value: "2024-01-15" })],
    });
    expect(buildFilterText(pulse, [dateParameter])).toBe(
      "Created At: January 15, 2024",
    );
  });
});

describe("formatFilter", () => {
  it("lists every value of a filter", () => {
    expect(
      formatFilter(
        createMockParameter({ name: "State", value: ["CA", "NY", "WA"] }),
      ),
    ).toBe("State: CA, NY, and WA");
  });

  it("formats date values", () => {
    expect(
      formatFilter(
        createMockParameter({
          name: "Created At",
          type: "date/single",
          value: "2024-01-15",
        }),
      ),
    ).toBe("Created At: January 15, 2024");
  });
});

describe("formatSubscriptionSchedule", () => {
  it("formats hourly and daily schedules", () => {
    expect(
      formatSubscriptionSchedule(
        createMockChannel({ schedule_type: "hourly" }),
      ),
    ).toBe("Hourly");
    expect(
      formatSubscriptionSchedule(
        createMockChannel({ schedule_type: "daily", schedule_hour: 8 }),
      ),
    ).toBe("Daily at 8:00 AM");
  });

  it("formats a weekly schedule with the day of the week", () => {
    expect(
      formatSubscriptionSchedule(
        createMockChannel({
          schedule_type: "weekly",
          schedule_day: "mon",
          schedule_hour: 9,
        }),
      ),
    ).toBe("Mondays at 9:00 AM");
  });

  it("formats a monthly schedule with the frame and day", () => {
    expect(
      formatSubscriptionSchedule(
        createMockChannel({
          schedule_type: "monthly",
          schedule_frame: "first",
          schedule_day: "mon",
          schedule_hour: 8,
        }),
      ),
    ).toBe("Monthly on the first Monday at 8:00 AM");
    expect(
      formatSubscriptionSchedule(
        createMockChannel({
          schedule_type: "monthly",
          schedule_frame: "last",
          schedule_hour: 20,
        }),
      ),
    ).toBe("Monthly on the last calendar day at 8:00 PM");
  });
});

describe("buildRecipientText", () => {
  const buildPulse = (recipientNames: string[]) =>
    createMockDashboardSubscription({
      channels: [
        createMockChannel({
          recipients: recipientNames.map((common_name) =>
            createMockUser({ common_name }),
          ),
        }),
      ],
    });

  it("names the first email recipient and counts the others", () => {
    expect(buildRecipientText(buildPulse(["Ada Lovelace"]))).toBe(
      "Ada Lovelace",
    );
    expect(
      buildRecipientText(
        buildPulse(["Ada Lovelace", "Alan Turing", "Grace Hopper"]),
      ),
    ).toBe("Ada Lovelace and 2 others");
  });

  it("returns an empty string for a Slack channel", () => {
    expect(
      buildRecipientText(
        createMockDashboardSubscription({
          channels: [
            createMockChannel({
              channel_type: "slack",
              details: { channel: "#sales" },
            }),
          ],
        }),
      ),
    ).toBe("");
  });
});

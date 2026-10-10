import {
  createMockCard,
  createMockDashboard,
  createMockDashboardCard,
  createMockHeadingDashboardCard,
  createMockParameter,
} from "metabase-types/api/mocks";
import { createMockEntityId } from "metabase-types/api/mocks/entity-id";

import { USAGE_STATS_CARD_ENTITY_IDS } from "./constants";
import { getDashboardIdParameter, getUsageStatsDashcards } from "./utils";

const [VIEWS_ENTITY_ID, PEOPLE_ENTITY_ID, ACTIVITY_ENTITY_ID] =
  USAGE_STATS_CARD_ENTITY_IDS;

function createDashcard(id: number, entityId: string) {
  return createMockDashboardCard({
    id,
    card: createMockCard({ id, entity_id: createMockEntityId(entityId) }),
  });
}

describe("getUsageStatsDashcards", () => {
  it("returns the usage stats dashcards in display order", () => {
    const activity = createDashcard(1, ACTIVITY_ENTITY_ID);
    const views = createDashcard(2, VIEWS_ENTITY_ID);
    const people = createDashcard(3, PEOPLE_ENTITY_ID);
    const other = createDashcard(4, "some-other-entity-id");

    const dashboard = createMockDashboard({
      dashcards: [
        activity,
        createMockHeadingDashboardCard({ id: 5 }),
        other,
        people,
        views,
      ],
    });

    expect(getUsageStatsDashcards(dashboard)).toEqual([
      views,
      people,
      activity,
    ]);
  });

  it("skips cards the audit dashboard does not have", () => {
    const people = createDashcard(1, PEOPLE_ENTITY_ID);

    expect(
      getUsageStatsDashcards(createMockDashboard({ dashcards: [people] })),
    ).toEqual([people]);
  });
});

describe("getDashboardIdParameter", () => {
  it("finds the parameter by its slug", () => {
    const dashboardIdParameter = createMockParameter({
      id: "4b39cd95",
      slug: "dashboard_id",
      type: "id",
    });
    const dashboard = createMockDashboard({
      parameters: [
        createMockParameter({ id: "25f8871e", slug: "date_filter" }),
        dashboardIdParameter,
      ],
    });

    expect(getDashboardIdParameter(dashboard)).toBe(dashboardIdParameter);
  });

  it("returns undefined when the audit dashboard has no such parameter", () => {
    expect(
      getDashboardIdParameter(createMockDashboard({ parameters: [] })),
    ).toBeUndefined();
  });
});

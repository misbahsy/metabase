import userEvent from "@testing-library/user-event";

import {
  setupCollectionByIdEndpoint,
  setupDashboardEndpoints,
} from "__support__/server-mocks";
import {
  setupListSubscriptionsEndpoint,
  setupNotificationChannelsEndpoints,
} from "__support__/server-mocks/pulse";
import { mockSettings } from "__support__/settings";
import {
  mockGetBoundingClientRect,
  renderWithProviders,
  screen,
  within,
} from "__support__/ui";
import { ROOT_COLLECTION } from "metabase/common/collections/constants";
import { Route } from "metabase/router";
import type {
  DashboardSubscription,
  SubscriptionSupportingCard,
  User,
} from "metabase-types/api";
import {
  createMockChannel,
  createMockCollection,
  createMockDashboard,
  createMockDashboardSubscription,
  createMockParameter,
  createMockUser,
} from "metabase-types/api/mocks";

import { DashboardSubscriptionsPage } from "./DashboardSubscriptionsPage";

const CATEGORY_PARAMETER = createMockParameter({
  id: "1",
  name: "Category",
  slug: "category",
  type: "string/=",
});

const DASHBOARD = createMockDashboard({
  id: 10,
  name: "Sales overview",
  parameters: [CATEGORY_PARAMETER],
});

const MANAGE_URL = "/dashboard/10-sales-overview#subscriptions";

const EMAIL_SUBSCRIPTION = createMockDashboardSubscription({
  id: 1,
  dashboard_id: DASHBOARD.id,
  creator: createMockUser({ common_name: "Bobby Tables" }),
  channels: [
    createMockChannel({
      channel_type: "email",
      schedule_type: "daily",
      schedule_hour: 8,
      recipients: [
        createMockUser({
          id: 2,
          common_name: "Ada Lovelace",
          email: "ada@example.com",
        }),
        createMockUser({
          id: 3,
          common_name: "Alan Turing",
          email: "alan@example.com",
        }),
      ],
    }),
  ],
  parameters: [createMockParameter({ id: "1", value: ["Gizmo"] })],
});

const SLACK_SUBSCRIPTION = createMockDashboardSubscription({
  id: 2,
  dashboard_id: DASHBOARD.id,
  creator: createMockUser({ common_name: "Grace Hopper" }),
  channels: [
    createMockChannel({
      channel_type: "slack",
      schedule_type: "weekly",
      schedule_day: "mon",
      schedule_hour: 9,
      details: { channel: "#sales" },
    }),
  ],
});

const SUBSCRIPTIONS_URL = `/data-studio/dashboards/${DASHBOARD.id}/subscriptions`;

// The API returns an address outside Metabase as `{ email }`, with none of the user fields
const EXTERNAL_RECIPIENT = { email: "ext@partner.com" } as User;

function createMockCardAttachment(
  opts: Partial<SubscriptionSupportingCard>,
): SubscriptionSupportingCard {
  return {
    id: 1,
    collection_id: null,
    description: null,
    display: "table",
    name: "Orders",
    include_csv: false,
    include_xls: false,
    dashboard_card_id: 1,
    dashboard_id: DASHBOARD.id,
    parameter_mappings: [],
    ...opts,
  };
}

const DETAILED_EMAIL_SUBSCRIPTION = createMockDashboardSubscription({
  ...EMAIL_SUBSCRIPTION,
  skip_if_empty: true,
  channels: [
    createMockChannel({
      channel_type: "email",
      schedule_type: "daily",
      schedule_hour: 8,
      recipients: [
        createMockUser({
          id: 2,
          common_name: "Ada Lovelace",
          email: "ada@example.com",
        }),
        EXTERNAL_RECIPIENT,
      ],
      details: {
        subject: "Weekly sales",
        include_pdf: true,
        attachment_only: true,
      },
    }),
  ],
  cards: [
    createMockCardAttachment({
      id: 1,
      dashboard_card_id: 11,
      name: "Orders by month",
      include_csv: true,
    }),
    createMockCardAttachment({
      id: 2,
      dashboard_card_id: 12,
      name: "Revenue",
      include_xls: true,
    }),
    createMockCardAttachment({ id: 3, dashboard_card_id: 13, name: "Users" }),
  ],
});

type SetupOpts = {
  subscriptions?: DashboardSubscription[];
  selectedSubscriptionId?: DashboardSubscription["id"];
  isEmailConfigured?: boolean;
  isAdmin?: boolean;
};

function setup({
  subscriptions = [EMAIL_SUBSCRIPTION, SLACK_SUBSCRIPTION],
  selectedSubscriptionId,
  isEmailConfigured = true,
  isAdmin = true,
}: SetupOpts = {}) {
  mockGetBoundingClientRect({ width: 1000, height: 800 });
  setupDashboardEndpoints(DASHBOARD);
  setupCollectionByIdEndpoint({
    collections: [createMockCollection(ROOT_COLLECTION)],
  });
  setupListSubscriptionsEndpoint(subscriptions);
  setupNotificationChannelsEndpoints({
    email: { type: "email", configured: isEmailConfigured },
    slack: { type: "slack", configured: true },
  });

  renderWithProviders(
    <>
      <Route
        path="/data-studio/dashboards/:dashboardId/subscriptions"
        element={<DashboardSubscriptionsPage />}
      />
      <Route
        path="/data-studio/dashboards/:dashboardId/subscriptions/:subscriptionId"
        element={<DashboardSubscriptionsPage />}
      />
    </>,
    {
      withRouter: true,
      storeInitialState: {
        currentUser: createMockUser({ is_superuser: isAdmin }),
        settings: mockSettings({ "report-timezone-short": "EST" }),
      },
      initialRoute:
        selectedSubscriptionId != null
          ? `${SUBSCRIPTIONS_URL}/${selectedSubscriptionId}`
          : SUBSCRIPTIONS_URL,
    },
  );
}

describe("DashboardSubscriptionsPage", () => {
  it("lists each subscription's schedule, recipients, filters, and creator", async () => {
    setup();

    const emailRow = await screen.findByRole("row", {
      name: /Daily at 8:00 AM/,
    });
    expect(within(emailRow).getByText("Daily at 8:00 AM")).toBeInTheDocument();
    expect(
      within(emailRow).getByText("Ada Lovelace and 1 other"),
    ).toBeInTheDocument();
    expect(within(emailRow).getByText("Category: Gizmo")).toBeInTheDocument();
    expect(within(emailRow).getByText("Bobby Tables")).toBeInTheDocument();

    const slackRow = screen.getByRole("row", { name: /Mondays at 9:00 AM/ });
    expect(within(slackRow).getByText("#sales")).toBeInTheDocument();
    expect(within(slackRow).getByText("None")).toBeInTheDocument();
    expect(within(slackRow).getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("filters the subscriptions by any column and reports when nothing matches", async () => {
    setup();
    const searchInput = await screen.findByPlaceholderText("Search...");

    await userEvent.type(searchInput, "#sal");
    expect(screen.getByText("Mondays at 9:00 AM")).toBeInTheDocument();
    expect(screen.queryByText("Daily at 8:00 AM")).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "gizmo");
    expect(screen.getByText("Daily at 8:00 AM")).toBeInTheDocument();
    expect(screen.queryByText("Mondays at 9:00 AM")).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "churn");
    expect(screen.getByText('No results for "churn"')).toBeInTheDocument();
  });

  it("keeps the sidebar open when the search hides its row", async () => {
    setup({ selectedSubscriptionId: EMAIL_SUBSCRIPTION.id });
    const details = await screen.findByTestId("subscription-details");

    await userEvent.type(screen.getByPlaceholderText("Search..."), "#sal");

    expect(
      screen.queryByRole("row", { name: /Daily at 8:00 AM/ }),
    ).not.toBeInTheDocument();
    expect(details).toBeInTheDocument();
    expect(
      within(details).getByRole("group", { name: "Sends" }),
    ).toHaveTextContent("Email with the default subject");
  });

  it("links each row to its subscription", async () => {
    setup();

    expect(
      await screen.findByRole("link", { name: /Daily at 8:00 AM/ }),
    ).toHaveAttribute("href", `${SUBSCRIPTIONS_URL}/1`);
    expect(
      screen.getByRole("link", { name: /Mondays at 9:00 AM/ }),
    ).toHaveAttribute("href", `${SUBSCRIPTIONS_URL}/2`);
    expect(
      screen.getByRole("row", { name: /Daily at 8:00 AM/ }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("selects the subscription in the URL and links its row back to the list", async () => {
    setup({ selectedSubscriptionId: 1 });

    expect(
      await screen.findByRole("row", { name: /Daily at 8:00 AM/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("row", { name: /Mondays at 9:00 AM/ }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      screen.getByRole("link", { name: /Daily at 8:00 AM/ }),
    ).toHaveAttribute("href", SUBSCRIPTIONS_URL);
    expect(
      screen.getByRole("link", { name: /Mondays at 9:00 AM/ }),
    ).toHaveAttribute("href", `${SUBSCRIPTIONS_URL}/2`);
  });

  it("drops the columns the sidebar repeats while it is open", async () => {
    setup({ selectedSubscriptionId: 1 });

    expect(
      await screen.findByRole("columnheader", { name: /Schedule/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Filters/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Created by/ }),
    ).not.toBeInTheDocument();
  });

  it("links to the dashboard's subscriptions sidebar", async () => {
    setup();

    expect(
      await screen.findByRole("link", { name: "Manage subscriptions" }),
    ).toHaveAttribute("href", MANAGE_URL);
  });

  it("offers to set up a subscription when there is none", async () => {
    setup({ subscriptions: [] });

    expect(await screen.findByText("No subscriptions yet")).toBeInTheDocument();
    expect(
      screen.getByText("Subscriptions are set up from the dashboard."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Set up a subscription" }),
    ).toHaveAttribute("href", MANAGE_URL);
    expect(
      screen.queryByRole("link", { name: "Manage subscriptions" }),
    ).not.toBeInTheDocument();
  });

  it("tells a non-admin that only their own subscriptions are listed", async () => {
    setup({ isAdmin: false });

    expect(
      await screen.findByText("Only the subscriptions you created are listed."),
    ).toBeInTheDocument();
  });

  it("does not limit the list for an admin", async () => {
    setup();

    expect(await screen.findByText("Bobby Tables")).toBeInTheDocument();
    expect(
      screen.queryByText("Only the subscriptions you created are listed."),
    ).not.toBeInTheDocument();
  });

  it("tells a non-admin they have not created a subscription", async () => {
    setup({ subscriptions: [], isAdmin: false });

    expect(
      await screen.findByText("You haven't created any subscriptions yet"),
    ).toBeInTheDocument();
    expect(screen.queryByText("No subscriptions yet")).not.toBeInTheDocument();
  });

  it("shows the number of subscriptions on the Subscriptions tab", async () => {
    setup();

    const header = await screen.findByTestId("dashboard-pane-header");
    const tab = within(header).getByRole("link", { name: "Subscriptions" });
    expect(tab).toHaveAttribute("aria-current", "page");
    expect(await within(tab).findByTestId("pill-tab-count")).toHaveTextContent(
      "2",
    );
  });

  describe("subscription details", () => {
    it("shows everything an email subscription sends and to whom", async () => {
      setup({
        subscriptions: [DETAILED_EMAIL_SUBSCRIPTION],
        selectedSubscriptionId: DETAILED_EMAIL_SUBSCRIPTION.id,
      });
      const details = await screen.findByTestId("subscription-details");

      expect(within(details).getByText("Daily at 8:00 AM EST")).toBeVisible();
      expect(
        within(details).getByText('Email with the subject "Weekly sales"'),
      ).toBeVisible();

      const recipients = within(
        within(details).getByRole("group", { name: "Recipients" }),
      ).getAllByTestId("subscription-recipient");
      expect(recipients[0]).toHaveTextContent("Ada Lovelace");
      expect(recipients[0]).toHaveTextContent("ada@example.com");
      expect(recipients[1]).toHaveTextContent("ext@partner.com");
      expect(recipients[1]).toHaveTextContent("Not a Metabase user");

      expect(within(details).getByText("Category: Gizmo")).toBeVisible();

      expect(within(details).getByText("PDF of the dashboard")).toBeVisible();
      const attachments = within(details).getAllByTestId(
        "subscription-card-attachment",
      );
      expect(attachments).toHaveLength(2);
      expect(attachments[0]).toHaveTextContent("Orders by month");
      expect(attachments[0]).toHaveTextContent("CSV");
      expect(attachments[1]).toHaveTextContent("Revenue");
      expect(attachments[1]).toHaveTextContent("XLSX");
      expect(
        within(details).getByText("Send only attachments (no charts)"),
      ).toBeVisible();

      expect(
        within(details).getByRole("group", {
          name: "When there are no results",
        }),
      ).toHaveTextContent("Don't send");
      expect(
        within(details).getByRole("group", { name: "Created by" }),
      ).toHaveTextContent("Bobby Tables");
    });

    it("shows a Slack subscription's channel and no recipients", async () => {
      setup({ selectedSubscriptionId: SLACK_SUBSCRIPTION.id });
      const details = await screen.findByTestId("subscription-details");

      expect(within(details).getByText("Mondays at 9:00 AM EST")).toBeVisible();
      expect(
        within(details).getByText("Slack message to #sales"),
      ).toBeVisible();
      expect(
        within(details).queryByRole("group", { name: "Recipients" }),
      ).not.toBeInTheDocument();
      expect(within(details).getByText("No filters")).toBeVisible();
      expect(within(details).getByText("No attachments")).toBeVisible();
      expect(
        within(details).getByRole("group", {
          name: "When there are no results",
        }),
      ).toHaveTextContent("Send anyway");
    });

    it("links to the subscription's edit form on the dashboard", async () => {
      setup({ selectedSubscriptionId: EMAIL_SUBSCRIPTION.id });
      const details = await screen.findByTestId("subscription-details");

      expect(
        await within(details).findByRole("link", { name: "Edit on dashboard" }),
      ).toHaveAttribute("href", "/dashboard/10-sales-overview#subscriptions=1");
    });

    it("disables editing when the subscription's channel is not set up", async () => {
      setup({
        selectedSubscriptionId: EMAIL_SUBSCRIPTION.id,
        isEmailConfigured: false,
      });
      const details = await screen.findByTestId("subscription-details");

      const button = await within(details).findByRole("button", {
        name: "Edit on dashboard",
      });
      expect(button).toBeDisabled();
      expect(
        within(details).queryByRole("link", { name: "Edit on dashboard" }),
      ).not.toBeInTheDocument();
      await userEvent.hover(button);
      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "Email isn't set up",
      );
    });

    it("closes back to the list", async () => {
      setup({ selectedSubscriptionId: EMAIL_SUBSCRIPTION.id });
      const details = await screen.findByTestId("subscription-details");

      expect(
        within(details).getByRole("link", { name: "Close" }),
      ).toHaveAttribute("href", SUBSCRIPTIONS_URL);
    });

    it("shows no details without a selection or for an unknown subscription", async () => {
      setup({ selectedSubscriptionId: 99 });

      const emailRow = await screen.findByRole("row", {
        name: /Daily at 8:00 AM/,
      });
      expect(emailRow).toHaveAttribute("aria-selected", "false");
      expect(
        screen.queryByTestId("subscription-details"),
      ).not.toBeInTheDocument();
    });
  });
});

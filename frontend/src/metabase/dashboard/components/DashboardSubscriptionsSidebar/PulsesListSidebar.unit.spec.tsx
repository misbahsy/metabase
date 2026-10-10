import { renderWithProviders, screen } from "__support__/ui";
import type { Channel } from "metabase-types/api";
import {
  createMockChannel,
  createMockDashboardSubscription,
  createMockUser,
} from "metabase-types/api/mocks";

import { PulsesListSidebar } from "./PulsesListSidebar";

describe("PulsesListSidebar", () => {
  const setup = (channel: Channel) => {
    renderWithProviders(
      <PulsesListSidebar
        pulses={[
          createMockDashboardSubscription({ id: 1, channels: [channel] }),
        ]}
        formInput={{ channels: {} }}
        createSubscription={jest.fn()}
        onCancel={jest.fn()}
        editPulse={jest.fn()}
      />,
    );
  };

  const recipient = createMockUser({ common_name: "Ada Lovelace" });

  it("shows the custom subject of an email subscription", () => {
    setup(
      createMockChannel({
        recipients: [recipient],
        details: { subject: "Weekly revenue" },
      }),
    );

    expect(screen.getByText("Weekly revenue")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows only the recipients when no subject is set", () => {
    setup(createMockChannel({ recipients: [recipient] }));

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("listitem")).toHaveTextContent("Ada Lovelace");
  });
});

import { match } from "ts-pattern";
import { c, t } from "ttag";
import _ from "underscore";

import {
  buildFilterText,
  buildRecipientText,
  formatFilter,
  formatSubscriptionSchedule,
} from "metabase/notifications/pulse/subscription-formatting";
import { getActivePulseParameters } from "metabase/pulse";
import type {
  Channel,
  ChannelApiResponse,
  ChannelType,
  DashCardId,
  DashboardSubscription,
  Parameter,
  SubscriptionSupportingCard,
  User,
} from "metabase-types/api";

import { CARD_ATTACHMENT_FORMATS } from "./constants";

export type SubscriptionRow = {
  id: DashboardSubscription["id"];
  channelType: ChannelType;
  schedule: string;
  recipients: string;
  filters: string;
  creatorName: string;
};

/**
 * One row per subscription that has a channel, with every column already
 * formatted. `filters` is empty when the subscription sets no filter.
 */
export function getSubscriptionRows(
  subscriptions: readonly DashboardSubscription[],
  parameters: Parameter[],
): SubscriptionRow[] {
  return subscriptions.flatMap((subscription) => {
    const [channel] = subscription.channels;
    if (channel == null) {
      return [];
    }
    return [
      {
        id: subscription.id,
        channelType: channel.channel_type,
        schedule: formatSubscriptionSchedule(channel),
        recipients: getRecipientsText(subscription, channel),
        filters: buildFilterText(subscription, parameters),
        creatorName: subscription.creator.common_name,
      },
    ];
  });
}

function getRecipientsText(
  subscription: DashboardSubscription,
  channel: Channel,
): string {
  return channel.channel_type === "slack"
    ? (channel.details?.channel ?? "")
    : buildRecipientText(subscription);
}

export type SubscriptionSelection = {
  subscription: DashboardSubscription;
  channel: Channel;
};

/**
 * The subscription with this id and the channel its row shows, or `undefined`
 * when no listed subscription with a channel has it.
 */
export function getSubscriptionSelection(
  subscriptions: readonly DashboardSubscription[],
  subscriptionId: DashboardSubscription["id"] | undefined,
): SubscriptionSelection | undefined {
  const subscription = subscriptions.find(({ id }) => id === subscriptionId);
  const [channel] = subscription?.channels ?? [];
  return subscription != null && channel != null
    ? { subscription, channel }
    : undefined;
}

export function filterSubscriptionRows(
  rows: SubscriptionRow[],
  searchQuery: string,
): SubscriptionRow[] {
  const query = searchQuery.trim().toLowerCase();
  if (query.length === 0) {
    return rows;
  }
  return rows.filter((row) =>
    [row.schedule, row.recipients, row.filters, row.creatorName].some((text) =>
      text.toLowerCase().includes(query),
    ),
  );
}

/**
 * When a channel sends, in the report timezone ("Daily at 8:00 AM EST").
 * An hourly schedule has no time of day, so it carries no timezone.
 */
export function formatChannelSchedule(
  channel: Channel,
  timezone: string | null,
): string {
  const schedule = formatSubscriptionSchedule(channel);
  if (channel.schedule_type === "hourly" || !timezone) {
    return schedule;
  }
  return c(
    "{0} is when a subscription sends, like 'Daily at 8:00 AM', and {1} is a timezone abbreviation",
  ).t`${schedule} ${timezone}`;
}

/** What a channel sends: the email subject or the Slack channel. */
export function getChannelDescription({
  channel_type,
  details,
}: Channel): string {
  return match(channel_type)
    .with("email", () =>
      details?.subject
        ? t`Email with the subject "${details.subject}"`
        : t`Email with the default subject`,
    )
    .with("slack", () =>
      details?.channel
        ? t`Slack message to ${details.channel}`
        : t`Slack message`,
    )
    .with("http", () => t`Webhook`)
    .exhaustive();
}

/**
 * Why the dashboard cannot open the subscription's edit form, or `undefined`
 * when it can. The dashboard has no edit form for webhook subscriptions.
 */
export function getEditUnavailableReason(
  { channel_type }: Channel,
  channelInfo: ChannelApiResponse,
): string | undefined {
  const isConfigured = channelInfo.channels[channel_type]?.configured === true;
  return match(channel_type)
    .with("email", () => (isConfigured ? undefined : t`Email isn't set up`))
    .with("slack", () => (isConfigured ? undefined : t`Slack isn't set up`))
    .with(
      "http",
      () => t`Webhook subscriptions can't be edited on the dashboard`,
    )
    .exhaustive();
}

export type SubscriptionRecipient =
  | { type: "user"; name: string; email: string }
  | { type: "external"; email: string };

/**
 * Everyone the channel emails, once per address, Metabase users and other
 * addresses alike.
 */
export function getChannelRecipients(
  channel: Channel,
): SubscriptionRecipient[] {
  const recipients = (channel.recipients ?? []).map(getRecipient);
  return _.uniq(recipients, false, (recipient) => recipient.email);
}

// The API returns an address that is not a Metabase user as `{ email }`, without the id the User type promises
function getRecipient(recipient: User): SubscriptionRecipient {
  return "id" in recipient && recipient.id != null
    ? {
        type: "user",
        name: recipient.common_name || recipient.email,
        email: recipient.email,
      }
    : { type: "external", email: recipient.email };
}

/** Each filter value the subscription sets, one filter per entry. */
export function getSubscriptionFilters(
  subscription: DashboardSubscription,
  parameters: Parameter[],
): string[] {
  return getActivePulseParameters(subscription, parameters).map(formatFilter);
}

export type CardAttachment = {
  dashcardId: DashCardId;
  name: SubscriptionSupportingCard["name"];
  formats: string[];
};

/** The cards whose results the subscription attaches, with their file formats. */
export function getCardAttachments(
  subscription: DashboardSubscription,
): CardAttachment[] {
  return subscription.cards.flatMap((card) => {
    const formats = CARD_ATTACHMENT_FORMATS.filter(({ key }) => card[key]).map(
      ({ label }) => label,
    );
    return formats.length > 0
      ? [{ dashcardId: card.dashboard_card_id, name: card.name, formats }]
      : [];
  });
}

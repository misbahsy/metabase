import { t } from "ttag";

import { useGetChannelInfoQuery } from "metabase/api";
import { ForwardRefLink } from "metabase/common/components/Link";
import CS from "metabase/css/core/index.css";
import { SidebarResizableBox } from "metabase/monitor/components/MonitorLayout/SidebarResizableBox";
import { useSetting } from "metabase/settings";
import {
  ActionIcon,
  Box,
  FixedSizeIcon,
  Group,
  Stack,
  Text,
  Tooltip,
} from "metabase/ui";
import * as Urls from "metabase/urls";
import type {
  Channel,
  Dashboard,
  DashboardSubscription,
} from "metabase-types/api";

import {
  CHANNEL_ICONS,
  SIDEBAR_WIDTH,
  TOOLTIP_OPEN_DELAY_MS,
} from "../constants";
import { formatChannelSchedule, getEditUnavailableReason } from "../utils";

import { InfoSection } from "./InfoSection";
import S from "./SubscriptionSidebar.module.css";

type SubscriptionSidebarProps = {
  dashboard: Dashboard;
  subscription: DashboardSubscription;
  channel: Channel;
  closeUrl: string;
  containerWidth: number;
};

/**
 * Everything one subscription sends through its channel and to whom, in a
 * resizable sidebar with a link to edit it on the dashboard.
 */
export function SubscriptionSidebar({
  dashboard,
  subscription,
  channel,
  closeUrl,
  containerWidth,
}: SubscriptionSidebarProps) {
  return (
    <SidebarResizableBox
      containerWidth={containerWidth}
      defaultWidth={SIDEBAR_WIDTH}
    >
      <Stack
        className={S.sidebar}
        p="lg"
        gap="lg"
        bg="background_page-primary"
        role="region"
        aria-label={t`Subscription details`}
        data-testid="subscription-details"
      >
        <SidebarHeader
          dashboard={dashboard}
          subscription={subscription}
          channel={channel}
          closeUrl={closeUrl}
        />
        <InfoSection
          subscription={subscription}
          channel={channel}
          parameters={dashboard.parameters ?? []}
        />
      </Stack>
    </SidebarResizableBox>
  );
}

type SidebarHeaderProps = {
  dashboard: Dashboard;
  subscription: DashboardSubscription;
  channel: Channel;
  closeUrl: string;
};

function SidebarHeader({
  dashboard,
  subscription,
  channel,
  closeUrl,
}: SidebarHeaderProps) {
  const timezone = useSetting("report-timezone-short");

  return (
    <Group gap="0.75rem" wrap="nowrap" align="start" justify="space-between">
      <Group gap="sm" wrap="nowrap" align="center" miw={0}>
        <FixedSizeIcon name={CHANNEL_ICONS[channel.channel_type]} aria-hidden />
        <Text className={CS.textWrap} fz="h3" fw="bold" lh="h3">
          {formatChannelSchedule(channel, timezone)}
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap">
        <EditOnDashboardAction
          dashboard={dashboard}
          subscription={subscription}
          channel={channel}
        />
        <ActionIcon
          component={ForwardRefLink}
          to={closeUrl}
          aria-label={t`Close`}
        >
          <FixedSizeIcon name="close" />
        </ActionIcon>
      </Group>
    </Group>
  );
}

type EditOnDashboardActionProps = {
  dashboard: Dashboard;
  subscription: DashboardSubscription;
  channel: Channel;
};

function EditOnDashboardAction({
  dashboard,
  subscription,
  channel,
}: EditOnDashboardActionProps) {
  const { data: channelInfo, isLoading } = useGetChannelInfoQuery();
  const unavailableReason =
    channelInfo != null
      ? getEditUnavailableReason(channel, channelInfo)
      : undefined;
  const label = t`Edit on dashboard`;

  if (isLoading) {
    return (
      <ActionIcon aria-label={label} disabled>
        <FixedSizeIcon name="pencil" />
      </ActionIcon>
    );
  }

  if (unavailableReason != null) {
    return (
      <Tooltip label={unavailableReason}>
        {/* a disabled button fires no pointer events, so the tooltip listens on a wrapper */}
        <Box>
          <ActionIcon aria-label={label} disabled>
            <FixedSizeIcon name="pencil" />
          </ActionIcon>
        </Box>
      </Tooltip>
    );
  }

  return (
    <Tooltip label={label} openDelay={TOOLTIP_OPEN_DELAY_MS}>
      <ActionIcon
        component={ForwardRefLink}
        to={Urls.dashboard(dashboard, { openSubscriptions: subscription.id })}
        aria-label={label}
      >
        <FixedSizeIcon name="pencil" />
      </ActionIcon>
    </Tooltip>
  );
}

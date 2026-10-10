import { useElementSize } from "@mantine/hooks";
import { useMemo, useState } from "react";
import { t } from "ttag";

import { useListSubscriptionsQuery } from "metabase/api";
import { ForwardRefLink, Link } from "metabase/common/components/Link";
import { ListEmptyState } from "metabase/common/components/ListEmptyState";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { PageContainer } from "metabase/common/data-studio/components/PageContainer";
import { getUserIsAdmin } from "metabase/current-user";
import { useSelector } from "metabase/redux";
import { useParams } from "metabase/router";
import {
  Button,
  Card,
  Center,
  Flex,
  Group,
  Icon,
  Stack,
  Text,
  TextInput,
  TreeTable,
  useTreeTableInstance,
} from "metabase/ui";
import * as Urls from "metabase/urls";
import type { Dashboard, DashboardSubscription } from "metabase-types/api";

import { DashboardHeader } from "../../components/DashboardHeader";
import { useRouteDashboard } from "../../hooks/use-route-dashboard";

import { SubscriptionSidebar } from "./SubscriptionSidebar";
import { useSubscriptionColumns } from "./use-subscription-columns";
import {
  filterSubscriptionRows,
  getSubscriptionRows,
  getSubscriptionSelection,
} from "./utils";

export function DashboardSubscriptionsPage() {
  const { dashboard, isLoading, error } = useRouteDashboard();
  const params = useParams<{ subscriptionId?: string }>();
  const selectedSubscriptionId = Urls.extractEntityId(params.subscriptionId);

  if (isLoading || error != null || dashboard == null) {
    return (
      <Center h="100%">
        <LoadingAndErrorWrapper loading={isLoading} error={error} />
      </Center>
    );
  }

  return (
    <DashboardSubscriptions
      dashboard={dashboard}
      selectedSubscriptionId={selectedSubscriptionId}
    />
  );
}

type DashboardSubscriptionsProps = {
  dashboard: Dashboard;
  selectedSubscriptionId: DashboardSubscription["id"] | undefined;
};

function DashboardSubscriptions({
  dashboard,
  selectedSubscriptionId,
}: DashboardSubscriptionsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const isAdmin = useSelector(getUserIsAdmin);
  const { ref: containerRef, width: containerWidth } = useElementSize();
  const {
    data: subscriptions,
    isLoading,
    error,
  } = useListSubscriptionsQuery({ dashboard_id: dashboard.id });
  const rows = useMemo(
    () => getSubscriptionRows(subscriptions ?? [], dashboard.parameters ?? []),
    [subscriptions, dashboard.parameters],
  );
  const filteredRows = useMemo(
    () => filterSubscriptionRows(rows, searchQuery),
    [rows, searchQuery],
  );
  const selection = getSubscriptionSelection(
    subscriptions ?? [],
    selectedSubscriptionId,
  );
  const columns = useSubscriptionColumns({ isSidebarOpen: selection != null });
  const treeTableInstance = useTreeTableInstance({
    data: filteredRows,
    columns,
    getNodeId: (row) => String(row.id),
    selectedRowId: selection != null ? String(selection.subscription.id) : null,
  });
  const manageUrl = Urls.dashboard(dashboard, { openSubscriptions: true });
  const listUrl = Urls.dataStudioDashboardSubscriptions(dashboard.id);
  const getRowUrl = (subscriptionId: DashboardSubscription["id"]) =>
    subscriptionId === selection?.subscription.id
      ? listUrl
      : Urls.dataStudioDashboardSubscriptions(dashboard.id, subscriptionId);

  return (
    <Flex h="100%" wrap="nowrap">
      <PageContainer
        ref={containerRef}
        flex={1}
        miw={0}
        data-testid="dashboard-subscriptions-page"
      >
        <DashboardHeader dashboard={dashboard} />
        {isLoading || error != null ? (
          <LoadingAndErrorWrapper loading={isLoading} error={error} />
        ) : (
          <Stack gap="lg">
            <Group gap="md" wrap="nowrap">
              <TextInput
                flex={1}
                placeholder={t`Search...`}
                leftSection={<Icon name="search" />}
                bdrs="sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {rows.length > 0 && (
                <Button component={ForwardRefLink} to={manageUrl}>
                  {t`Manage subscriptions`}
                </Button>
              )}
            </Group>
            {!isAdmin && (
              <Text c="text-secondary">
                {t`Only the subscriptions you created are listed.`}
              </Text>
            )}
            <Card withBorder p={0}>
              <TreeTable
                instance={treeTableInstance}
                hierarchical={false}
                emptyState={
                  <SubscriptionsEmptyState
                    searchQuery={searchQuery}
                    manageUrl={manageUrl}
                    isAdmin={isAdmin}
                  />
                }
                renderRowLink={(row, props) => (
                  <Link to={getRowUrl(row.original.id)} {...props} />
                )}
              />
            </Card>
          </Stack>
        )}
      </PageContainer>
      {selection != null && (
        <SubscriptionSidebar
          dashboard={dashboard}
          subscription={selection.subscription}
          channel={selection.channel}
          closeUrl={listUrl}
          containerWidth={containerWidth}
        />
      )}
    </Flex>
  );
}

type SubscriptionsEmptyStateProps = {
  searchQuery: string;
  manageUrl: string;
  isAdmin: boolean;
};

function SubscriptionsEmptyState({
  searchQuery,
  manageUrl,
  isAdmin,
}: SubscriptionsEmptyStateProps) {
  if (searchQuery) {
    return <ListEmptyState label={t`No results for "${searchQuery}"`} />;
  }

  return (
    <ListEmptyState
      label={
        isAdmin
          ? t`No subscriptions yet`
          : t`You haven't created any subscriptions yet`
      }
      description={t`Subscriptions are set up from the dashboard.`}
      action={
        <Button component={ForwardRefLink} to={manageUrl} variant="filled">
          {t`Set up a subscription`}
        </Button>
      }
    />
  );
}

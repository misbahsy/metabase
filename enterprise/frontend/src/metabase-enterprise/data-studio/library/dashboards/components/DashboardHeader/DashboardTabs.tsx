import { t } from "ttag";

import { skipToken } from "metabase/api";
import {
  type PillTab,
  PillTabNavigation,
} from "metabase/common/components/PillTabNavigation";
import { PLUGIN_AUDIT, PLUGIN_DEPENDENCIES } from "metabase/plugins";
import * as Urls from "metabase/urls";
import { useGetAuditInfoQuery } from "metabase-enterprise/api";
import type { DashboardId } from "metabase-types/api";

type DashboardTabsProps = {
  dashboardId: DashboardId;
};

export function DashboardTabs({ dashboardId }: DashboardTabsProps) {
  const { data: auditInfo } = useGetAuditInfoQuery(
    PLUGIN_AUDIT.isEnabled ? undefined : skipToken,
  );
  const contentsUrl = Urls.dataStudioDashboardContents(dashboardId);
  const tabs: PillTab[] = [
    { label: t`Overview`, to: Urls.dataStudioDashboard(dashboardId) },
    {
      label: t`Contents`,
      to: contentsUrl,
      isSelected: (pathname) => pathname.startsWith(contentsUrl),
    },
  ];

  if (PLUGIN_DEPENDENCIES.isEnabled) {
    tabs.push({
      label: t`Dependencies`,
      to: Urls.dataStudioDashboardDependencies(dashboardId),
    });
  }

  if (PLUGIN_AUDIT.isEnabled && auditInfo?.dashboard_overview != null) {
    tabs.push({
      label: t`Usage stats`,
      to: Urls.dataStudioDashboardUsage(dashboardId),
    });
  }

  return <PillTabNavigation tabs={tabs} />;
}

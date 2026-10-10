import { useMemo } from "react";
import { t } from "ttag";

import {
  Ellipsified,
  EntityNameCell,
  Text,
  type TreeTableColumnDef,
} from "metabase/ui";

import { CHANNEL_ICONS, SIDEBAR_HIDDEN_COLUMN_IDS } from "./constants";
import type { SubscriptionRow } from "./utils";

type UseSubscriptionColumnsOptions = {
  isSidebarOpen: boolean;
};

export function useSubscriptionColumns({
  isSidebarOpen,
}: UseSubscriptionColumnsOptions): TreeTableColumnDef<SubscriptionRow>[] {
  return useMemo(() => {
    const columns: TreeTableColumnDef<SubscriptionRow>[] = [
      {
        id: "schedule",
        header: t`Schedule`,
        accessorKey: "schedule",
        enableSorting: true,
        minWidth: 200,
        cell: ({ row }) => (
          <EntityNameCell
            icon={CHANNEL_ICONS[row.original.channelType]}
            name={row.original.schedule}
          />
        ),
      },
      {
        id: "recipients",
        header: t`Recipients`,
        accessorKey: "recipients",
        enableSorting: true,
        minWidth: 160,
        cell: ({ row }) => <Ellipsified>{row.original.recipients}</Ellipsified>,
      },
      {
        id: "filters",
        header: t`Filters`,
        accessorKey: "filters",
        minWidth: 160,
        cell: ({ row }) =>
          row.original.filters ? (
            <Ellipsified>{row.original.filters}</Ellipsified>
          ) : (
            <Text c="text-tertiary">{t`None`}</Text>
          ),
      },
      {
        id: "creator",
        header: t`Created by`,
        accessorKey: "creatorName",
        enableSorting: true,
        width: "auto",
        widthPadding: 20,
        cell: ({ row }) => row.original.creatorName,
      },
    ];

    return isSidebarOpen
      ? columns.filter(
          (column) =>
            column.id == null || !SIDEBAR_HIDDEN_COLUMN_IDS.includes(column.id),
        )
      : columns;
  }, [isSidebarOpen]);
}

import { isQuestionDashCard } from "metabase/utils/dashboard";
import type {
  Dashboard,
  Parameter,
  QuestionDashboardCard,
} from "metabase-types/api";

import {
  DASHBOARD_ID_PARAMETER_SLUG,
  USAGE_STATS_CARD_ENTITY_IDS,
} from "./constants";

/**
 * The audit dashboard's Usage stats dashcards, in the tab's display order.
 * A card missing from the audit dashboard is skipped.
 */
export function getUsageStatsDashcards(
  auditDashboard: Pick<Dashboard, "dashcards">,
): QuestionDashboardCard[] {
  const questionDashcards = auditDashboard.dashcards.filter(isQuestionDashCard);

  return USAGE_STATS_CARD_ENTITY_IDS.flatMap((entityId) => {
    const dashcard = questionDashcards.find(
      ({ card }) => card.entity_id === entityId,
    );
    return dashcard ? [dashcard] : [];
  });
}

/**
 * The audit dashboard's filter that narrows its cards to one dashboard.
 */
export function getDashboardIdParameter(
  auditDashboard: Pick<Dashboard, "parameters">,
): Parameter | undefined {
  return auditDashboard.parameters?.find(
    (parameter) => parameter.slug === DASHBOARD_ID_PARAMETER_SLUG,
  );
}

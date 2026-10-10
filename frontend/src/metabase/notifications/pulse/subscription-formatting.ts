import { match } from "ts-pattern";
import { msgid, ngettext, t } from "ttag";
import _ from "underscore";

import { formatDateValue } from "metabase/parameters/utils/date-formatting";
import { getActivePulseParameters } from "metabase/pulse";
import { conjunct } from "metabase/utils/formatting";
import { formatFrame } from "metabase/utils/time-dayjs";
import { isNotNull } from "metabase/utils/types";
import {
  formatDateTimeWithUnit,
  formatTimeWithUnit,
} from "metabase/value-formatting";
import type {
  Channel,
  DashboardSubscription,
  Parameter,
  ScheduleDayType,
} from "metabase-types/api";

const WEEKLY_SCHEDULES: Record<ScheduleDayType, (hour: string) => string> = {
  sun: (hour) => t`Sundays at ${hour}`,
  mon: (hour) => t`Mondays at ${hour}`,
  tue: (hour) => t`Tuesdays at ${hour}`,
  wed: (hour) => t`Wednesdays at ${hour}`,
  thu: (hour) => t`Thursdays at ${hour}`,
  fri: (hour) => t`Fridays at ${hour}`,
  sat: (hour) => t`Saturdays at ${hour}`,
};

/**
 * When a subscription channel sends, as a standalone phrase ("Hourly",
 * "Daily at 8:00 AM", "Mondays at 9:00 AM",
 * "Monthly on the first Monday at 8:00 AM").
 */
export function formatSubscriptionSchedule({
  schedule_type,
  schedule_day,
  schedule_frame,
  schedule_hour,
}: Pick<
  Channel,
  "schedule_type" | "schedule_day" | "schedule_frame" | "schedule_hour"
>): string {
  const hour = formatTimeWithUnit(schedule_hour ?? 0, "hour-of-day");

  return match(schedule_type)
    .with("hourly", () => t`Hourly`)
    .with("daily", () => t`Daily at ${hour}`)
    .with("weekly", () => WEEKLY_SCHEDULES[schedule_day ?? "mon"](hour))
    .with("monthly", () => {
      const frame = formatFrame(schedule_frame ?? "first");
      if (schedule_day == null) {
        return t`Monthly on the ${frame} calendar day at ${hour}`;
      }
      const day = formatDateTimeWithUnit(schedule_day, "day-of-week");
      return t`Monthly on the ${frame} ${day} at ${hour}`;
    })
    .exhaustive();
}

/**
 * The email recipients of a subscription's first channel ("Ada Lovelace and
 * 2 others"), or an empty string for a Slack channel or no recipients.
 */
export function buildRecipientText(pulse: DashboardSubscription): string {
  const {
    channels: [firstChannel],
  } = pulse;

  const { channel_type, recipients } = firstChannel;

  if (channel_type !== "email" || !recipients || recipients.length === 0) {
    return "";
  }

  const [firstRecipient, ...otherRecipients] = recipients;
  const firstRecipientText = firstRecipient.common_name || firstRecipient.email;
  return _.isEmpty(otherRecipients)
    ? firstRecipientText
    : `${firstRecipientText} ${ngettext(
        msgid`and ${otherRecipients.length} other`,
        `and ${otherRecipients.length} others`,
        otherRecipients.length,
      )}`;
}

/**
 * One active subscription filter with every value it sets ("Category: Gizmo
 * and Widget"), dates in their display form.
 */
export function formatFilter(parameter: Parameter): string {
  const value = isDateParameter(parameter)
    ? formatDateFilterValue(parameter)
    : conjunct(getFilterValues(parameter).filter(isNotNull), t`and`);
  return `${parameter.name}: ${value}`;
}

/**
 * The subscription's active filters given the dashboard's parameters
 * ("Category: Gizmo and 1 more filter"), or an empty string when none is set.
 */
export function buildFilterText(
  pulse: DashboardSubscription,
  parameters: Parameter[],
): string {
  const activeParameters = getActivePulseParameters(pulse, parameters);

  if (_.isEmpty(activeParameters)) {
    return "";
  }

  const [firstParameter, ...otherParameters] = activeParameters;
  const firstValueCount = getFilterValues(firstParameter).length;
  const firstFilterText =
    !isDateParameter(firstParameter) && firstValueCount > 1
      ? `${firstParameter.name}: ${t`${firstValueCount} selections`}`
      : formatFilter(firstParameter);

  return _.isEmpty(otherParameters)
    ? firstFilterText
    : `${firstFilterText} ${ngettext(
        msgid`and ${otherParameters.length} more filter`,
        `and ${otherParameters.length} more filters`,
        otherParameters.length,
      )}`;
}

function isDateParameter(parameter: Parameter): boolean {
  return parameter.type.startsWith("date/");
}

function getFilterValues(parameter: Parameter) {
  return Array.isArray(parameter.value) ? parameter.value : [parameter.value];
}

// Same formatting as DefaultParametersSection
function formatDateFilterValue(parameter: Parameter): string {
  const formattedValues = getFilterValues(parameter)
    .map((value) => formatDateValue(parameter, value))
    .filter(isNotNull);
  return formattedValues.length > 0
    ? conjunct(formattedValues, t`and`)
    : String(parameter.value);
}

import { TimePeriod, DateRange } from '../types';

/**
 * Utility class for converting TimePeriod enums to concrete DateRange objects
 * FEA010: Uses firstDayOfWeek from plugin settings
 */
export class DateRangeCalculator {
	/**
	 * Convert a TimePeriod to a DateRange
	 * @param period The time period to convert
	 * @param firstDayOfWeek First day of week (0=Sunday, 1=Monday, etc.) - used for THIS_WEEK calculation
	 */
	static calculateDateRange(period: TimePeriod, firstDayOfWeek: number = 1): DateRange {
		const now = new Date();
		let startDate: Date;
		let endDate: Date;

		switch (period) {
			case TimePeriod.PAST_24_HOURS:
				// 24h ago to now 
				startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				endDate = new Date(now);
				break;

			case TimePeriod.PAST_7_DAYS:
				// 6 days ago at midnight to today at end of day (7 calendar days)
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
				endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;

			case TimePeriod.PAST_30_DAYS:
				// 29 days ago at midnight to today at end of day (30 calendar days)
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
				endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;

			case TimePeriod.PAST_90_DAYS:
				// 89 days ago at midnight to today at end of day (90 calendar days)
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
				endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;

			case TimePeriod.PAST_YEAR:
				// 364 days ago at midnight to today at end of day (365 calendar days)
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 364, 0, 0, 0, 0);
				endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;

			case TimePeriod.TODAY:
				// Today at midnight to today at end of day (1 calendar day)
				startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
				endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
				break;

		case TimePeriod.THIS_WEEK: {
			// Use week start day from settings (FEA010)
			const weekStartDay = firstDayOfWeek;
			const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
			
			// Calculate days to subtract to get to start of week
			const daysToSubtract = (currentDayOfWeek - weekStartDay + 7) % 7;
			
			// First day of week at midnight
			const year = now.getFullYear();
			const month = now.getMonth();
			const date = now.getDate();
			startDate = new Date(year, month, date - daysToSubtract, 0, 0, 0, 0);
			
			// Last day of week at 23:59:59.999
			endDate = new Date(year, month, date - daysToSubtract + 6, 23, 59, 59, 999);
			break;
		}

			case TimePeriod.THIS_MONTH:
				startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
				// Last day of month at 23:59:59.999
				endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
				break;

			case TimePeriod.THIS_QUARTER:
				const currentQuarter = Math.floor(now.getMonth() / 3);
				const quarterStartMonth = currentQuarter * 3;
				startDate = new Date(now.getFullYear(), quarterStartMonth, 1, 0, 0, 0, 0);
				// Last day of quarter at 23:59:59.999
				endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59, 999);
				break;

			case TimePeriod.THIS_YEAR:
				startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
				// Dec 31 at 23:59:59.999
				endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
				break;

			default:
				// Default to past 30 days
				startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				endDate = new Date(now);
		}

		return { startDate, endDate };
	}

	/**
	 * Get a human-readable label for a time period
	 */
	static getPeriodLabel(period: TimePeriod): string {
		switch (period) {
			case TimePeriod.PAST_24_HOURS:
				return 'past 24 hours';
			case TimePeriod.PAST_7_DAYS:
				return 'past 7 days';
			case TimePeriod.PAST_30_DAYS:
				return 'past 30 days';
			case TimePeriod.PAST_90_DAYS:
				return 'past 90 days';
			case TimePeriod.PAST_YEAR:
				return 'past year';
			case TimePeriod.TODAY:
				return 'today';
			case TimePeriod.THIS_WEEK:
				return 'this week';
			case TimePeriod.THIS_MONTH:
				return 'this month';
			case TimePeriod.THIS_QUARTER:
				return 'this quarter';
			case TimePeriod.THIS_YEAR:
				return 'this year';
			default:
				return 'past 30 days';
		}
	}

	/**
	 * Get all available time periods as an array of objects with value and label
	 */
	static getAllPeriods(): Array<{ value: TimePeriod; label: string }> {
		return [
			{ value: TimePeriod.PAST_24_HOURS, label: DateRangeCalculator.getPeriodLabel(TimePeriod.PAST_24_HOURS) },
			{ value: TimePeriod.PAST_7_DAYS, label: DateRangeCalculator.getPeriodLabel(TimePeriod.PAST_7_DAYS) },
			{ value: TimePeriod.PAST_30_DAYS, label: DateRangeCalculator.getPeriodLabel(TimePeriod.PAST_30_DAYS) },
			{ value: TimePeriod.PAST_90_DAYS, label: DateRangeCalculator.getPeriodLabel(TimePeriod.PAST_90_DAYS) },
			{ value: TimePeriod.PAST_YEAR, label: DateRangeCalculator.getPeriodLabel(TimePeriod.PAST_YEAR) },
			{ value: TimePeriod.TODAY, label: DateRangeCalculator.getPeriodLabel(TimePeriod.TODAY) },
			{ value: TimePeriod.THIS_WEEK, label: DateRangeCalculator.getPeriodLabel(TimePeriod.THIS_WEEK) },
			{ value: TimePeriod.THIS_MONTH, label: DateRangeCalculator.getPeriodLabel(TimePeriod.THIS_MONTH) },
			{ value: TimePeriod.THIS_QUARTER, label: DateRangeCalculator.getPeriodLabel(TimePeriod.THIS_QUARTER) },
			{ value: TimePeriod.THIS_YEAR, label: DateRangeCalculator.getPeriodLabel(TimePeriod.THIS_YEAR) }
		];
	}
}

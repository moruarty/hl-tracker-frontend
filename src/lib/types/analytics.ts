export type CalendarStats = {
	daily_pnl: Record<string, number>;
	avg_hold_time: number;
	avg_hold_time_profit: number;
	avg_hold_time_loss: number;
	long_short_ratio: number;
	win_rate_long: number; // 0..1
	win_rate_short: number; // 0..1
	avg_hold_time_long: number;
	avg_hold_time_short: number;
};

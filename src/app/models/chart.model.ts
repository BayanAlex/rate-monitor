export const periods = ['Hour', 'Minute'] as const;
export type Period = typeof periods[number];
export const SpinnerType = {
    CLOCKWISE_WHITE_0: 0,
    CLOCKWISE_WHITE_1: 1,
    CLOCKWISE_WHITE_2: 2,
    CLOCKWISE_WHITE_3: 3,
    CLOCKWISE_YELLOW: 4,
    COUNTER_CLOCKWISE_WHITE: 5,
} as const;

export type SpinnerType = (typeof SpinnerType)[keyof typeof SpinnerType];

export type Spinner = {
    duration: number;
    text: string;
    type: SpinnerType;
};

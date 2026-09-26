// Query key tập trung (AD-5): mọi hook và mutation lấy key từ đây.
export const queryKeys = {
  all: ['noi-than'] as const,
  household: () => [...queryKeys.all, 'household'] as const,
  items: (householdId: string, setKey: string) => [...queryKeys.all, 'items', householdId, setKey] as const,
  draws: (householdId: string, setKey: string) => [...queryKeys.all, 'draws', householdId, setKey] as const,
}

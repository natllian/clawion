export function isBlockedStatusNotes(
	statusNotes: string | null | undefined,
): boolean {
	return (statusNotes ?? "").toLowerCase().startsWith("blocked:");
}

export function isCompletedTaskColumn(
	columnId: string,
	columnName?: string | null,
): boolean {
	return (
		`${columnId} ${columnName ?? ""}`.toLowerCase().match(/complete|done/) !==
		null
	);
}

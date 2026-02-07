/**
 * Thrown when a requested resource (mission, agent, task, etc.) is not found.
 */
export class NotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotFoundError";
	}
}

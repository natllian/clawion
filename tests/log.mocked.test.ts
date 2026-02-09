import { afterEach, describe, expect, it, vi } from "vitest";

const mockOpen = vi.fn();
const mockWatch = vi.fn();

vi.mock("node:fs/promises", () => ({
	open: mockOpen,
	watch: mockWatch,
	default: {
		open: mockOpen,
		watch: mockWatch,
	},
}));

const { logInvocations } = await import("../src/cli/log");

describe("logInvocations (mocked fs)", () => {
	const stdoutChunks: string[] = [];
	const originalWrite = process.stdout.write;

	afterEach(() => {
		mockOpen.mockReset();
		mockWatch.mockReset();
		stdoutChunks.length = 0;
		process.stdout.write = originalWrite;
		vi.restoreAllMocks();
		process.exitCode = 0;
	});

	function captureStdout() {
		process.stdout.write = ((chunk: unknown) => {
			stdoutChunks.push(
				chunk instanceof Buffer ? chunk.toString() : String(chunk),
			);
			return true;
		}) as typeof process.stdout.write;
	}

	it("rethrows non-ENOENT errors from initial open", async () => {
		const err = Object.assign(new Error("open failed"), { code: "EACCES" });
		mockOpen.mockRejectedValueOnce(err);

		await expect(logInvocations("/tmp/invocations.log")).rejects.toThrow(
			"open failed",
		);
	});

	it("streams appended bytes when watch emits change", async () => {
		captureStdout();

		const emptyReadBuffer = Buffer.alloc(8192);
		const initialHandle = {
			read: vi.fn().mockResolvedValue({
				bytesRead: 0,
				buffer: emptyReadBuffer,
			}),
			close: vi.fn().mockResolvedValue(undefined),
		};
		const watchHandle = {
			read: vi
				.fn()
				.mockImplementationOnce((buffer: Buffer) => {
					const appended = Buffer.from("tail-update");
					appended.copy(buffer);
					return Promise.resolve({
						bytesRead: appended.length,
						buffer,
					});
				})
				.mockResolvedValueOnce({
					bytesRead: 0,
					buffer: Buffer.alloc(8192),
				}),
			close: vi.fn().mockResolvedValue(undefined),
		};

		mockOpen
			.mockResolvedValueOnce(initialHandle)
			.mockResolvedValueOnce(watchHandle);
		mockWatch.mockReturnValue(
			(async function* () {
				yield { eventType: "rename" };
				yield { eventType: "change" };
			})(),
		);

		await logInvocations("/tmp/invocations.log");

		expect(stdoutChunks.join("")).toBe("tail-update");
		expect(mockOpen).toHaveBeenCalledTimes(2);
		expect(watchHandle.read).toHaveBeenCalledTimes(2);
	});

	it("rethrows non-ENOENT errors from watch setup", async () => {
		const initialHandle = {
			read: vi.fn().mockResolvedValue({
				bytesRead: 0,
				buffer: Buffer.alloc(8192),
			}),
			close: vi.fn().mockResolvedValue(undefined),
		};
		mockOpen.mockResolvedValueOnce(initialHandle);
		mockWatch.mockImplementation(() => {
			throw Object.assign(new Error("watch failed"), { code: "EACCES" });
		});

		await expect(logInvocations("/tmp/invocations.log")).rejects.toThrow(
			"watch failed",
		);
	});
});

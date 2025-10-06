import { helloWorld } from "./hello.js";

describe("helloWorld", () => {
	it("should return 'Hello World'", () => {
		expect(helloWorld()).toBe("Hello World");
	});
});

import { Builder, By, until } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

const baseUrl = process.env.BROWSER_BASE_URL || process.env.BASE_URL || "http://api:3000";
const timeoutMs = Number(process.env.SELENIUM_WAIT_MS || 45000);
const firefoxBinary = process.env.FIREFOX_BINARY || "/usr/bin/firefox-esr";
const isHeadless = (process.env.SELENIUM_HEADLESS || "true").toLowerCase() !== "false";
const humanTypeDelayMs = Number(process.env.SELENIUM_HUMAN_TYPE_DELAY_MS || 120);
const humanStepDelayMs = Number(process.env.SELENIUM_HUMAN_STEP_DELAY_MS || 500);

const studentId = process.env.STUDENT_ID;
const studentName = process.env.STUDENT_NAME;
const studentGrade = process.env.STUDENT_GRADE;
const studentEmail = process.env.STUDENT_EMAIL;

const updatedName = process.env.UPDATED_NAME;
const updatedGrade = process.env.UPDATED_GRADE;
const updatedEmail = process.env.UPDATED_EMAIL;

function log(step) {
	process.stdout.write(`${step}\n`);
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseBetweenSteps() {
	await sleep(humanStepDelayMs);
}

async function clearAndType(driver, id, text) {
	const input = await driver.wait(until.elementLocated(By.id(id)), timeoutMs);
	await driver.wait(until.elementIsVisible(input), timeoutMs);
	await input.click();
	await driver.executeScript(
		`const [element, value] = arguments;
		const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
		setter.call(element, "");
		element.dispatchEvent(new Event("input", { bubbles: true }));
		element.dispatchEvent(new Event("change", { bubbles: true }));`,
		input
	);

	const value = String(text ?? "");
	for (const char of value) {
		await input.sendKeys(char);
		await sleep(humanTypeDelayMs);
	}
}

async function waitRowExists(driver, rowId) {
	await driver.wait(async () => {
		const elements = await driver.findElements(By.id(rowId));
		if (elements.length > 0) {
			return true;
		}

		const refreshButtons = await driver.findElements(By.id("btn-refresh-students"));
		if (refreshButtons.length > 0) {
			await refreshButtons[0].click();
		}

		return false;
	}, timeoutMs);
}

async function waitRowNotExists(driver, rowId) {
	await driver.wait(async () => {
		const elements = await driver.findElements(By.id(rowId));
		return elements.length === 0;
	}, timeoutMs);
}

const firefoxOptions = new firefox.Options();
firefoxOptions.setBinary(firefoxBinary);
if (isHeadless) {
	firefoxOptions.addArguments("-headless");
}
firefoxOptions.addArguments("--width=1440", "--height=900");

const builder = new Builder().forBrowser("firefox").setFirefoxOptions(firefoxOptions);

const driver = await builder.build();

try {
	log(`[selenium] modo firefox: ${isHeadless ? "headless" : "com janela"}`);
	log(`[selenium] modo interação: humano (type=${humanTypeDelayMs}ms, step=${humanStepDelayMs}ms)`);
	log("[selenium] abrindo aplicação");
	await driver.get(baseUrl);
	await pauseBetweenSteps();

	const openModalButton = await driver.wait(until.elementLocated(By.id("btn-open-create-student-modal")), timeoutMs);
	await driver.wait(until.elementIsVisible(openModalButton), timeoutMs);
	await openModalButton.click();
	await pauseBetweenSteps();

	log("[selenium] preenchendo formulário de criação");
	await clearAndType(driver, "input-student-id", studentId);
	await clearAndType(driver, "input-student-name", studentName);
	await clearAndType(driver, "input-student-grade", studentGrade);
	await clearAndType(driver, "input-student-email", studentEmail);
	await pauseBetweenSteps();

	const submitButton = await driver.findElement(By.id("btn-submit-student-form"));
	await submitButton.click();
	await pauseBetweenSteps();

	log("[selenium] aguardando criação refletir na tabela");
	await waitRowExists(driver, `student-row-${studentId}`);

	const editButton = await driver.findElement(By.id(`btn-edit-student-${studentId}`));
	await editButton.click();
	await pauseBetweenSteps();

	log("[selenium] atualizando aluno");
	await clearAndType(driver, "input-student-name", updatedName);
	await clearAndType(driver, "input-student-grade", updatedGrade);
	await clearAndType(driver, "input-student-email", updatedEmail);
	await pauseBetweenSteps();
	await driver.findElement(By.id("btn-submit-student-form")).click();
	await pauseBetweenSteps();

	await driver.wait(async () => {
		const nameCell = await driver.findElement(By.id(`student-name-${studentId}`));
		const gradeCell = await driver.findElement(By.id(`student-grade-${studentId}`));
		const emailCell = await driver.findElement(By.id(`student-email-${studentId}`));
		const [nameText, gradeText, emailText] = await Promise.all([
			nameCell.getText(),
			gradeCell.getText(),
			emailCell.getText(),
		]);
		return nameText === updatedName && gradeText === updatedGrade && emailText === updatedEmail;
	}, timeoutMs);

	log("[selenium] removendo aluno");
	await driver.findElement(By.id(`btn-delete-student-${studentId}`)).click();
	await pauseBetweenSteps();
	await waitRowNotExists(driver, `student-row-${studentId}`);

	log("[selenium] CRUD concluído com sucesso");
} finally {
	await driver.quit();
}

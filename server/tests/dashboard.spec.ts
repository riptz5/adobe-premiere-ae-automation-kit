import { test, expect } from "@playwright/test";

const BASE_URL = process.env.AUTOKIT_BASE_URL || "http://localhost:8787";

test("dashboard básico funciona end-to-end", async ({ page }) => {
  // Asume servidor corriendo (./run_all.sh)
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });

  // Cabecera siempre visible
  await expect(page.getByText("AutoKit · Dashboard")).toBeVisible();

  // Expand the "Más opciones" panel to reveal transcript/job/media sections
  await page.locator("#toggleMoreBtn").click();

  // Secciones visibles tras expandir
  await expect(page.getByText("Analizar transcript (markers/segments)")).toBeVisible();
  await expect(page.getByText("2 · Crear job (media o transcript)")).toBeVisible();

  // 1) Analizar transcript simple
  const transcript = "Hola esto es una prueba corta para AutoKit dashboard.";
  await page.fill("#transcriptInput", transcript);
  await page.click("#analyzeBtn");

  // Debe aparecer JSON en el log de análisis
  await expect(page.locator("#analyzeOutput")).toContainText("ok");

  // 2) Crear un job y dejar que se ejecute
  await page.fill("#jobTranscriptInput", transcript);
  await page.click("#jobCreateBtn");

  await expect(page.locator("#jobOutput")).toContainText("ok");

  // 3) Refrescar lista de jobs (top-level jobs section)
  await page.locator("#refreshJobsBtn").click();
  const jobsList = page.locator("#jobsList");
  await expect(jobsList).not.toContainText("No jobs yet.");

  const firstJob = jobsList.locator(".job").first();
  await expect(firstJob).toBeVisible();

  // Pulsa botón "Result" del primer job y comprueba que vuelve JSON
  await firstJob.getByText("Result").click();
  await expect(page.locator("#jobOutput")).toContainText("result");
});

test("Job Studio abre y muestra overview del job", async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await expect(page.getByText("AutoKit · Dashboard")).toBeVisible();
  await page.locator("#refreshJobsBtn").click();
  const jobsList = page.locator("#jobsList");
  await expect(jobsList).not.toContainText("No jobs yet.");
  const firstJob = jobsList.locator(".job").first();
  await expect(firstJob).toBeVisible();
  await firstJob.getByText("Open Studio").click();
  const studioWrap = page.locator("#jobStudioWrap");
  await expect(studioWrap).toBeVisible();
  await expect(page.locator("#jobStudioContent")).toContainText(/Status|Summary|Chapters|Loading/);
  await expect(page.locator("#jobStudioClose")).toBeVisible();
  await page.locator("#jobStudioClose").click();
  await expect(studioWrap).toBeHidden();
});

test("Media tools: botões QA y Music Analyze visibles y accionables", async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  // Expand to reveal media tools
  await page.locator("#toggleMoreBtn").click();
  await expect(page.getByText("4 · Media tools")).toBeVisible();
  await expect(page.locator("#qaBtn")).toBeVisible();
  await expect(page.locator("#musicBtn")).toBeVisible();
  await page.locator("#qaBtn").click();
  await expect(page.locator("#mediaOutput")).not.toBeEmpty();
});

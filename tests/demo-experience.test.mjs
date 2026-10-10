import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { after, before, test } from "node:test";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { demoAddons, demoProducts, completeDemoNavigation, getDemoActionLabel } = await import("../app/demo/_lib/catalog.ts");
const { requestDemoLaunch } = await import("../app/demo/_lib/launch.ts");
const { demoActionMessage, isDemoSession } = await import("../app/demo/_lib/session.ts");

let server;
let baseUrl;
let serverOutput = "";

before(async () => {
    const probe = createServer();
    const port = await new Promise((resolvePort, reject) => {
        probe.once("error", reject);
        probe.listen(0, "127.0.0.1", () => resolvePort(probe.address().port));
    });
    await new Promise((resolveClose, reject) => probe.close((error) => error ? reject(error) : resolveClose()));

    baseUrl = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, [
        join(projectRoot, "node_modules/next/dist/bin/next"),
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
    ], {
        cwd: projectRoot,
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-5000); });
    server.stderr.on("data", (chunk) => { serverOutput = `${serverOutput}${chunk}`.slice(-5000); });

    for (let attempt = 0; attempt < 120; attempt += 1) {
        if (server.exitCode !== null) throw new Error(`Next dev server exited early.\n${serverOutput}`);
        try {
            const response = await fetch(`${baseUrl}/demo`);
            if (response.ok) return;
        } catch {
            // Wait for Next to finish starting.
        }
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
    }
    throw new Error(`Next dev server did not become ready.\n${serverOutput}`);
}, { timeout: 90_000 });

after(async () => {
    if (!server || server.exitCode !== null) return;
    await new Promise((resolveExit) => {
        const timer = setTimeout(resolveExit, 3_000);
        server.once("exit", () => {
            clearTimeout(timer);
            resolveExit();
        });
        server.kill("SIGTERM");
    });
});

async function getPage(path) {
    const response = await fetch(`${baseUrl}${path}`);
    const html = await response.text();
    assert.equal(response.status, 200, `${path} should load after a direct request or refresh.\n${html.slice(0, 500)}`);
    return html;
}

test("/demo renders all products, public/admin choices, add-ons, and the complete suite", async () => {
    const html = await getPage("/demo");
    for (const product of demoProducts) {
        assert.ok(html.includes(product.name), `${product.name} is listed`);
        assert.ok(html.includes(`data-demo-launch=\"${product.key}\"`), `${product.name} has an admin launch action`);
        assert.ok(html.includes(`href=\"${product.publicDestination}\"`), `${product.name} links to its real public experience`);
    }
    assert.ok(html.includes("CRM + Mensajería"));
    assert.ok(html.includes("¿Querés verlo"));
    assert.ok(html.includes("data-demo-launch=\"completo\""));
    assert.match(html, /md:grid-cols-2/, "product cards use a two-column tablet layout");
    assert.match(html, /lg:grid-cols-6/, "product cards widen into the editorial desktop layout");
});

test("product and suite deep links render their matching public and admin paths", async () => {
    for (const product of demoProducts) {
        const html = await getPage(product.href);
        assert.ok(html.includes(product.name));
        assert.ok(html.includes("Así lo ve tu cliente"));
        assert.ok(html.includes("Así lo administrás vos"));
        assert.ok(html.includes(`href=\"${product.publicDestination}\"`));
        assert.ok(html.includes(`data-demo-launch=\"${product.key}\"`));
    }
    const complete = await getPage("/demo/completo");
    assert.ok(complete.includes("Club Horizonte"));
    assert.ok(complete.includes("data-demo-launch=\"completo\""));
});

test("add-on links start Club Horizonte and target canonical admin routes", async () => {
    for (const addon of demoAddons) {
        const html = await getPage(addon.href);
        assert.ok(html.includes(addon.name));
        assert.ok(html.includes(`data-demo-launch=\"completo\"`));
        assert.ok(html.includes(`data-demo-destination=\"${addon.adminDestination}\"`));
    }
});

test("demo launch sends the selected profile and follows the server's canonical destination", async () => {
    let request;
    const destination = await requestDemoLaunch("reservas", undefined, async (input, init) => {
        request = { input, init };
        return new Response(JSON.stringify({
            data: { isDemo: true, profile: { adminDestination: "/admin/dashboard/bookings" } },
        }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    assert.equal(request.input, "/demo/launch");
    assert.equal(request.init.method, "POST");
    assert.equal(request.init.credentials, "include");
    assert.deepEqual(JSON.parse(request.init.body), { profile: "reservas" });
    assert.equal(destination, "/admin/dashboard/bookings");
});

test("add-on launch keeps the complete profile and opens the selected canonical module", async () => {
    const addon = demoAddons[0];
    const destination = await requestDemoLaunch("completo", addon.adminDestination, async (_input, init) => {
        assert.deepEqual(JSON.parse(init.body), { profile: "completo" });
        return new Response(JSON.stringify({ data: { isDemo: true, profile: { adminDestination: "/admin/dashboard" } } }), { status: 200 });
    });
    assert.equal(destination, "/admin/dashboard/customers");
});

test("demo launch rejects non-demo and non-canonical destinations", async () => {
    await assert.rejects(() => requestDemoLaunch("reservas", undefined, async () => new Response(JSON.stringify({
        data: { isDemo: true, profile: { adminDestination: "https://example.com/admin/dashboard" } },
    }), { status: 200 })), /destino del panel/);
    await assert.rejects(() => requestDemoLaunch("reservas", undefined, async () => new Response(JSON.stringify({
        data: { isDemo: false, profile: { adminDestination: "/admin/dashboard/bookings" } },
    }), { status: 200 })), /confirmar el inicio/);
});

test("demo-only banner and read-only feedback have explicit session rules", () => {
    assert.equal(isDemoSession(null), false);
    assert.equal(isDemoSession({ isDemo: false }), false);
    assert.equal(isDemoSession({ isDemo: true }), true);
    assert.equal(demoActionMessage("DEMO_READ_ONLY"), "Esta acción no está disponible en modo demo.");
    assert.equal(demoActionMessage("DEMO_SESSION_EXPIRED"), "La sesión de demostración venció. Inicia otra demostración.");
    assert.equal(demoActionMessage("FORBIDDEN"), undefined);
});

test("complete demo navigation points to the existing admin modules", () => {
    assert.equal(completeDemoNavigation.length, 8);
    assert.ok(completeDemoNavigation.every((item) => item.href.startsWith("/admin/dashboard")));
    assert.ok(completeDemoNavigation.some((item) => item.label === "Branding" && item.href === "/admin/dashboard/storefront/appearance"));
});

test("public final-step copy uses one shared label per operation", () => {
    assert.equal(getDemoActionLabel("reservation"), "la reserva");
    assert.equal(getDemoActionLabel("order"), "el pedido");
    assert.equal(getDemoActionLabel("class-registration"), "la inscripción a la clase");
    assert.equal(getDemoActionLabel("event-registration"), "el registro al evento");
    assert.equal(getDemoActionLabel("purchase"), "la compra");
});

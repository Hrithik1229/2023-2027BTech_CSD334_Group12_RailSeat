
import fetch from 'node-fetch';

async function check() {
    try {
        console.log("Checking /api/admin/test...");
        const res = await fetch("http://localhost:3000/api/admin/test");
        console.log("/api/admin/test status:", res.status);
        if (res.ok) console.log(await res.text());

        console.log("Checking /api/admin/runs/2/route [PUT]...");
        const res2 = await fetch("http://localhost:3000/api/admin/runs/2/route", {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stops: [] }) // Should return 400 if route exists
        });
        console.log("/api/admin/runs/2/route stats:", res2.status, res2.statusText);

        console.log("Checking /api/admin/dashboard...");
        const res3 = await fetch("http://localhost:3000/api/admin/dashboard");
        console.log("/api/admin/dashboard status:", res3.status);

    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

check();

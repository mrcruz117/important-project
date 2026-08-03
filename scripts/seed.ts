async function main() {
  const res = await fetch("http://localhost:8000/seed", {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Seed failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  console.log(data.message);
}

main();
async function main() {
  const res = await fetch("http://localhost:8000/seed", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ Seed failed:");
    console.error(data);
    throw new Error(`Seed failed: ${res.status}`);
  }

  console.log("Seed result:");
  console.log(`Message: ${data.message}`);
  console.log(`Inserted: ${data.inserted}`);
  console.log(`Duplicates skipped: ${data.duplicates_skipped}`);
  console.log(`Total attempted: ${data.total_attempted}`);

  if (data.errors && data.errors.length > 0) {
    console.log("⚠️ Errors:");
    data.errors.forEach((err: any) => {
      console.log(`- ${err.email}: ${err.error}`);
    });
  }

  if (data.inserted === 0 && data.duplicates_skipped > 0) {
    console.log("No new records inserted (all duplicates).");
  }
}

main().catch((err) => {
  console.error("❌ Script crashed:");
  console.error(err.message);
});
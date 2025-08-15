async function classifyProduct() {
  const description = document.getElementById("description").value;
  const output = document.getElementById("output");

  output.textContent = "Loading...";

  try {
    const res = await fetch("https://tslite-api.onrender.com/classify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description: description }), // ✅ FIXED HERE
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = "Error: " + err.message;
  }
}

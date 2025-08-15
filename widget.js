async function classifyProduct() {
  const description = document.getElementById("description").value;
  const output = document.getElementById("output");
  output.textContent = "Classifying...";

  try {
    const response = await fetch("https://tslite-api.onrender.com/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description })
    });

    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    output.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    output.textContent = "Error: " + err.message;
  }
}

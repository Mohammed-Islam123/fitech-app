const BASE_URL = (
  import.meta.env.VITE_IDENTITY_API_URL || "http://localhost:5098"
).replace(/\/$/, "");

function pickApiValue(payload, key) {
  return (
    payload?.[key] ?? payload?.[key.charAt(0).toLowerCase() + key.slice(1)]
  );
}

function getErrorMessage(data) {
  const errors = pickApiValue(data, "Errors");

  if (Array.isArray(errors) && errors.length > 0) {
    return errors.join(" ");
  }

  return (
    pickApiValue(data, "Message") ||
    "Login failed. Please check your credentials."
  );
}

export async function loginUser(emailOrUserName, password) {
  const response = await fetch(`${BASE_URL}/api/User/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailOrUserName,
      password,
      clientId: "web",
    }),
  });

  const data = await response.json().catch(() => null);
  const success = pickApiValue(data, "Success");
  const authData = pickApiValue(data, "Data");
  const succeeded = pickApiValue(authData, "Succeeded");

  if (!response.ok || !success || !succeeded) {
    throw new Error(getErrorMessage(data));
  }

  return {
    success,
    data: authData,
    message: pickApiValue(data, "Message"),
  };
}

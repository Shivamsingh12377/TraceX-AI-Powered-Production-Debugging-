const API_URL = `${import.meta.env.VITE_API_URL}/api/tasks`;

async function apiRequest(path = "", options = {}) {
  const token = localStorage.getItem("tracexToken");

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    throw new Error(
      "Backend connection failed. Check CORS and API URL."
    );
  }

  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "API request failed");
  }

  return result;
}

export async function getTasks() {
  const result = await apiRequest();
  return result.data || [];
}

export async function createTask(task) {
  return apiRequest("", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export async function updateTask(id, task) {
  return apiRequest(`/${id}`, {
    method: "PUT",
    body: JSON.stringify(task),
  });
}

export async function deleteTask(id) {
  return apiRequest(`/${id}`, {
    method: "DELETE",
  });
}
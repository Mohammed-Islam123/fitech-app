const GATEWAY_URL = (import.meta.env.VITE_IDENTITY_API_URL || "http://localhost:5098").replace(/\/$/, "");
const MEMBERSHIP_BASE_URL = GATEWAY_URL;
const PAYMENT_BASE_URL = GATEWAY_URL;
const COURSES_BASE_URL = GATEWAY_URL;
const ACTIVITY_BASE_URL = GATEWAY_URL;
const AGGREGATION_BASE_URL = GATEWAY_URL;
const CHAT_BASE_URL = GATEWAY_URL;
const SHOP_BASE_URL = GATEWAY_URL;
const EQUIPMENT_BASE_URL = GATEWAY_URL;

function toQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

async function apiFetch(endpoint, options = {}, baseUrl = MEMBERSHIP_BASE_URL) {
  const token = localStorage.getItem("token");
  const headers = {
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Set Content-Type to application/json by default if body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${baseUrl}${endpoint}`, config);

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("json");
  const data = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

  if (!response.ok) {
    const errors = data?.errors || data?.Errors;
    const errorMsg =
      (Array.isArray(errors) && errors.length > 0 && errors.join(" ")) ||
      data?.detail ||
      data?.Detail ||
      data?.Message ||
      data?.message ||
      data?.title ||
      data?.Title ||
      (typeof data === "string" && data) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function downloadFetch(endpoint, options = {}, baseUrl = AGGREGATION_BASE_URL) {
  return apiFetch(endpoint, options, baseUrl);
}

export const api = {
  // Members
  listMembers: async ({ page = 1, pageSize = 10, search = "", status = "" }) => {
    const params = new URLSearchParams();
    params.append("Page", page);
    params.append("PageSize", pageSize);
    if (search) params.append("Search", search);
    if (status && status !== "All") params.append("Status", status);

    return apiFetch(`/api/members?${params.toString()}`);
  },

  getMember: async (id) => {
    return apiFetch(`/api/members/${id}`);
  },

  createMember: async (memberData) => {
    let body;
    let headers = {};

    if (memberData instanceof FormData) {
      body = memberData;
    } else {
      body = JSON.stringify(memberData);
    }

    return apiFetch("/api/members", {
      method: "POST",
      headers,
      body,
    });
  },

  updateMember: async (id, memberData) => {
    let body;
    let headers = {};

    if (memberData instanceof FormData) {
      body = memberData;
    } else {
      body = JSON.stringify(memberData);
    }

    return apiFetch(`/api/members/${id}`, {
      method: "PUT",
      headers,
      body,
    });
  },

  deleteMember: async (id) => {
    return apiFetch(`/api/members/${id}`, {
      method: "DELETE",
    });
  },

  suspendMember: async (memberId) => {
    return apiFetch(`/api/members/${memberId}/suspend`, {
      method: "PATCH",
    });
  },

  activateMember: async (memberId) => {
    return apiFetch(`/api/members/${memberId}/activate`, {
      method: "PATCH",
    });
  },

  getSubscriptionHistory: async (memberId) => {
    return apiFetch(`/api/members/${memberId}/subscriptions`);
  },

  // Plans
  listPlans: async () => {
    return apiFetch("/api/plans");
  },

  createPlan: async (planData) => {
    let durationUnit = planData.durationUnit;
    let durationValue = planData.durationValue;
    if (typeof durationUnit === "string") {
      const unit = durationUnit.toLowerCase();
      if (unit.startsWith("day")) {
        durationUnit = 0;
      } else if (unit.startsWith("week")) {
        durationUnit = 0;
        durationValue = durationValue * 7;
      } else if (unit.startsWith("month")) {
        durationUnit = 1;
      } else if (unit.startsWith("year")) {
        durationUnit = 1;
        durationValue = durationValue * 12;
      } else {
        durationUnit = 1;
      }
    }
    return apiFetch("/api/plans", {
      method: "POST",
      body: JSON.stringify({
        ...planData,
        durationValue,
        durationUnit,
      }),
    });
  },

  updatePlan: async (id, planData) => {
    let durationUnit = planData.durationUnit;
    let durationValue = planData.durationValue;
    if (typeof durationUnit === "string") {
      const unit = durationUnit.toLowerCase();
      if (unit.startsWith("day")) {
        durationUnit = 0;
      } else if (unit.startsWith("week")) {
        durationUnit = 0;
        durationValue = durationValue * 7;
      } else if (unit.startsWith("month")) {
        durationUnit = 1;
      } else if (unit.startsWith("year")) {
        durationUnit = 1;
        durationValue = durationValue * 12;
      }
    }
    return apiFetch(`/api/plans/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...planData,
        durationValue,
        durationUnit,
      }),
    });
  },

  deletePlan: async (id) => {
    return apiFetch(`/api/plans/${id}`, {
      method: "DELETE",
    });
  },

  // Subscriptions
  createSubscription: async ({ memberId, planId, paymentMethod = "Cash", notes = "" }) => {
    const paymentMethodMap = {
      "Cash": 0,
      "CreditCard": 1,
      "Credit Card": 1,
      "Online": 1,
      0: 0,
      1: 1,
    };
    const methodInt = paymentMethodMap[paymentMethod] ?? 0;
    return apiFetch("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify({ memberId, planId, paymentMethod: methodInt, notes }),
    });
  },

  confirmCashPayment: async ({ subscriptionId, amountReceived, paymentMethod = "Cash", notes = "" }) => {
    const paymentMethodMap = {
      "Cash": 0,
      "CreditCard": 1,
      "Credit Card": 1,
      "Online": 1,
      0: 0,
      1: 1,
    };
    const methodInt = paymentMethodMap[paymentMethod] ?? 0;
    return apiFetch("/api/subscriptions/confirm-payment", {
      method: "POST",
      body: JSON.stringify({ subscriptionId, amountReceived, paymentMethod: methodInt, notes }),
    });
  },

  // Payments
  listPayments: async () => {
    return apiFetch("/api/payments", {}, PAYMENT_BASE_URL);
  },

  createPayment: async ({ userId, amount, paymentMethod = "Cash", paymentType = "Subscription", referenceId, notes = "" }) => {
    const paymentMethodMap = {
      "Cash": 0,
      "CreditCard": 1,
      "Credit Card": 1,
      "Online": 1,
      0: 0,
      1: 1,
    };
    const paymentTypeMap = {
      "Subscription": 0,
      "ECommerce": 1,
      "Session": 2,
      "CoursePurchase": 3,
      0: 0,
      1: 1,
      2: 2,
      3: 3,
    };
    const methodInt = paymentMethodMap[paymentMethod] ?? 0;
    const typeInt = paymentTypeMap[paymentType] ?? 0;
    return apiFetch("/api/payments", {
      method: "POST",
      body: JSON.stringify({ userId, amount, paymentMethod: methodInt, paymentType: typeInt, referenceId, notes }),
    }, PAYMENT_BASE_URL);
  },
  // Renewals
  listPendingRenewals: async () => {
    return apiFetch("/api/subscriptions/renew/pending");
  },

  requestRenewal: async ({ subscriptionId, amount, notes = "" }) => {
    return apiFetch("/api/subscriptions/renew", {
      method: "POST",
      body: JSON.stringify({ subscriptionId, amount, notes }),
    });
  },

  acceptRenewal: async (requestId, notes = "") => {
    return apiFetch(`/api/subscriptions/renew/${requestId}/accept`, {
      method: "PATCH",
      body: notes ? JSON.stringify({ notes }) : JSON.stringify({}),
    });
  },

  rejectRenewal: async (requestId, notes = "") => {
    return apiFetch(`/api/subscriptions/renew/${requestId}/reject`, {
      method: "PATCH",
      body: notes ? JSON.stringify({ notes }) : JSON.stringify({}),
    });
  },

  onlineRenewal: async ({ subscriptionId, amount, notes = "" }) => {
    return apiFetch("/api/subscriptions/renew/online", {
      method: "POST",
      body: JSON.stringify({ subscriptionId, amount, notes }),
    });
  },

  // Member (self) endpoints
  getMyProfile: async () => {
    return apiFetch("/api/me");
  },

  updateMyProfile: async (profileData) => {
    return apiFetch("/api/me", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },

  getMySubscription: async () => {
    return apiFetch("/api/me/subscription");
  },

  getMySubscriptions: async () => {
    return apiFetch("/api/me/subscriptions");
  },

  getMySessions: async () => {
    return apiFetch("/api/me/sessions");
  },

  getMyPayments: async () => {
    return apiFetch("/api/me/payments");
  },

  getActiveSubscription: async () => {
    return apiFetch("/api/members/active-subscription");
  },

  // Courses / Programs
  createProgram: async (programData) => {
    return apiFetch("/api/programs", {
      method: "POST",
      body: JSON.stringify(programData),
    }, COURSES_BASE_URL);
  },

  getCoachPrograms: async () => {
    return apiFetch(`/api/coaches/me/programs`, {}, COURSES_BASE_URL);
  },

  getCoachProfile: async (coachId) => {
    return apiFetch(`/api/coaches/${coachId}`, {}, COURSES_BASE_URL);
  },

  getCoachClients: async () => {
   return apiFetch(`/api/coaches/me/clients`, {}, COURSES_BASE_URL);
  },

  getCoachClientProfile: async (coachId, memberId) => {
    return apiFetch(`/api/coaches/${coachId}/clients/${memberId}`, {}, COURSES_BASE_URL);
  },

  getProgramDetail: async (programId) => {
    return apiFetch(`/api/programs/${programId}`, {}, COURSES_BASE_URL);
  },

  getProgramMembers: async (programId) => {
    return apiFetch(`/api/programs/${programId}/members`, {}, COURSES_BASE_URL);
  },

  getAvailablePrograms: async () => {
    return apiFetch("/api/programs/available", {}, COURSES_BASE_URL);
  },

  getEnrolledPrograms: async () => {
    return apiFetch("/api/programs/enrolled", {}, COURSES_BASE_URL);
  },

  purchaseProgramOnline: async (programId, { amount, notes = "" }) => {
    return apiFetch(`/api/programs/${programId}/purchase/online`, {
      method: "POST",
      body: JSON.stringify({ amount, notes }),
    }, COURSES_BASE_URL);
  },

  purchaseProgramCash: async (programId, { amount, notes = "" }) => {
    return apiFetch(`/api/programs/${programId}/purchase/cash`, {
      method: "POST",
      body: JSON.stringify({ amount, notes }),
    }, COURSES_BASE_URL);
  },

  listProgramRequests: async () => {
    return apiFetch("/api/programs/requests", {}, COURSES_BASE_URL);
  },

  getProgramRequest: async (programId) => {
    return apiFetch(`/api/programs/requests/${programId}`, {}, COURSES_BASE_URL);
  },

  acceptProgramRequest: async (programId) => {
    return apiFetch(`/api/programs/requests/${programId}/accept`, {
      method: "PATCH",
    }, COURSES_BASE_URL);
  },

  rejectProgramRequest: async (programId) => {
    return apiFetch(`/api/programs/requests/${programId}/reject`, {
      method: "PATCH",
    }, COURSES_BASE_URL);
  },

  listPurchaseRequests: async () => {
    return apiFetch("/api/programs/purchase/pending", {}, COURSES_BASE_URL);
  },

  acceptCoursePurchase: async (requestId) => {
    return apiFetch(`/api/programs/purchase/${requestId}/accept`, {
      method: "PATCH",
    }, COURSES_BASE_URL);
  },

  rejectCoursePurchase: async (requestId, reason = "") => {
    return apiFetch(`/api/programs/purchase/${requestId}/reject`, {
      method: "PATCH",
      body: JSON.stringify(reason || null),
    }, COURSES_BASE_URL);
  },

  markAttendance: async (sessionId, attendance) => {
    return apiFetch(`/api/sessions/${sessionId}/attendance`, {
      method: "POST",
      body: JSON.stringify({ attendance }),
    }, COURSES_BASE_URL);
  },

  getSessionHistory: async ({ startDate, endDate }) => {
    return apiFetch(`/api/sessions/history${toQueryString({ startDate, endDate })}`, {}, COURSES_BASE_URL);
  },

  createCoach: async (coachData) => {
    return apiFetch("/api/coaches", {
      method: "POST",
      body: JSON.stringify(coachData),
    }, COURSES_BASE_URL);
  },

  // Coach self endpoints (using /me)
  getMyCoachProfile: async () => {
    return apiFetch("/api/coaches/me", {}, COURSES_BASE_URL);
  },

  getMyCoachPrograms: async () => {
    return apiFetch("/api/coaches/me/programs", {}, COURSES_BASE_URL);
  },

  getMyCoachSessions: async ({ from, to } = {}) => {
    return apiFetch(`/api/coaches/me/sessions${toQueryString({ from, to })}`, {}, COURSES_BASE_URL);
  },

  updateMyCoachProfile: async (data) => {
    return apiFetch("/api/coaches/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }, COURSES_BASE_URL);
  },

  getMyCoachPurchaseRequests: async () => {
    return apiFetch("/api/coaches/me/purchase-requests", {}, COURSES_BASE_URL);
  },

  // Chat
  listConversations: async () => {
    return apiFetch("/api/conversations", {}, CHAT_BASE_URL);
  },

  getOrCreateConversation: async (otherUserId) => {
    return apiFetch("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ otherUserId }),
    }, CHAT_BASE_URL);
  },

  getMessages: async (conversationId, { page = 1, pageSize = 30 } = {}) => {
    return apiFetch(`/api/conversations/${conversationId}/messages${toQueryString({ page, pageSize })}`, {}, CHAT_BASE_URL);
  },

  sendMessage: async (conversationId, content) => {
    return apiFetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }, CHAT_BASE_URL);
  },

  // Activity
  getSessionsToday: async () => {
    return apiFetch("/api/activity/sessions/today", {}, ACTIVITY_BASE_URL);
  },

  getMemberActivity: async (memberId) => {
    return apiFetch(`/api/activity/members/${memberId}`, {}, ACTIVITY_BASE_URL);
  },

  scanEntryExit: async (cardUid) => {
    return apiFetch("/api/activity/entry-exit/scan", {
      method: "POST",
      body: JSON.stringify({ cardUid }),
    }, ACTIVITY_BASE_URL);
  },

  manualEnter: async ({ memberId, courseId = null }) => {
    return apiFetch("/api/activity/entry-exit/manual/enter", {
      method: "POST",
      body: JSON.stringify({ memberId, courseId }),
    }, ACTIVITY_BASE_URL);
  },

  manualExit: async ({ memberId, courseId = null }) => {
    return apiFetch("/api/activity/entry-exit/manual/exit", {
      method: "POST",
      body: JSON.stringify({ memberId, courseId }),
    }, ACTIVITY_BASE_URL);
  },

  // Aggregation / dashboards
  getAdminDashboard: async () => {
    return apiFetch("/api/dashboard/admin", {}, AGGREGATION_BASE_URL);
  },

  getFinanceDashboard: async () => {
    return apiFetch("/api/payments", {}, AGGREGATION_BASE_URL);
  },

  downloadExcelReport: async () => {
    return downloadFetch("/api/reports/excel", {}, AGGREGATION_BASE_URL);
  },

  // Shop / Products
  listProducts: async () => {
    return apiFetch("/api/products", {}, SHOP_BASE_URL);
  },

  getProduct: async (id) => {
    return apiFetch(`/api/products/${id}`, {}, SHOP_BASE_URL);
  },

  createProduct: async (formData) => {
    return apiFetch("/api/products", {
      method: "POST",
      body: formData,
    }, SHOP_BASE_URL);
  },

  updateProduct: async (id, formData) => {
    return apiFetch(`/api/products/${id}`, {
      method: "PUT",
      body: formData,
    }, SHOP_BASE_URL);
  },

  deleteProduct: async (id) => {
    return apiFetch(`/api/products/${id}`, {
      method: "DELETE",
    }, SHOP_BASE_URL);
  },

  // Equipment
  listEquipment: async () => {
    return apiFetch("/api/equipments", {}, EQUIPMENT_BASE_URL);
  },

  getEquipment: async (id) => {
    return apiFetch(`/api/equipments/${id}`, {}, EQUIPMENT_BASE_URL);
  },

  createEquipment: async (formData) => {
    return apiFetch("/api/equipments", {
      method: "POST",
      body: formData,
    }, EQUIPMENT_BASE_URL);
  },

  updateEquipment: async (id, formData) => {
    return apiFetch(`/api/equipments/${id}`, {
      method: "PUT",
      body: formData,
    }, EQUIPMENT_BASE_URL);
  },

  deleteEquipment: async (id) => {
    return apiFetch(`/api/equipments/${id}`, {
      method: "DELETE",
    }, EQUIPMENT_BASE_URL);
  },

  // Equipment Issues
  listIssues: async () => {
    return apiFetch("/api/issues", {}, EQUIPMENT_BASE_URL);
  },

  updateIssueStatus: async (issueId, status) => {
    return apiFetch(`/api/issues/${issueId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, EQUIPMENT_BASE_URL);
  },
};
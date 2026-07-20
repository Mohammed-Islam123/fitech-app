import { useState, useEffect, useRef } from "react";
import { Button } from "./Button";
import { User, EnvelopeSimple, Phone, X, IdentificationCard, PencilSimple, CreditCard } from "../../icons/index";
import { GenderIntersex, CalendarDots, MoneyWavy, ListNumbers, HourglassSimple, CalendarBlank } from "@phosphor-icons/react";
import { api } from "../../services/api";
import nfcScanner from "../../services/nfcScanner";

const tabs = ["Information", "Subscription"];

export default function AddMemberModal({ onClose }) {
  const [activeTab, setActiveTab] = useState("Information");
  const [isClosing, setIsClosing] = useState(false);
  const [useSavedPlan, setUseSavedPlan] = useState(true);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    cardCode: "",                          // ← NEW
    gender: "Male", birthDate: "", medicalCertificate: null, profilePicture: null,
    plan: "", startDate: "", priceOverride: "",
    customPlanName: "", customPlanDescription: "", customPlanPrice: "",
    customSessionCount: "", customDurationValue: "1", customDurationUnit: "Months",
  });

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // ── NFC / card-reader state ──────────────────────────────────────────────
  const [cardFocused, setCardFocused] = useState(false);
  const cardInputRef = useRef(null);

  // Auto-focus the card input 300 ms after the modal opens so the USB reader
  // can type straight into it without the user having to click first.
  useEffect(() => {
    const t = setTimeout(() => cardInputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // Pause background scanner while this modal is open so card scans
  // intended for member creation don't trigger entry/exit processing.
  // Uses the scanner singleton directly (not the React context) to avoid
  // stale-closure issues with the hook's startListening callback chain.
  useEffect(() => {
    const wasActive = nfcScanner.isActive();
    nfcScanner.stop();
    return () => {
      if (wasActive) {
        nfcScanner.start();
      }
    };
  }, []);
  // ────────────────────────────────────────────────────────────────────────

  // Fetch plans on mount
  useEffect(() => {
    async function loadPlans() {
      setLoadingPlans(true);
      try {
        const data = await api.listPlans();
        if (Array.isArray(data)) {
          setPlans(data);
          if (data.length > 0) {
            setForm(prev => ({
              ...prev,
              plan: data[0].id || data[0].planId || ""
            }));
          }
        }
      } catch (err) {
        console.error("Error loading plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    }
    loadPlans();
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleFileChange = (field) => (e) => setForm({ ...form, [field]: e.target.files?.[0] || null });

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError("Please fill out First Name, Last Name, and Email.");
      return;
    }

    setLoading(true);

    try {
      let planId = form.plan;

      if (!useSavedPlan) {
        const customPrice = Number(form.customPlanPrice);
        const customDuration = Number(form.customDurationValue);
        const customSessions = form.customSessionCount === "" ? null : Number(form.customSessionCount);

        if (!form.customPlanName.trim()) {
          throw new Error("Custom plan name is required.");
        }
        if (!Number.isFinite(customPrice) || customPrice < 0) {
          throw new Error("Please enter a valid custom plan price.");
        }
        if (!Number.isInteger(customDuration) || customDuration <= 0) {
          throw new Error("Custom plan duration must be a positive whole number.");
        }
        if (customSessions !== null && (!Number.isInteger(customSessions) || customSessions < 0)) {
          throw new Error("Custom plan sessions must be zero or a positive whole number.");
        }

        const planResponse = await api.createPlan({
          name: form.customPlanName.trim(),
          description: form.customPlanDescription.trim() || null,
          price: customPrice,
          durationValue: customDuration,
          durationUnit: form.customDurationUnit,
          sessionCount: customSessions,
          accessRules: ["Custom access"],
        });
        planId = planResponse?.planId || planResponse?.id || planResponse?.data?.planId || planResponse?.Data?.planId;
      }

      if (!planId) {
        throw new Error(loadingPlans ? "Plans are still loading. Please try again in a moment." : "Please select a subscription plan.");
      }

      const formData = new FormData();
      formData.append("firstName", form.firstName.trim());
      formData.append("lastName", form.lastName.trim());
      formData.append("email", form.email.trim());
      formData.append("phoneNumber", form.phone.trim());
      // ── send card code if provided ──────────────────────────────────────
      if (form.cardCode.trim()) {
        formData.append("cardCode", form.cardCode.trim());
      }
      // ───────────────────────────────────────────────────────────────────
      formData.append("gender", form.gender);
      formData.append("planId", planId);
      if (form.birthDate) {
        formData.append("dateOfBirth", form.birthDate);
      }
      if (form.medicalCertificate) {
        formData.append("medicalCertificate", form.medicalCertificate);
      }
      if (form.profilePicture) {
        formData.append("profilePicture", form.profilePicture);
      }

      const memberResponse = await api.createMember(formData);
      const memberId = memberResponse?.memberId || memberResponse?.Data?.memberId || memberResponse?.data?.memberId;

      if (!memberId) {
        throw new Error("Member was created, but no Member ID was returned from backend.");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (err) {
      console.error("Error adding member:", err);
      setError(err.message || "Failed to save member. Please check your network or backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end p-4">
      <div className={`bg-white w-[480px] h-[calc(100vh-32px)] shadow-2xl flex flex-col rounded-2xl transition-all duration-300 ${isClosing ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <div className="flex items-center gap-2">
            <User size={20} className="text-secondary-600" />
            <h2 className="text-secondary-700 font-semibold text-lg">Add Member</h2>
          </div>
          <button onClick={handleClose} className="text-secondary-400 hover:text-secondary-700 cursor-pointer transition-colors p-1.5 rounded-md hover:bg-secondary-100">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-secondary-200 px-6">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-normal border-b-2 transition-all cursor-pointer ${activeTab === tab ? "border-primary-600 text-primary-600" : "border-transparent text-secondary-400 hover:text-secondary-700"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "Information" && (
            <div className="flex flex-col gap-4">

              {/* Full Name */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Enter member's full name</label>
                <div className="flex gap-3">
                  <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 flex-1 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-50 transition-all h-10">
                    <User size={16} className="text-secondary-300 shrink-0" />
                    <input name="firstName" placeholder="First Name" value={form.firstName} onChange={handleChange}
                      className="w-full text-sm outline-none text-secondary-700 placeholder-secondary-300 bg-transparent" />
                  </div>
                  <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 flex-1 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-50 transition-all h-10">
                    <User size={16} className="text-secondary-300 shrink-0" />
                    <input name="lastName" placeholder="Last Name" value={form.lastName} onChange={handleChange}
                      className="w-full text-sm outline-none text-secondary-700 placeholder-secondary-300 bg-transparent" />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Enter member's Email</label>
                <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-50 transition-all">
                  <EnvelopeSimple size={16} className="text-secondary-300 shrink-0" />
                  <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange}
                    className="w-full text-sm outline-none text-secondary-700 placeholder-secondary-300 bg-transparent" />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Enter member's Phone Number</label>
                <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-50 transition-all">
                  <Phone size={16} className="text-secondary-300 shrink-0" />
                  <input name="phone" type="tel" placeholder="Phone Number" value={form.phone} onChange={handleChange}
                    className="w-full text-sm outline-none text-secondary-700 placeholder-secondary-300 bg-transparent" />
                </div>
              </div>

              {/* ── Card Code / NFC Reader ────────────────────────────────────────── */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">
                  Scan the member's Card Code
                </label>
                <div
                  className={`flex items-center border rounded-lg px-3 gap-2 h-10 transition-all
                    ${cardFocused
                      ? "border-primary-600 ring-2 ring-primary-50 bg-primary-50/30"
                      : form.cardCode
                      ? "border-green-400 bg-green-50/30"
                      : "border-secondary-200"}`}
                >
                  <CreditCard
                    size={16}
                    className={
                      cardFocused
                        ? "text-primary-600 shrink-0"
                        : form.cardCode
                        ? "text-green-500 shrink-0"
                        : "text-secondary-300 shrink-0"
                    }
                  />
                  <input
                    ref={cardInputRef}
                    name="cardCode"
                    placeholder={cardFocused ? "⚡ Ready — tap card on reader..." : "Card Code"}
                    value={form.cardCode}
                    onChange={handleChange}
                    onFocus={() => setCardFocused(true)}
                    onBlur={() => setCardFocused(false)}
                    className="w-full text-sm outline-none text-secondary-700 placeholder-secondary-400 bg-transparent"
                  />
                  {form.cardCode && (
                    <span className="text-xs text-green-600 font-semibold shrink-0 flex items-center gap-1">
                      ✓ Scanned
                    </span>
                  )}
                  {!form.cardCode && (
                    <button
                      type="button"
                      onClick={() => cardInputRef.current?.focus()}
                      className="text-xs text-primary-600 font-medium shrink-0 hover:text-primary-800 cursor-pointer whitespace-nowrap"
                    >
                      Click to scan
                    </button>
                  )}
                </div>

                {/* Status messages below the field */}
                {cardFocused && (
                  <p className="text-xs text-primary-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse inline-block" />
                    Place card on the NFC reader now...
                  </p>
                )}
                {form.cardCode && !cardFocused && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Card scanned: <span className="font-mono font-bold ml-1">{form.cardCode}</span>
                  </p>
                )}
              </div>
              {/* ─────────────────────────────────────────────────────────────────── */}

              {/* Gender */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Select member's Gender</label>
                <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                  <GenderIntersex size={16} className="text-secondary-300 shrink-0" />
                  <select name="gender" value={form.gender} onChange={handleChange}
                    className="w-full text-sm text-secondary-700 outline-none bg-transparent">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Select member's Birth date</label>
                <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                  <CalendarBlank size={16} className="text-secondary-300 shrink-0" />
                  <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange}
                    className="w-full text-sm text-secondary-700 outline-none bg-transparent" />
                </div>
              </div>

              {/* Medical Certificate */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Upload member's Medical Certificate</label>
                <div className="border-2 border-dashed border-secondary-200 rounded-xl p-6 text-center hover:border-primary-600 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center">
                      <span className="text-secondary-400 text-lg">☁</span>
                    </div>
                    <p className="text-xs text-secondary-500">choose a file or drag an drop it here.</p>
                    <p className="text-xs text-secondary-300">PDF, JPEG, Max up to 20MB</p>
                    {form.medicalCertificate && (
                      <p className="max-w-full truncate text-xs font-semibold text-primary-600">{form.medicalCertificate.name}</p>
                    )}
                    <label className="mt-1 cursor-pointer">
                      <span className="border border-secondary-300 text-secondary-600 text-xs px-4 py-1.5 rounded-lg hover:bg-secondary-100 transition">Browse File</span>
                      <input type="file" accept=".pdf,.jpeg,.jpg" onChange={handleFileChange("medicalCertificate")} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Profile Picture */}
              <div>
                <label className="text-xs text-secondary-500 font-normal mb-2 block">Upload member's Profile Picture</label>
                <div className="border-2 border-dashed border-secondary-200 rounded-xl p-6 text-center hover:border-primary-600 transition-colors cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center">
                      <span className="text-secondary-400 text-lg">☁</span>
                    </div>
                    <p className="text-xs text-secondary-500">choose an image or drag an drop it here.</p>
                    <p className="text-xs text-secondary-300">JPEG, PNG, Max up to 20MB</p>
                    {form.profilePicture && (
                      <p className="max-w-full truncate text-xs font-semibold text-primary-600">{form.profilePicture.name}</p>
                    )}
                    <label className="mt-1 cursor-pointer">
                      <span className="border border-secondary-300 text-secondary-600 text-xs px-4 py-1.5 rounded-lg hover:bg-secondary-100 transition">Browse Image</span>
                      <input type="file" accept=".jpeg,.jpg,.png" onChange={handleFileChange("profilePicture")} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === "Subscription" && (
            <div className="flex flex-col gap-4">

              {/* Plan Type Toggle */}
              <div className="flex gap-2">
                <button onClick={() => setUseSavedPlan(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${useSavedPlan ? 'border-primary-600 text-primary-600 bg-primary-50' : 'border-secondary-200 text-secondary-500'}`}>
                  <IdentificationCard size={16} /> Use Saved Plan
                </button>
                <button onClick={() => setUseSavedPlan(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all cursor-pointer ${!useSavedPlan ? 'border-primary-600 text-primary-600 bg-primary-50' : 'border-secondary-200 text-secondary-500'}`}>
                  <PencilSimple size={16} /> Create Custom Plan
                </button>
              </div>

              {useSavedPlan ? (
                (() => {
                  const selectedPlanObj = plans.find(p => (p.id || p.planId) === form.plan) || plans[0] || { name: "Loading plans...", price: 0, sessionCount: 0, duration: "N/A" };
                  const finalPrice = form.priceOverride || selectedPlanObj.price || 0;
                  return (
                    <>
                      {/* Select Plan */}
                      <div>
                        <label className="text-xs text-secondary-500 font-normal mb-2 block">Select member's Plan</label>
                        <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                          <span className="text-secondary-300 text-base">☆</span>
                          <select name="plan" value={form.plan} onChange={handleChange}
                            className="w-full text-sm text-secondary-700 outline-none bg-transparent">
                            {plans.map(p => (
                              <option key={p.id || p.planId} value={p.id || p.planId}>
                                {p.name} - ${p.price}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Plan Card */}
                      <div className="border border-secondary-200 rounded-xl p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-sm font-semibold text-secondary-700">{selectedPlanObj.name}</p>
                            <p className="text-xs text-secondary-400 mt-0.5">All-access gym membership plan.</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary-600">${selectedPlanObj.price}</p>
                            <p className="text-xs text-secondary-400">/ {selectedPlanObj.duration || "1 Month"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="flex items-center gap-1 text-xs bg-secondary-100 text-secondary-600 px-2.5 py-1 rounded-full">
                            {selectedPlanObj.sessionCount || selectedPlanObj.sessions || "∞"} Sessions
                          </span>
                          <span className="flex items-center gap-1 text-xs bg-secondary-100 text-secondary-600 px-2.5 py-1 rounded-full">⏰ Peak Hours Included</span>
                        </div>
                      </div>

                      {/* Start Date & Price Override */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-secondary-500 font-normal mb-2 block">Start Date</label>
                          <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                            <CalendarDots size={16} className="text-secondary-300 shrink-0" />
                            <input name="startDate" type="date" value={form.startDate} onChange={handleChange}
                              className="w-full text-sm text-secondary-700 outline-none bg-transparent" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-secondary-500 font-normal mb-2 block">Price Override ($)</label>
                          <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                            <MoneyWavy size={16} className="text-secondary-300 shrink-0" />
                            <input name="priceOverride" placeholder={selectedPlanObj.price} value={form.priceOverride} onChange={handleChange}
                              className="w-full text-sm text-secondary-700 outline-none bg-transparent" />
                          </div>
                        </div>
                      </div>

                      {/* Subscription Summary */}
                      <div className="border border-secondary-200 rounded-xl p-4 bg-secondary-50">
                        <p className="text-sm font-semibold text-secondary-700 mb-3">Subscription Summary</p>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                            <CalendarDots size={18} className="text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs text-secondary-400">Expiration Date</p>
                            <p className="text-sm font-semibold text-secondary-700">
                              {form.startDate ? new Date(new Date(form.startDate).setMonth(new Date(form.startDate).getMonth() + 1)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '1 Month from Start'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                            <ListNumbers size={18} className="text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs text-secondary-400">Session Allowance</p>
                            <p className="text-sm font-semibold text-secondary-700">{selectedPlanObj.sessionCount || selectedPlanObj.sessions || "Unlimited"}</p>
                          </div>
                        </div>
                        <div className="border-t border-secondary-200 mt-4 pt-4 flex items-center justify-between">
                          <p className="text-sm text-secondary-600">Due Today</p>
                          <p className="text-3xl font-bold text-secondary-700">${finalPrice}</p>
                        </div>
                        <p className="text-xs text-secondary-400 mt-1">First billing cycle starts on member activation.</p>
                      </div>
                    </>
                  );
                })()
              ) : (
                <>
                  <div>
                    <label className="text-xs text-secondary-500 font-normal mb-2 block">Plan Name</label>
                    <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                      <span className="text-secondary-300 text-sm">eg.</span>
                      <input
                        name="customPlanName"
                        placeholder="Personal Training Bundle"
                        value={form.customPlanName}
                        onChange={handleChange}
                        className="w-full text-sm text-secondary-700 outline-none bg-transparent placeholder-secondary-300" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-secondary-500 font-normal mb-2 block">Description</label>
                    <textarea
                      name="customPlanDescription"
                      placeholder="Provide details about sessions, inclusions, and benefits."
                      value={form.customPlanDescription}
                      onChange={handleChange}
                      rows={3}
                      className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-sm text-secondary-700 outline-none focus:border-primary-600 placeholder-secondary-300 resize-none transition-all" />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-secondary-500 font-normal mb-2 block">Price ($)</label>
                      <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                          <MoneyWavy size={16} className="text-secondary-300 shrink-0" />
                          <input
                            name="customPlanPrice"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="4500"
                            value={form.customPlanPrice}
                            onChange={handleChange}
                            className="w-full text-sm text-secondary-700 outline-none bg-transparent placeholder-secondary-300" />
                        </div>
                      </div>
                    <div className="flex-1">
                      <label className="text-xs text-secondary-500 font-normal mb-2 block">Session Count</label>
                      <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                          <ListNumbers size={16} className="text-secondary-300 shrink-0" />
                          <input
                            name="customSessionCount"
                            type="number"
                            min="0"
                            placeholder="13"
                            value={form.customSessionCount}
                            onChange={handleChange}
                            className="w-full text-sm text-secondary-700 outline-none bg-transparent placeholder-secondary-300" />
                        </div>
                      </div>
                    </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-secondary-500 font-normal mb-2 block">Start Date</label>
                      <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                            <CalendarDots size={16} className="text-secondary-300 shrink-0" />
                            <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="w-full text-sm text-secondary-700 outline-none bg-transparent" />
                          </div>
                        </div>
                    <div className="flex-1">
                      <label className="text-xs text-secondary-500 font-normal mb-2 block">Calculate End Date</label>
                        <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                          <CalendarDots size={16} className="text-secondary-300 shrink-0" />
                          <input type="date" value="" readOnly className="w-full text-sm text-secondary-700 outline-none bg-transparent" />
                        </div>
                      </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-secondary-500 font-normal mb-2 block">Duration Value</label>
                      <div className="flex items-center border border-secondary-200 rounded-lg px-3 gap-2 h-10 focus-within:border-primary-600 transition-all">
                          <HourglassSimple size={16} className="text-secondary-300 shrink-0" />
                          <input
                            name="customDurationValue"
                            type="number"
                            min="1"
                            placeholder="1"
                            value={form.customDurationValue}
                            onChange={handleChange}
                            className="w-full text-sm text-secondary-700 outline-none bg-transparent placeholder-secondary-300" />
                        </div>
                      </div>
                    <div className="flex-1">
                      <label className="text-xs text-secondary-500 font-normal mb-2 block">Unit</label>
                      <select
                        name="customDurationUnit"
                        value={form.customDurationUnit}
                        onChange={handleChange}
                        className="w-full border border-secondary-200 rounded-lg px-3 h-10 text-sm text-secondary-700 outline-none focus:border-primary-600 transition-all bg-transparent">
                        <option value="Months">Month(s)</option>
                        <option value="Days">Day(s)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-secondary-200 rounded-xl bg-secondary-50">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-secondary-200 flex items-center justify-center">
                        <span className="text-xs">🔒</span>
                      </div>
                      <div>
                        <p className="text-sm text-secondary-600">Access Rule 1</p>
                        <p className="text-xs text-secondary-400">Family access</p>
                      </div>
                    </div>
                    <button className="w-11 h-6 rounded-full bg-primary-600 relative transition-colors cursor-pointer shrink-0">
                      <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                  </div>

                  <div className="border border-secondary-200 rounded-xl p-4 bg-secondary-50">
                    <p className="text-sm font-semibold text-secondary-700 mb-3">Subscription Summary</p>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <CalendarDots size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="text-xs text-secondary-400">Expiration Date</p>
                        <p className="text-sm font-semibold text-secondary-700">May 20, 2025</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                        <ListNumbers size={18} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="text-xs text-secondary-400">Session Allowance</p>
                        <p className="text-sm font-semibold text-secondary-700">Unlimited</p>
                      </div>
                    </div>
                    <div className="border-t border-secondary-200 mt-4 pt-4 flex items-center justify-between">
                      <p className="text-sm text-secondary-600">Due Today</p>
                      <p className="text-3xl font-bold text-secondary-700">$9.99</p>
                    </div>
                    <p className="text-xs text-secondary-400 mt-1">Next billing cycle starts May 20, 2025.</p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 px-6 py-4 border-t border-secondary-200 bg-white rounded-b-2xl">
          {error && (
            <p className="text-rose-600 text-xs font-semibold text-center bg-rose-50 border border-rose-100 py-2 px-3 rounded-lg">
              ✕ {error}
            </p>
          )}
          {success && (
            <p className="text-emerald-600 text-xs font-semibold text-center bg-emerald-50 border border-emerald-100 py-2 px-3 rounded-lg">
              ✓ Member added successfully! Verification email is being dispatched...
            </p>
          )}
          <div className="flex items-center justify-end gap-3 w-full">
            <Button 
              onClick={handleClose} 
              disabled={loading}
              className="border border-secondary-300 text-secondary-600 text-sm px-6 py-2.5 rounded-xl hover:bg-secondary-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || success}
              className="bg-primary-600 text-white text-sm px-6 py-2.5 rounded-xl hover:bg-primary-900 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : success ? (
                "Success"
              ) : (
                activeTab === "Subscription" ? "Add Subscription" : "Add Member"
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

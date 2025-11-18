import React, { useState } from "react";
import SEO from "../components/SEO";

export default function ALIApply() {
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    companySize: "",
    email: "",
    phone: "",
    website: "",
    role: "",
    whyInterested: "",
    consent: false
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const validateField = (name, value) => {
    switch (name) {
      case "fullName":
        if (!value || value.trim().length < 2) {
          return "Please enter your full name";
        }
        break;
      case "email":
        if (!value) {
          return "Please enter your email address";
        }
        if (!value.includes("@") || !value.includes(".")) {
          return "Please enter a valid email address";
        }
        break;
      case "companyName":
        if (!value || value.trim().length < 2) {
          return "Please enter your company name";
        }
        break;
      case "companySize":
        if (!value) {
          return "Please select your company size range";
        }
        break;
      case "consent":
        if (!value) {
          return "Please review and accept our privacy policy to continue";
        }
        break;
      default:
        return "";
    }
    return "";
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ali/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      // Redirect to thanks page
      window.location.href = "/ali/thanks";
    } catch (error) {
      setSubmitError(error.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO pageKey="ali-apply" />
      <div className="min-h-screen py-16 md:py-24" style={{ backgroundColor: "#F8F7F3" }}>
        <div className="container max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 border-2" style={{ borderColor: "#E8E2D0" }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#1D1F21" }}>
              Apply to Join the ALI Pilot
            </h1>
            <p className="text-lg mb-8" style={{ color: "#78716C" }}>
              Help us build a tool that measures leadership that lasts.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="label" style={{ color: "#1D1F21" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`input ${errors.fullName ? "border-red-500" : ""}`}
                  style={{ 
                    borderColor: errors.fullName ? "#DC2626" : "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  This will be your primary contact name for the pilot program
                </p>
                {errors.fullName && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-500">⚠</span>
                    <p className="text-sm text-red-600">{errors.fullName}</p>
                  </div>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="label" style={{ color: "#1D1F21" }}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input ${errors.email ? "border-red-500" : ""}`}
                  style={{ 
                    borderColor: errors.email ? "#DC2626" : "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  We'll send your survey links and pilot updates here
                </p>
                {errors.email && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-500">⚠</span>
                    <p className="text-sm text-red-600">{errors.email}</p>
                  </div>
                )}
              </div>

              {/* Phone Number (Optional) */}
              <div>
                <label htmlFor="phone" className="label" style={{ color: "#1D1F21" }}>
                  Phone Number <span className="text-sm font-normal" style={{ color: "#78716C" }}>(Optional)</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  style={{ 
                    borderColor: "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  In case we need to reach you with time-sensitive information
                </p>
              </div>

              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="label" style={{ color: "#1D1F21" }}>
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className={`input ${errors.companyName ? "border-red-500" : ""}`}
                  style={{ 
                    borderColor: errors.companyName ? "#DC2626" : "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  The business name that will appear on your assessment dashboard
                </p>
                {errors.companyName && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-500">⚠</span>
                    <p className="text-sm text-red-600">{errors.companyName}</p>
                  </div>
                )}
              </div>

              {/* Company Size */}
              <div>
                <label htmlFor="companySize" className="label" style={{ color: "#1D1F21" }}>
                  Company Size
                </label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                  className={`input ${errors.companySize ? "border-red-500" : ""}`}
                  style={{ 
                    borderColor: errors.companySize ? "#DC2626" : "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                >
                  <option value="">Select a range</option>
                  <option value="10-20">10-20 employees</option>
                  <option value="21-50">21-50 employees</option>
                  <option value="51-100">51-100 employees</option>
                  <option value="101-250">101-250 employees</option>
                </select>
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  Select the range that best represents your total employee count
                </p>
                {errors.companySize && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-500">⚠</span>
                    <p className="text-sm text-red-600">{errors.companySize}</p>
                  </div>
                )}
              </div>

              {/* Company Website (Optional) */}
              <div>
                <label htmlFor="website" className="label" style={{ color: "#1D1F21" }}>
                  Company Website <span className="text-sm font-normal" style={{ color: "#78716C" }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="input"
                  style={{ 
                    borderColor: "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  Helps us understand your business context
                </p>
              </div>

              {/* Role / Position */}
              <div>
                <label htmlFor="role" className="label" style={{ color: "#1D1F21" }}>
                  Role / Position
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input"
                  style={{ 
                    borderColor: "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
              </div>

              {/* Why Interested (Optional) */}
              <div>
                <label htmlFor="whyInterested" className="label" style={{ color: "#1D1F21" }}>
                  Why are you interested in the Archetype Leadership Index? <span className="text-sm font-normal" style={{ color: "#78716C" }}>(Optional)</span>
                </label>
                <textarea
                  id="whyInterested"
                  name="whyInterested"
                  value={formData.whyInterested}
                  onChange={handleChange}
                  rows={4}
                  className="textarea"
                  style={{ 
                    borderColor: "#E8E2D0",
                    backgroundColor: "#F8F7F3"
                  }}
                />
                <p className="text-sm mt-1" style={{ color: "#78716C" }}>
                  Share what you hope to learn or improve through leadership measurement
                </p>
              </div>

              {/* Consent Checkbox */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={formData.consent}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 rounded border-2"
                    style={{ 
                      borderColor: errors.consent ? "#DC2626" : "#E8E2D0",
                      accentColor: "#6A1B1A"
                    }}
                  />
                  <span className="text-sm" style={{ color: "#1D1F21" }}>
                    I understand that all team assessments are anonymous, and individual responses will never be shared. I have reviewed the Privacy Policy.
                  </span>
                </label>
                {errors.consent && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-red-500">⚠</span>
                    <p className="text-sm text-red-600">{errors.consent}</p>
                  </div>
                )}
              </div>

              {/* Submit Error */}
              {submitError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-8 py-4 rounded-lg font-semibold text-white transition-all duration-300 disabled:opacity-50"
                style={{ backgroundColor: "#6A1B1A" }}
                onMouseEnter={(e) => !isSubmitting && (e.target.style.backgroundColor = "#7A2B2A")}
                onMouseLeave={(e) => !isSubmitting && (e.target.style.backgroundColor = "#6A1B1A")}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Submitting...
                  </span>
                ) : (
                  "Submit Application"
                )}
              </button>
            </form>

            {/* Privacy Note */}
            <div className="mt-8 pt-8 border-t-2" style={{ borderColor: "#E8E2D0" }}>
              <p className="text-sm text-center" style={{ color: "#78716C" }}>
                This form does not subscribe you to a list. Responses are kept private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


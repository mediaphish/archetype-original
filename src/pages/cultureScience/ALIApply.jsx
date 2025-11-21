import React, { useState } from "react";
import SEO from "../../components/SEO";

export default function ALIApply() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    companyName: "",
    companySize: "",
    role: "",
    industry: "",
    location: "",
    challenge: "",
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
          return "Please select your company size";
        }
        break;
      case "role":
        if (!value || value.trim().length < 2) {
          return "Please enter your role";
        }
        break;
      case "industry":
        if (!value || value.trim().length < 2) {
          return "Please enter your industry";
        }
        break;
      case "location":
        if (!value || value.trim().length < 2) {
          return "Please enter your location";
        }
        break;
      case "consent":
        if (!value) {
          return "Please accept the terms to continue";
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
      window.location.href = "/culture-science/ali/thanks";
    } catch (error) {
      setSubmitError(error.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEO pageKey="ali-apply" />
      <div className="min-h-screen bg-[#FAFAF9] py-16 sm:py-24 md:py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white border border-[#1A1A1A]/10 p-8 sm:p-10 md:p-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4 sm:mb-6 font-serif tracking-tight text-balance">
                Join the ALI Pilot
              </h1>
              
              <p className="text-base sm:text-lg leading-relaxed text-[#6B6B6B] mb-8 sm:mb-10 text-pretty">
                Let's talk about where you are, what you're trying to build, and whether ALI is the right fit.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Full Name <span className="text-[#C85A3C]">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.fullName ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-red-600 mt-2">{errors.fullName}</p>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label htmlFor="email" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Email Address <span className="text-[#C85A3C]">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.email ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-2">{errors.email}</p>
                  )}
                </div>

                {/* Company Name */}
                <div>
                  <label htmlFor="companyName" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Company Name <span className="text-[#C85A3C]">*</span>
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.companyName ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-600 mt-2">{errors.companyName}</p>
                  )}
                </div>

                {/* Company Size */}
                <div>
                  <label htmlFor="companySize" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Company Size <span className="text-[#C85A3C]">*</span>
                  </label>
                  <select
                    id="companySize"
                    name="companySize"
                    value={formData.companySize}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.companySize ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  >
                    <option value="">Select</option>
                    <option value="10-25">10-25 employees</option>
                    <option value="26-50">26-50 employees</option>
                    <option value="51-100">51-100 employees</option>
                    <option value="101-250">101-250 employees</option>
                  </select>
                  {errors.companySize && (
                    <p className="text-sm text-red-600 mt-2">{errors.companySize}</p>
                  )}
                </div>

                {/* Your Role */}
                <div>
                  <label htmlFor="role" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Your Role <span className="text-[#C85A3C]">*</span>
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    placeholder="e.g., Owner, CEO, Operations, HR"
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.role ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  />
                  {errors.role && (
                    <p className="text-sm text-red-600 mt-2">{errors.role}</p>
                  )}
                </div>

                {/* Industry */}
                <div>
                  <label htmlFor="industry" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Industry <span className="text-[#C85A3C]">*</span>
                  </label>
                  <input
                    type="text"
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.industry ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  />
                  {errors.industry && (
                    <p className="text-sm text-red-600 mt-2">{errors.industry}</p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Location <span className="text-[#C85A3C]">*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="City, State/Region, Country"
                    className={`w-full px-4 py-3 border-2 text-base text-[#1A1A1A] bg-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C85A3C] transition-colors ${
                      errors.location ? "border-red-500" : "border-[#1A1A1A]/10"
                    }`}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-600 mt-2">{errors.location}</p>
                  )}
                </div>

                {/* Challenge (Optional) */}
                <div>
                  <label htmlFor="challenge" className="block text-base font-medium text-[#1A1A1A] mb-2">
                    Challenge <span className="text-sm font-normal text-[#6B6B6B]">(Optional)</span>
                  </label>
                  <textarea
                    id="challenge"
                    name="challenge"
                    value={formData.challenge}
                    onChange={handleChange}
                    rows={4}
                    placeholder="What's the biggest leadership or culture challenge you're facing right now? (Optional)"
                    className="w-full px-4 py-3 border-2 border-[#1A1A1A]/10 text-base text-[#1A1A1A] bg-white placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C85A3C] transition-colors resize-none"
                  />
                </div>

                {/* Terms Checkbox */}
                <div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="consent"
                      checked={formData.consent}
                      onChange={handleChange}
                      className={`mt-1 w-5 h-5 border-2 ${
                        errors.consent ? "border-red-500" : "border-[#1A1A1A]/10"
                      } focus:outline-none focus:ring-2 focus:ring-[#C85A3C] focus:ring-offset-2`}
                      style={{ accentColor: "#C85A3C" }}
                    />
                    <span className="text-base text-[#1A1A1A]">
                      I'm interested in being part of the ALI pilot and understand this is an early-stage research project. <span className="text-[#C85A3C]">*</span>
                    </span>
                  </label>
                  {errors.consent && (
                    <p className="text-sm text-red-600 mt-2 ml-8">{errors.consent}</p>
                  )}
                </div>

                {/* Submit Error */}
                {submitError && (
                  <div className="bg-red-50 border-2 border-red-200 p-4">
                    <p className="text-sm text-red-600">{submitError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1A1A1A] text-white px-8 sm:px-10 py-4 sm:py-5 font-medium text-sm sm:text-base hover:bg-[#1A1A1A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

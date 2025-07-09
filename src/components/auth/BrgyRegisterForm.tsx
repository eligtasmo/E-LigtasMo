import React, { useState } from "react";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { MailIcon, EnvelopeIcon } from '../../icons';

const barangays = [
  "Bagumbayan", "Bambang", "Calzada", "Hagonoy", "Ibayo-Tipas", "Ligid-Tipas", "Lower Bicutan", "New Lower Bicutan", "Napindan", "Palingon", "San Miguel", "Santa Ana", "Tuktukan", "Ususan", "Wawa"
];
const cities = ["Taguig", "Binan", "San Pedro", "Santa Rosa", "Cabuyao", "Calamba", "Other"];
const province = "Laguna";

interface BrgyRegisterFormProps {
  onSuccess?: () => void;
  formClassName?: string;
}

const BrgyRegisterForm = ({ onSuccess, formClassName = "space-y-6" }: BrgyRegisterFormProps) => {
  const [form, setForm] = useState({
    barangay: "",
    city: "",
    province: "Laguna",
    fullName: "",
    username: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    // Map frontend fields to backend expected fields
    const payload = {
      username: form.username,
      password: form.password,
      full_name: form.fullName,
      brgy_name: form.barangay,
      city: form.city,
      province: form.province,
      email: form.email,
      contact_number: form.contact,
    };
    console.log("Registration payload:", payload);
    try {
      const response = await fetch("http://localhost/eligtasmo/api/register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      const data = await response.json();
      setLoading(false);
      if (data.success) {
        setSuccess(data.message);
        if (onSuccess) onSuccess();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setLoading(false);
      setError("Server error. Please try again later.");
    }
  };

  return (
    <>
      <form
        className={`w-full max-w-md mx-auto bg-white flex flex-col ${formClassName}`}
        onSubmit={handleSubmit}
        autoComplete="off"
      >
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
            Register Barangay
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            For Disaster Risk Management
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="w-1/2">
              <Label>
                Barangay <span className="text-error-500">*</span>
              </Label>
              <select
                name="barangay"
                value={form.barangay}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 text-gray-700 w-full text-base"
              >
                <option value="">Select Barangay</option>
                {barangays.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="w-1/2">
              <Label>
                City/Municipality <span className="text-error-500">*</span>
              </Label>
              <select
                name="city"
                value={form.city}
                onChange={handleChange}
                required
                className="border rounded px-3 py-2 text-gray-700 w-full text-base"
              >
                <option value="">Select City/Municipality</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label>Province</Label>
            <Input
              name="province"
              value={form.province}
              disabled
              className="bg-gray-100"
            />
          </div>
          <div>
            <Label>
              Full Name (Brgy Official) <span className="text-error-500">*</span>
            </Label>
            <Input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Full Name (Brgy Official)"
            />
          </div>
          <div>
            <Label>
              Username <span className="text-error-500">*</span>
            </Label>
            <Input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
            />
          </div>
          <div>
            <Label>
              Email <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <MailIcon className="w-5 h-5" />
              </span>
              <Input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="e.g. brgy@email.com"
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label>
              Contact Number <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <EnvelopeIcon className="w-5 h-5" />
              </span>
              <Input
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="e.g. 0917 123 4567"
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-1/2">
              <Label>
                Password <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
              />
            </div>
            <div className="w-1/2">
              <Label>
                Confirm Password <span className="text-error-500">*</span>
              </Label>
              <Input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm Password"
              />
            </div>
          </div>
          {error && <div className="text-error-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">{success}</div>}
          <Button className="w-full" size="sm" type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register Barangay"}
          </Button>
        </div>
      </form>
    </>
  );
};

export default BrgyRegisterForm; 
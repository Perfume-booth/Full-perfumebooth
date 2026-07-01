"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatedUser } from "@/components/ui/icons/AnimatedUser";
import { AnimatedMapPin } from "@/components/ui/icons/AnimatedMapPin";
import { AnimatedEdit2 } from "@/components/ui/icons/AnimatedEdit2";
import { 
  updateProfileAction, 
  addAddressAction, 
  updateAddressAction,
  deleteAddressAction, 
  setDefaultAddressAction 
} from "@/lib/actions/actions";
import { UserProfileAvatar } from "./AccountHero";

type Tab = "profile" | "addresses";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
  gender?: { value: string };
  tags?: string[];
  defaultAddress?: {
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country: string;
    phone?: string;
  };
  addresses?: { edges: { node: any }[] };
}

interface AccountClientProps {
  customer: Customer;
}

const NAV_TABS = [
  { id: "profile" as Tab, icon: AnimatedUser, label: "Personal Information" },
];

function AddressCard({ address, isDefault, onEdit, onRemove, onSetDefault, isPending }: any) {
  return (
    <div
      className="relative rounded-xl overflow-hidden transition-shadow hover:shadow-md"
      style={{
        background: isDefault ? "rgba(184,146,74,0.03)" : "var(--color-surface)",
        border: isDefault ? "1px solid rgba(184,146,74,0.3)" : "1px solid var(--color-border)",
        borderLeft: isDefault ? "4px solid var(--color-gold)" : "4px solid transparent",
      }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: isDefault ? "1px solid rgba(184,146,74,0.15)" : "1px solid var(--color-border)" }}>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ 
            background: isDefault ? "var(--color-gold)" : "var(--color-bg-subtle)", 
            color: isDefault ? "white" : "var(--color-text-muted)", 
            border: isDefault ? "none" : "1px solid var(--color-border)" 
          }}
        >
          {isDefault ? "Default" : "Other"}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdit(address.id)}
            className="text-[11px] font-bold uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-gold-dark)" }}
          >
            Edit
          </button>
          <button
            onClick={() => onRemove(address.id)}
            className="text-[11px] font-bold uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-sale)" }}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-1.5">
        <p className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
          {address.firstName} {address.lastName}
        </p>
        {address.phone && (
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{address.phone}</p>
        )}
        <div className="pt-1">
          <p className="text-sm leading-snug" style={{ color: "var(--color-text-secondary)" }}>
            {address.address1}
            {address.address2 && `, ${address.address2}`}
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {address.city}, {address.province} – {address.zip}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{address.country}</p>
        </div>
      </div>
      
      {!isDefault && onSetDefault && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          <button
            onClick={() => onSetDefault(address.id)}
            disabled={isPending}
            className="text-[11px] font-bold uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            Set as Default
          </button>
        </div>
      )}
    </div>
  );
}

export default function AccountClient({ customer }: AccountClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as Tab;
  const activeTab: Tab = (tabParam === "profile" || tabParam === "addresses") ? tabParam : "profile";

  const handleTabChange = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/account?${params.toString()}`, { scroll: false });
  };

  const [isPending, startTransition] = useTransition();

  // Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");
  const [selectedGender, setSelectedGender] = useState(() => {
    if (customer.tags?.includes("gender_men")) return "men";
    if (customer.tags?.includes("gender_women")) return "women";
    if (customer.tags?.includes("gender_others")) return "others";
    return customer.gender?.value || "";
  });

  useEffect(() => {
    setSelectedGender(() => {
      if (customer.tags?.includes("gender_men")) return "men";
      if (customer.tags?.includes("gender_women")) return "women";
      if (customer.tags?.includes("gender_others")) return "others";
      return customer.gender?.value || "";
    });
  }, [customer]);

  // Address Form State
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressMsg, setAddressMsg] = useState("");

  const addresses = customer.addresses?.edges.map((e) => e.node) || [];
  const allAddresses = customer.defaultAddress ? [customer.defaultAddress, ...addresses.filter(a => a.id !== customer.defaultAddress?.id)] : addresses;
  const editingAddress = editingAddressId ? allAddresses.find(a => a.id === editingAddressId) : null;


  async function handleProfileSubmit(formData: FormData) {
    setProfileMsg("");
    startTransition(async () => {
      const res = await updateProfileAction(null, formData);
      if (res.success) {
        setIsEditingProfile(false);
        router.refresh();
      } else {
        setProfileMsg(res.message);
      }
    });
  }

  async function handleAddressSubmit(formData: FormData) {
    setAddressMsg("");
    startTransition(async () => {
      let res;
      if (editingAddressId) {
        res = await updateAddressAction(null, formData);
      } else {
        res = await addAddressAction(null, formData);
      }

      if (res.success) {
        setIsAddingAddress(false);
        setEditingAddressId(null);
      } else {
        setAddressMsg(res.message);
      }
    });
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm("Are you sure you want to delete this address?")) return;
    startTransition(async () => {
      await deleteAddressAction(id);
    });
  }

  async function handleSetDefaultAddress(id: string) {
    startTransition(async () => {
      await setDefaultAddressAction(id);
    });
  }

  return (
    <div className="space-y-6">
      {/* ── Sub Tabs ── */}
      <div className="flex border-b border-[var(--color-border)] mb-2">
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className="px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all relative"
            style={{
              color: activeTab === tab.id ? "var(--color-gold-dark)" : "var(--color-text-muted)",
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[var(--color-gold)]" />
            )}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <div
          className="rounded-xl overflow-hidden animate-fade-in"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
        >
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <h2 className="font-semibold text-base flex items-center gap-2.5" style={{ color: "var(--color-text-primary)" }}>
              <AnimatedUser size={18} style={{ color: "var(--color-gold)" }} />
              Personal Information
            </h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all hover:opacity-80"
                style={{ border: "1.5px solid var(--color-gold)", color: "var(--color-gold-dark)", background: "rgba(184,146,74,0.05)" }}
              >
                <AnimatedEdit2 size={13} /> Edit
              </button>
            )}
          </div>

          {/* Avatar Banner Header */}
          <div className="px-6 py-6 flex flex-col sm:flex-row items-center gap-6 border-b border-[var(--color-border)] bg-[rgba(184,146,74,0.015)]">
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shadow-md select-none"
                style={{
                  border: "3.5px solid rgba(235,192,115,0.45)",
                  boxShadow: "0 0 0 5px rgba(184,146,74,0.1), 0 4px 20px rgba(184,146,74,0.2)",
                }}
              >
                <UserProfileAvatar
                  email={customer.email}
                  gender={selectedGender}
                  size={80}
                  firstName={customer.firstName}
                  lastName={customer.lastName}
                />
              </div>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="font-bold text-lg" style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-serif)" }}>
                {customer.firstName} {customer.lastName}
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
               &bull; {customer.email}
              </p>
              <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full" style={{ background: "var(--color-bg-subtle)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}>
                  Since {new Date(customer.createdAt).getFullYear()}
                </span>
              </div>
            </div>
          </div>

          {isEditingProfile ? (
            <form action={handleProfileSubmit} className="p-6 space-y-4">
              {profileMsg && <p className="text-red-500 text-sm mb-4">{profileMsg}</p>}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">First Name</label>
                  <input name="firstName" defaultValue={customer.firstName} required className="w-full px-4 py-2 border rounded-md outline-none focus:border-[var(--color-gold)]" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}/>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Last Name</label>
                  <input name="lastName" defaultValue={customer.lastName} required className="w-full px-4 py-2 border rounded-md outline-none focus:border-[var(--color-gold)]" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}/>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Email <span className="text-[9px]">(Read Only)</span></label>
                  <input disabled value={customer.email} className="w-full px-4 py-2 border rounded-md opacity-50 cursor-not-allowed" style={{ borderColor: "var(--color-border)", background: "var(--color-bg-subtle)" }}/>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Phone Number</label>
                  <input name="phone" defaultValue={customer.phone || ""} type="tel" className="w-full px-4 py-2 border rounded-md outline-none focus:border-[var(--color-gold)]" style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}/>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Gender</label>
                  <select 
                    name="gender" 
                    value={selectedGender} 
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="w-full px-4 py-2.5 border rounded-md outline-none focus:border-[var(--color-gold)] text-sm cursor-pointer" 
                    style={{ borderColor: "var(--color-border)", background: "var(--color-bg)", color: "var(--color-text-primary)" }}
                  >
                    <option value="">Select Gender</option>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="others">Others</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-[var(--color-border)]">
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsEditingProfile(false); 
                    setSelectedGender(() => {
                      if (customer.tags?.includes("gender_men")) return "men";
                      if (customer.tags?.includes("gender_women")) return "women";
                      if (customer.tags?.includes("gender_others")) return "others";
                      return customer.gender?.value || "";
                    });
                  }} 
                  disabled={isPending} 
                  className="px-5 py-2 rounded-full text-sm font-bold opacity-70 hover:opacity-100 transition-opacity"
                >
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="px-6 py-2 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90 flex items-center" style={{ background: "var(--color-gold-dark)" }}>
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { label: "First Name", value: customer.firstName },
                { label: "Last Name", value: customer.lastName },
                { label: "Email Address", value: customer.email },
                { label: "Phone Number", value: customer.phone || "Not provided" },
                { label: "Gender", value: selectedGender ? (selectedGender.charAt(0).toUpperCase() + selectedGender.slice(1)) : "Not specified" },
                { label: "Member Since", value: new Date(customer.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                    {label}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ADDRESSES TAB ── */}
      {activeTab === "addresses" && (
        <div className="space-y-4">

          {/* ── Section Header ── */}
          <div className="flex items-center justify-between">
            <h2
              className="flex items-center gap-2.5 text-base font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <AnimatedMapPin size={18} style={{ color: "var(--color-gold)" }} />
              Saved Addresses
            </h2>
            {!(isAddingAddress || editingAddressId) && (
              <button
                onClick={() => setIsAddingAddress(true)}
                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all hover:opacity-80"
                style={{
                  border: "1.5px solid var(--color-gold)",
                  color: "var(--color-gold-dark)",
                  background: "rgba(184,146,74,0.05)",
                }}
              >
                + Add New Address
              </button>
            )}
          </div>

          {addressMsg && <p className="text-red-500 text-sm">{addressMsg}</p>}

          {/* ── Add / Edit Form ── */}
          {(isAddingAddress || editingAddressId) ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
            >
              <div
                className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest"
                style={{ background: "var(--color-bg-subtle)", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
              >
                {editingAddressId ? "Edit Address" : "Add New Address"}
              </div>
              <form action={handleAddressSubmit} className="p-5 space-y-4">
                {editingAddressId && <input type="hidden" name="addressId" value={editingAddressId} />}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { name: "firstName", label: "First Name", required: true },
                    { name: "lastName", label: "Last Name", required: true },
                    { name: "phone", label: "Phone", required: true, colSpan: 2 },
                    { name: "address1", label: "Address Line 1", required: true, colSpan: 2 },
                    { name: "address2", label: "Address Line 2 (Optional)", required: false, colSpan: 2 },
                    { name: "city", label: "City", required: true },
                    { name: "province", label: "State / Province", required: true },
                    { name: "zip", label: "ZIP / Postal Code", required: true },
                    { name: "country", label: "Country", required: true, defaultValue: "India" },
                  ].map((field) => (
                    <div key={field.name} className={field.colSpan === 2 ? "sm:col-span-2" : ""}>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                        {field.label}
                      </label>
                      <input 
                        name={field.name} 
                        defaultValue={editingAddress ? (editingAddress as any)[field.name] : (field.defaultValue || "")} 
                        required={field.required} 
                        className="w-full px-4 py-2.5 border rounded-lg outline-none focus:border-[var(--color-gold)] text-sm" 
                        style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 justify-end pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <button type="button" onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }} disabled={isPending} className="px-5 py-2 rounded-lg text-sm font-bold opacity-70 hover:opacity-100 transition-opacity">Cancel</button>
                  <button type="submit" disabled={isPending} className="px-6 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))" }}>
                    {isPending ? "Saving..." : (editingAddressId ? "Save Changes" : "Add Address")}
                  </button>
                </div>
              </form>
            </div>

          ) : addresses.length === 0 && !customer.defaultAddress ? (
            /* ── Empty State ── */
            <div
              className="rounded-xl text-center py-16 flex flex-col items-center"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                style={{ background: "var(--color-bg-subtle)" }}
              >
                <AnimatedMapPin size={32} style={{ color: "var(--color-border-dark)" }} />
              </div>
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>No saved addresses yet</p>
              <p className="text-xs mb-6 max-w-xs" style={{ color: "var(--color-text-muted)" }}>
                Save a delivery address for faster, easier checkout
              </p>
              <button
                onClick={() => setIsAddingAddress(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 transition-opacity"
                style={{ background: "linear-gradient(135deg, var(--color-gold-dark), var(--color-gold))" }}
              >
                + Add Address
              </button>
            </div>

          ) : (
            /* ── Address Cards Grid ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Default Address Card */}
              {customer.defaultAddress && (
                <AddressCard 
                  address={customer.defaultAddress} 
                  isDefault={true} 
                  onEdit={setEditingAddressId} 
                  onRemove={handleDeleteAddress} 
                />
              )}

              {/* Other Address Cards */}
              {addresses
                .filter((a) => a.id !== customer.defaultAddress?.id)
                .map((addr: any) => (
                  <AddressCard 
                    key={addr.id}
                    address={addr} 
                    isDefault={false} 
                    onEdit={setEditingAddressId} 
                    onRemove={handleDeleteAddress}
                    onSetDefault={handleSetDefaultAddress}
                    isPending={isPending}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

